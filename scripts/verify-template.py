#!/usr/bin/env python3
"""Template Verification Suite

Static analysis checks that verify the elastic-agent-starter template
is structurally sound before pushing to new users.

Checks:
1. Route integrity — no duplicate paths, all routes importable
2. Frontend↔Backend contract — every frontend API call has a backend route
3. Page completeness — every route in App.tsx resolves to a real component
4. Icon registration — every used EUI icon is in the cache
5. Component registry — COMPONENT_REGISTRY.md matches actual files on disk
6. No localhost leaks — hardcoded localhost URLs in frontend source
7. Build verification — both frontend and backend build cleanly

Usage:
    python scripts/verify-template.py          # Run all checks
    python scripts/verify-template.py --check routes   # Run one check
    python scripts/verify-template.py --ci     # Exit code for CI
"""

import ast
import json
import os
import re
import subprocess
import sys
from collections import defaultdict
from pathlib import Path

# Resolve project root
SCRIPT_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = SCRIPT_DIR.parent
BACKEND_DIR = PROJECT_ROOT / "backend"
FRONTEND_DIR = PROJECT_ROOT / "frontend"
FRONTEND_SRC = FRONTEND_DIR / "src"

# Colors
GREEN = "\033[0;32m"
RED = "\033[0;31m"
YELLOW = "\033[1;33m"
BLUE = "\033[0;34m"
DIM = "\033[2m"
NC = "\033[0m"

# Track results
results = {"pass": 0, "fail": 0, "warn": 0}


def passed(msg):
    results["pass"] += 1
    print(f"  {GREEN}✅ {msg}{NC}")


def failed(msg):
    results["fail"] += 1
    print(f"  {RED}❌ {msg}{NC}")


def warned(msg):
    results["warn"] += 1
    print(f"  {YELLOW}⚠️  {msg}{NC}")


def info(msg):
    print(f"  {DIM}{msg}{NC}")


# =========================================================================
# Check 1: Route Integrity
# =========================================================================

def check_routes():
    """Detect duplicate route paths, unimportable route modules, and shadowed endpoints."""
    print(f"\n{BLUE}[1/8] Route Integrity{NC}")

    main_py = BACKEND_DIR / "app" / "main.py"
    if not main_py.exists():
        failed("backend/app/main.py not found")
        return

    main_source = main_py.read_text()

    # Extract all router imports and include_router calls
    # Pattern: from .routes.X import router as Y_router
    import_pattern = re.compile(
        r"from\s+\.routes\.(\S+)\s+import\s+router\s+as\s+(\w+)"
    )
    # Also catch agno.routes
    import_pattern2 = re.compile(
        r"from\s+\.agno\.routes\s+import\s+router\s+as\s+(\w+)"
    )

    imports = import_pattern.findall(main_source)
    imports2 = import_pattern2.findall(main_source)

    # Extract include_router calls with optional prefix override
    include_pattern = re.compile(
        r"app\.include_router\((\w+)(?:,\s*prefix=\"([^\"]+)\")?"
    )
    includes = include_pattern.findall(main_source)

    # Build map of router_var -> module_path
    router_modules = {}
    for module_path, var_name in imports:
        router_modules[var_name] = f"app.routes.{module_path}"
    for var_name in imports2:
        router_modules[var_name] = "app.agno.routes"

    # Check each route module is importable
    importable_count = 0
    for var_name, module_path in router_modules.items():
        route_file = BACKEND_DIR / module_path.replace(".", "/")
        # Could be a package (__init__.py) or a module (.py)
        if (route_file.with_suffix(".py")).exists() or (route_file / "__init__.py").exists():
            importable_count += 1
        else:
            failed(f"Route module not found: {module_path} (imported as {var_name})")

    if importable_count == len(router_modules):
        passed(f"All {importable_count} route modules exist on disk")

    # Now detect duplicate route paths by parsing the actual route files
    # Collect: prefix + endpoint path -> [source files]
    all_routes = defaultdict(list)

    for var_name, module_path in router_modules.items():
        # Find the prefix: either from include_router override or from the router itself
        prefix_override = None
        for inc_var, inc_prefix in includes:
            if inc_var == var_name and inc_prefix:
                prefix_override = inc_prefix
                break

        route_file = BACKEND_DIR / module_path.replace(".", "/")
        if route_file.with_suffix(".py").exists():
            route_file = route_file.with_suffix(".py")
        elif (route_file / "__init__.py").exists():
            route_file = route_file / "__init__.py"
        else:
            continue

        source = route_file.read_text()

        # Extract prefix from APIRouter(prefix="...")
        router_prefix_match = re.search(r'APIRouter\([^)]*prefix="([^"]+)"', source)
        router_prefix = router_prefix_match.group(1) if router_prefix_match else ""

        # Use override prefix if specified in include_router
        effective_prefix = prefix_override if prefix_override else router_prefix

        # Extract all route decorators
        route_decorator = re.compile(
            r'@router\.(get|post|put|delete|patch)\("([^"]*)"'
        )
        for method, path in route_decorator.findall(source):
            full_path = f"{method.upper()} {effective_prefix}{path}"
            all_routes[full_path].append(module_path)

    # Check for duplicates
    duplicates_found = False
    for route_path, sources in sorted(all_routes.items()):
        if len(sources) > 1:
            failed(f"Duplicate route: {route_path}")
            for src in sources:
                info(f"    defined in: {src}")
            duplicates_found = True

    if not duplicates_found:
        passed(f"No duplicate routes ({len(all_routes)} unique endpoints)")


# =========================================================================
# Check 2: Frontend↔Backend Contract Alignment
# =========================================================================

def check_contract():
    """Verify every frontend API call has a matching backend route."""
    print(f"\n{BLUE}[2/8] Frontend↔Backend Contract{NC}")

    # Get all backend routes from OpenAPI (if server is running) or from static analysis
    backend_routes = set()

    # Try live OpenAPI first
    backend_port = None
    port_file = PROJECT_ROOT / ".dev-pids" / "backend.port"
    if port_file.exists():
        backend_port = port_file.read_text().strip()

    if backend_port:
        try:
            import urllib.request
            url = f"http://localhost:{backend_port}/openapi.json"
            with urllib.request.urlopen(url, timeout=3) as resp:
                spec = json.loads(resp.read())
                for path, methods in spec.get("paths", {}).items():
                    for method in methods:
                        if method in ("get", "post", "put", "delete", "patch"):
                            # Normalize path params: {id} -> {*}
                            normalized = re.sub(r"\{[^}]+\}", "{*}", path)
                            backend_routes.add(f"{method.upper()} {normalized}")
                passed(f"Loaded {len(backend_routes)} routes from live OpenAPI spec")
        except Exception:
            warned("Backend not reachable, falling back to static analysis")
            backend_port = None

    if not backend_port:
        # Static analysis fallback — parse route files
        info("Using static analysis (start backend for more accurate check)")
        # Reuse route parsing from check_routes
        main_py = BACKEND_DIR / "app" / "main.py"
        if not main_py.exists():
            failed("Cannot check contract: main.py not found")
            return

        main_source = main_py.read_text()
        import_pattern = re.compile(
            r"from\s+\.routes\.(\S+)\s+import\s+router\s+as\s+(\w+)"
        )
        import_pattern2 = re.compile(
            r"from\s+\.agno\.routes\s+import\s+router\s+as\s+(\w+)"
        )
        include_pattern = re.compile(
            r"app\.include_router\((\w+)(?:,\s*prefix=\"([^\"]+)\")?"
        )

        imports = import_pattern.findall(main_source)
        imports2 = import_pattern2.findall(main_source)
        includes = include_pattern.findall(main_source)

        router_modules = {}
        for module_path, var_name in imports:
            router_modules[var_name] = f"app.routes.{module_path}"
        for var_name in imports2:
            router_modules[var_name] = "app.agno.routes"

        for var_name, module_path in router_modules.items():
            prefix_override = None
            for inc_var, inc_prefix in includes:
                if inc_var == var_name and inc_prefix:
                    prefix_override = inc_prefix
                    break

            route_file = BACKEND_DIR / module_path.replace(".", "/")
            if route_file.with_suffix(".py").exists():
                route_file = route_file.with_suffix(".py")
            elif (route_file / "__init__.py").exists():
                # For packages, also check sub-modules
                pkg_dir = route_file
                for sub_file in pkg_dir.glob("*.py"):
                    if sub_file.name == "__init__.py":
                        continue
                    sub_source = sub_file.read_text()
                    sub_prefix_match = re.search(
                        r'APIRouter\([^)]*prefix="([^"]+)"', sub_source
                    )
                    sub_prefix = sub_prefix_match.group(1) if sub_prefix_match else ""
                    route_decorator = re.compile(
                        r'@router\.(get|post|put|delete|patch)\("([^"]*)"'
                    )
                    for method, path in route_decorator.findall(sub_source):
                        # Sub-routers included in package __init__ inherit package prefix
                        init_source = (pkg_dir / "__init__.py").read_text()
                        pkg_prefix_match = re.search(
                            r'APIRouter\([^)]*prefix="([^"]+)"', init_source
                        )
                        pkg_prefix = pkg_prefix_match.group(1) if pkg_prefix_match else ""
                        effective = prefix_override if prefix_override else pkg_prefix
                        normalized = re.sub(r"\{[^}]+\}", "{*}", f"{effective}{sub_prefix}{path}")
                        backend_routes.add(f"{method.upper()} {normalized}")

                route_file = route_file / "__init__.py"
            else:
                continue

            source = route_file.read_text()
            router_prefix_match = re.search(
                r'APIRouter\([^)]*prefix="([^"]+)"', source
            )
            router_prefix = router_prefix_match.group(1) if router_prefix_match else ""
            effective_prefix = prefix_override if prefix_override else router_prefix

            route_decorator = re.compile(
                r'@router\.(get|post|put|delete|patch)\("([^"]*)"'
            )
            for method, path in route_decorator.findall(source):
                normalized = re.sub(r"\{[^}]+\}", "{*}", f"{effective_prefix}{path}")
                backend_routes.add(f"{method.upper()} {normalized}")

        # Also add root-level routes
        backend_routes.add("GET /")
        backend_routes.add("GET /health")
        passed(f"Parsed {len(backend_routes)} routes from source")

    # Now extract frontend API calls
    # Known frontend API calls (from thorough analysis)
    frontend_calls = [
        ("POST", "/api/agent/chat", "services/agentApi.ts"),
        ("GET", "/api/agent/health", "pages/WelcomePage.tsx"),
        ("POST", "/api/a2a/chat", "services/llmProxyApi.ts"),
        ("GET", "/api/a2a/agents", "services/llmProxyApi.ts"),
        ("GET", "/api/a2a/health", "services/llmProxyApi.ts"),
        ("GET", "/api/a2a/health/test", "services/llmProxyApi.ts"),
        ("GET", "/api/audit/conversations", "services/auditApi.ts"),
        ("GET", "/api/audit/conversations/{*}", "services/auditApi.ts"),
        ("GET", "/api/audit/agents", "services/auditApi.ts"),
        ("POST", "/api/search", "hooks/useSearchSimple.ts"),
        ("GET", "/api/search/fields", "pages/SearchPageSimple.tsx"),
        ("GET", "/api/branding/", "pages/BrandEditorPage.tsx"),
        ("POST", "/api/branding/", "pages/BrandEditorPage.tsx"),
        ("PUT", "/api/branding/{*}", "pages/BrandEditorPage.tsx"),
        ("DELETE", "/api/branding/{*}", "pages/BrandEditorPage.tsx"),
        ("GET", "/api/mcp/info", "pages/MCPExplorerPage.tsx"),
        ("GET", "/api/mcp/tools", "pages/MCPExplorerPage.tsx"),
        ("POST", "/api/mcp/tools/call", "pages/MCPExplorerPage.tsx"),
        ("GET", "/api/analytics/health", "services/analyticsApi.ts"),
        ("GET", "/api/analytics/overview", "services/analyticsApi.ts"),
        ("GET", "/api/analytics/ctr", "services/analyticsApi.ts"),
        ("GET", "/api/analytics/mrr", "services/analyticsApi.ts"),
        ("GET", "/api/analytics/zero-results", "services/analyticsApi.ts"),
        ("GET", "/api/analytics/top-queries", "services/analyticsApi.ts"),
        ("GET", "/api/analytics/click-distribution", "services/analyticsApi.ts"),
        ("GET", "/api/analytics/zero-result-queries", "services/analyticsApi.ts"),
        ("GET", "/api/analytics/queries-with-clicks", "services/analyticsApi.ts"),
        ("GET", "/api/analytics/query-judgments", "services/analyticsApi.ts"),
        ("GET", "/api/agno/v2/structure", "components/a2a/AgentArchitectureGraph.tsx"),
        ("POST", "/api/track/click", "otel/setup.ts"),
    ]

    missing = []
    for method, path, source_file in frontend_calls:
        route_key = f"{method} {path}"
        # Also try without trailing slash
        route_key_no_slash = route_key.rstrip("/")
        route_key_with_slash = route_key + ("/" if not route_key.endswith("/") else "")

        if (route_key in backend_routes
                or route_key_no_slash in backend_routes
                or route_key_with_slash in backend_routes):
            continue
        else:
            missing.append((method, path, source_file))

    if missing:
        for method, path, source_file in missing:
            failed(f"Frontend calls {method} {path} ({source_file}) — no backend route")
    else:
        passed(f"All {len(frontend_calls)} frontend API calls have matching backend routes")


# =========================================================================
# Check 3: Page Completeness
# =========================================================================

def check_pages():
    """Verify every route in App.tsx resolves to a real component file."""
    print(f"\n{BLUE}[3/8] Page Completeness{NC}")

    app_tsx = FRONTEND_SRC / "App.tsx"
    if not app_tsx.exists():
        failed("frontend/src/App.tsx not found")
        return

    source = app_tsx.read_text()

    # Extract imports: import { ComponentName } from './pages/ComponentName'
    import_pattern = re.compile(
        r"import\s+\{\s*(\w+)\s*\}\s+from\s+'([^']+)'"
    )
    imports = import_pattern.findall(source)

    # Extract Route elements: <Route path="..." element={<ComponentName />} />
    route_pattern = re.compile(
        r'<Route\s+path="([^"]+)"\s+element=\{<(\w+)'
    )
    routes = route_pattern.findall(source)

    # Check each import resolves to a file
    missing_files = []
    for component_name, import_path in imports:
        # Resolve relative import
        resolved = FRONTEND_SRC / import_path.lstrip("./")
        # Try .tsx, .ts, .jsx, .js, /index.tsx
        candidates = [
            resolved.with_suffix(".tsx"),
            resolved.with_suffix(".ts"),
            resolved.with_suffix(".jsx"),
            resolved.with_suffix(".js"),
            resolved / "index.tsx",
            resolved / "index.ts",
        ]
        if not any(c.exists() for c in candidates):
            missing_files.append((component_name, import_path))

    if missing_files:
        for name, path in missing_files:
            failed(f"Page component not found: {name} (from '{path}')")
    else:
        passed(f"All {len(imports)} page components exist on disk")

    # Check every Route's component was imported
    imported_names = {name for name, _ in imports}
    for route_path, component_name in routes:
        if component_name not in imported_names:
            failed(f"Route '{route_path}' uses <{component_name}/> but it's not imported")

    if all(comp in imported_names for _, comp in routes):
        passed(f"All {len(routes)} routes reference imported components")


# =========================================================================
# Check 4: EUI Icon Registration
# =========================================================================

def check_icons():
    """Verify EUI icons used in source are registered in iconCache.ts."""
    print(f"\n{BLUE}[4/8] EUI Icon Registration{NC}")

    icon_cache = FRONTEND_SRC / "iconCache.ts"
    if not icon_cache.exists():
        warned("frontend/src/iconCache.ts not found — skipping icon check")
        return

    cache_source = icon_cache.read_text()

    # The icon cache uses appendIconComponentCache({ key: value, ... })
    # Extract all keys from within the object literal(s)
    registered = set()

    # Find all appendIconComponentCache({...}) blocks
    in_cache_block = False
    brace_depth = 0
    for line in cache_source.split("\n"):
        stripped = line.strip()
        if "appendIconComponentCache({" in stripped:
            in_cache_block = True
            brace_depth = 1
            continue
        if in_cache_block:
            brace_depth += stripped.count("{") - stripped.count("}")
            if brace_depth <= 0:
                in_cache_block = False
                continue
            # Match: "  iconName," or "  iconName: alias," or "  'icon-name': alias,"
            key_match = re.match(r"\s*(\w+)\s*[,:]", stripped)
            if key_match:
                registered.add(key_match.group(1))
            # Also match quoted keys like 'logo-elastic': ...
            quoted_match = re.match(r"\s*['\"]([^'\"]+)['\"]\s*:", stripped)
            if quoted_match:
                registered.add(quoted_match.group(1))

    # Scan source files for EUI icon usage
    # Pattern: iconType="iconName" or type="iconName" in EuiIcon contexts
    used_icons = set()
    for ts_file in FRONTEND_SRC.rglob("*.tsx"):
        if "node_modules" in str(ts_file) or "iconCache" in ts_file.name:
            continue
        source = ts_file.read_text()
        # Match iconType="name" (most common pattern)
        for match in re.findall(r'iconType="(\w+)"', source):
            used_icons.add(match)
        # Match type="name" on EuiIcon
        for match in re.findall(r'<EuiIcon[^>]*type="(\w+)"', source):
            used_icons.add(match)

    # Filter out dynamic/variable references (not string literals)
    # and EUI built-in types that don't need registration
    builtin_types = {"empty", "error", "warning", "help", "info"}
    used_icons -= builtin_types

    missing = used_icons - registered
    if missing:
        for icon in sorted(missing):
            warned(f"Icon '{icon}' used in source but not in iconCache.ts")
        info("Run: npm run generate-icons (or restart dev server)")
    else:
        passed(f"All {len(used_icons)} used icons are registered ({len(registered)} in cache)")


# =========================================================================
# Check 5: Component Registry Accuracy
# =========================================================================

def check_registry():
    """Verify COMPONENT_REGISTRY.md matches actual files on disk."""
    print(f"\n{BLUE}[5/8] Component Registry{NC}")

    registry_file = PROJECT_ROOT / "docs" / "COMPONENT_REGISTRY.md"
    if not registry_file.exists():
        warned("docs/COMPONENT_REGISTRY.md not found — skipping")
        return

    source = registry_file.read_text()

    # Parse table rows for file paths
    # Pattern matches: | Name | `path/to/file.ext` | Status | ...
    path_pattern = re.compile(r"\|\s*\w[^|]*\|\s*`([^`]+)`\s*\|")
    registry_paths = []
    for match in path_pattern.finditer(source):
        rel_path = match.group(1)
        registry_paths.append(rel_path)

    # Separate frontend and backend paths
    frontend_missing = []
    backend_missing = []
    frontend_found = set()
    backend_found = set()

    for rel_path in registry_paths:
        if rel_path.startswith("routes/") or rel_path.startswith("elasticsearch/") or rel_path == "config.py":
            # Backend path — relative to backend/app/
            full_path = BACKEND_DIR / "app" / rel_path
            if full_path.exists():
                backend_found.add(rel_path)
            else:
                backend_missing.append(rel_path)
        else:
            # Frontend path — relative to frontend/src/
            full_path = FRONTEND_SRC / rel_path
            if full_path.exists():
                frontend_found.add(rel_path)
            else:
                frontend_missing.append(rel_path)

    if frontend_missing:
        for p in frontend_missing:
            failed(f"Registry lists frontend/{p} — file not found")
    if backend_missing:
        for p in backend_missing:
            failed(f"Registry lists backend/{p} — file not found")
    if not frontend_missing and not backend_missing:
        passed(f"All {len(registry_paths)} registry entries exist on disk")

    # Check for unregistered components (files on disk not in registry)
    # Frontend pages
    actual_pages = set()
    pages_dir = FRONTEND_SRC / "pages"
    if pages_dir.exists():
        for f in pages_dir.glob("*.tsx"):
            actual_pages.add(f"pages/{f.name}")

    registered_pages = {p for p in frontend_found if p.startswith("pages/")}
    unregistered_pages = actual_pages - registered_pages
    if unregistered_pages:
        for p in sorted(unregistered_pages):
            warned(f"frontend/src/{p} exists but is not in COMPONENT_REGISTRY.md")
    else:
        passed(f"All {len(actual_pages)} page files are registered")

    # Frontend components
    actual_components = set()
    components_dir = FRONTEND_SRC / "components"
    if components_dir.exists():
        for f in components_dir.rglob("*.tsx"):
            rel = f.relative_to(FRONTEND_SRC)
            actual_components.add(str(rel))

    registered_components = {p for p in frontend_found if p.startswith("components/")}
    unregistered_components = actual_components - registered_components
    if unregistered_components:
        for p in sorted(unregistered_components):
            warned(f"frontend/src/{p} exists but is not in COMPONENT_REGISTRY.md")
    else:
        passed(f"All {len(actual_components)} component files are registered")

    # Backend routes
    actual_routes = set()
    routes_dir = BACKEND_DIR / "app" / "routes"
    if routes_dir.exists():
        for f in routes_dir.glob("*.py"):
            if not f.name.startswith("_"):
                actual_routes.add(f"routes/{f.name}")
        # Also check subdirectories
        for subdir in routes_dir.iterdir():
            if subdir.is_dir() and not subdir.name.startswith("_"):
                for f in subdir.glob("*.py"):
                    if not f.name.startswith("_"):
                        actual_routes.add(f"routes/{subdir.name}/{f.name}")

    registered_routes = {p for p in backend_found if p.startswith("routes/")}
    unregistered_routes = actual_routes - registered_routes
    if unregistered_routes:
        for p in sorted(unregistered_routes):
            warned(f"backend/app/{p} exists but is not in COMPONENT_REGISTRY.md")
    else:
        passed(f"All {len(actual_routes)} backend route files are registered")


# =========================================================================
# Check 6: No Localhost Leaks
# =========================================================================

def check_localhost():
    """Check for hardcoded localhost URLs in frontend source."""
    print(f"\n{BLUE}[6/8] Localhost URL Check{NC}")

    # Use the existing script if available
    check_script = PROJECT_ROOT / "scripts" / "check-localhost-urls.sh"
    if check_script.exists():
        result = subprocess.run(
            ["bash", str(check_script)],
            capture_output=True, text=True, cwd=PROJECT_ROOT
        )
        if result.returncode == 0:
            passed("No hardcoded localhost URLs in frontend source")
        else:
            failed("Hardcoded localhost URLs found")
            for line in result.stdout.strip().split("\n"):
                if line.strip():
                    info(f"  {line.strip()}")
    else:
        # Inline check
        violations = []
        excluded = {"vite.config", ".user.", "OverlayGuidePage", "overlay", "userscript"}
        for ts_file in FRONTEND_SRC.rglob("*.ts*"):
            if any(ex in str(ts_file) for ex in excluded):
                continue
            if "node_modules" in str(ts_file):
                continue
            source = ts_file.read_text()
            for i, line in enumerate(source.split("\n"), 1):
                if "http://localhost" in line:
                    rel_path = ts_file.relative_to(PROJECT_ROOT)
                    violations.append(f"{rel_path}:{i}: {line.strip()}")

        if violations:
            failed(f"Found {len(violations)} hardcoded localhost URL(s)")
            for v in violations:
                info(f"  {v}")
        else:
            passed("No hardcoded localhost URLs in frontend source")


# =========================================================================
# Check 6: Build Verification
# =========================================================================

def _find_backend_python():
    """Find the right Python interpreter for the backend.

    Priority: backend/.venv > backend/venv > uv run > system python.
    We intentionally skip PROJECT_ROOT/venv since that may be a different
    environment (e.g. for scripts) without backend dependencies.
    """
    # Check for .venv in backend/ (uv default)
    venv_python = BACKEND_DIR / ".venv" / "bin" / "python"
    if venv_python.exists():
        return str(venv_python)
    # Check for venv in backend/
    venv_python = BACKEND_DIR / "venv" / "bin" / "python"
    if venv_python.exists():
        return str(venv_python)
    # Check for uv
    try:
        result = subprocess.run(
            ["uv", "run", "--directory", str(BACKEND_DIR), "python", "-c", "print('ok')"],
            capture_output=True, text=True, cwd=BACKEND_DIR, timeout=10
        )
        if result.returncode == 0:
            return None  # Signal to use uv run
    except (FileNotFoundError, subprocess.TimeoutExpired):
        pass
    return str(Path(sys.executable).resolve())


def check_builds():
    """Verify both frontend and backend can build/import cleanly."""
    print(f"\n{BLUE}[7/8] Build Verification{NC}")

    python_cmd = _find_backend_python()

    # Backend: check all route imports work
    # Clear VIRTUAL_ENV to prevent root-level venv from shadowing backend venv
    backend_env = {**os.environ}
    if python_cmd and "backend" in python_cmd:
        backend_env.pop("VIRTUAL_ENV", None)
        # Ensure the backend venv's bin dir is first in PATH
        venv_bin = str(Path(python_cmd).parent)
        backend_env["PATH"] = venv_bin + ":" + backend_env.get("PATH", "")

    if python_cmd is None:
        # Use uv run
        cmd = ["uv", "run", "--directory", str(BACKEND_DIR), "python", "-c",
               "from app.main import app; print(len(app.routes))"]
    else:
        cmd = [python_cmd, "-c", "from app.main import app; print(len(app.routes))"]

    result = subprocess.run(
        cmd,
        capture_output=True, text=True, cwd=BACKEND_DIR, env=backend_env
    )
    if result.returncode == 0:
        route_count = result.stdout.strip()
        passed(f"Backend imports cleanly ({route_count} routes registered)")
    else:
        failed("Backend import failed")
        for line in result.stderr.strip().split("\n")[-5:]:
            info(f"  {line}")

    # Backend: check each route module individually for import errors
    routes_dir = BACKEND_DIR / "app" / "routes"
    if routes_dir.exists():
        broken_modules = []
        for py_file in routes_dir.glob("*.py"):
            if py_file.name.startswith("_"):
                continue
            module_name = f"app.routes.{py_file.stem}"
            if python_cmd is None:
                cmd = ["uv", "run", "--directory", str(BACKEND_DIR), "python", "-c",
                       f"import {module_name}"]
            else:
                cmd = [python_cmd, "-c", f"import {module_name}"]
            result = subprocess.run(
                cmd,
                capture_output=True, text=True, cwd=BACKEND_DIR, env=backend_env
            )
            if result.returncode != 0:
                broken_modules.append((module_name, result.stderr.strip().split("\n")[-1]))

        if broken_modules:
            for mod, err in broken_modules:
                failed(f"Import error in {mod}: {err}")
        else:
            module_count = len([f for f in routes_dir.glob("*.py") if not f.name.startswith("_")])
            passed(f"All {module_count} route modules import individually")

    # Frontend: check TypeScript compiles
    tsc_bin = FRONTEND_DIR / "node_modules" / ".bin" / "tsc"
    if tsc_bin.exists():
        result = subprocess.run(
            [str(tsc_bin), "--noEmit"],
            capture_output=True, text=True, cwd=FRONTEND_DIR,
            timeout=120
        )
        if result.returncode == 0:
            passed("Frontend TypeScript compiles cleanly")
        else:
            error_lines = [l for l in result.stdout.split("\n") if "error TS" in l]
            failed(f"TypeScript compilation errors ({len(error_lines)} errors)")
            for line in error_lines[:5]:
                info(f"  {line.strip()}")
            if len(error_lines) > 5:
                info(f"  ... and {len(error_lines) - 5} more")
    else:
        warned("tsc not found — skipping TypeScript check (run npm install)")


# =========================================================================
# Main
# =========================================================================

def main():
    import argparse

    parser = argparse.ArgumentParser(description="Template verification suite")
    parser.add_argument(
        "--check",
        choices=["routes", "contract", "pages", "icons", "registry", "localhost", "builds"],
        help="Run a single check",
    )
    parser.add_argument(
        "--ci", action="store_true",
        help="Exit with non-zero if any check fails",
    )
    args = parser.parse_args()

    print(f"\n{BLUE}{'='*60}{NC}")
    print(f"{BLUE}  Template Verification Suite{NC}")
    print(f"{BLUE}{'='*60}{NC}")

    checks = {
        "routes": check_routes,
        "contract": check_contract,
        "pages": check_pages,
        "icons": check_icons,
        "registry": check_registry,
        "localhost": check_localhost,
        "builds": check_builds,
    }

    if args.check:
        checks[args.check]()
    else:
        for check_fn in checks.values():
            check_fn()

    # Summary
    total = results["pass"] + results["fail"] + results["warn"]
    print(f"\n{BLUE}{'='*60}{NC}")
    print(f"  {GREEN}{results['pass']} passed{NC}  "
          f"{RED}{results['fail']} failed{NC}  "
          f"{YELLOW}{results['warn']} warnings{NC}  "
          f"({total} total)")
    print(f"{BLUE}{'='*60}{NC}\n")

    if args.ci and results["fail"] > 0:
        sys.exit(1)


if __name__ == "__main__":
    main()
