#!/usr/bin/env python3
"""
Interactive Setup Script for Elastic Demo Starter

Feature-driven setup that asks users what they want to configure.
Supports both interactive (TTY) and piped/scripted input modes.
"""

import os
import sys
import subprocess
import shutil
import json
import platform
import socket
import urllib.request
import urllib.error
from typing import Optional, Dict, List, Tuple
from dataclasses import dataclass
from enum import Enum


# =============================================================================
# Feature Definitions - Add new features here!
# =============================================================================

class Feature(Enum):
    """Available features that can be configured."""
    AGENT_BUILDER = "agent_builder"
    LLM_PROXY = "llm_proxy"
    # Future features - uncomment when ready:
    # ELASTICSEARCH = "elasticsearch"
    # OTEL = "otel"


@dataclass
class FeatureInfo:
    """Metadata about a feature."""
    id: Feature
    name: str
    description: str
    enables: List[str]  # What pages/functionality this enables
    env_vars: List[str]  # Environment variables this feature configures
    required: bool = False  # Is this required for basic functionality?


# Feature registry - add new features here
FEATURES: Dict[Feature, FeatureInfo] = {
    Feature.AGENT_BUILDER: FeatureInfo(
        id=Feature.AGENT_BUILDER,
        name="Agent Builder",
        description="Connect to Elastic Agent Builder for AI chat",
        enables=["Chat", "Branded Demo", "Audit", "MCP Explorer"],
        env_vars=["KIBANA_URL", "ELASTIC_API_KEY", "AGENT_ID"],
        required=False,  # Can still use branding without it
    ),
    Feature.LLM_PROXY: FeatureInfo(
        id=Feature.LLM_PROXY,
        name="LLM Proxy (A2A)",
        description="Connect to LLM proxy for multi-agent orchestration",
        enables=["A2A Multi-Agent Chat"],
        env_vars=["LLM_PROXY_URL", "LLM_PROXY_API_KEY", "LLM_PROXY_MODEL"],
        required=False,
    ),
    # Future features:
    # Feature.ELASTICSEARCH: FeatureInfo(
    #     id=Feature.ELASTICSEARCH,
    #     name="Elasticsearch Direct",
    #     description="Direct Elasticsearch connection for search/analytics",
    #     enables=["Search demos", "Analytics"],
    #     env_vars=["ELASTICSEARCH_URL", "ES_API_KEY"],
    #     required=False,
    # ),
    # Feature.OTEL: FeatureInfo(
    #     id=Feature.OTEL,
    #     name="OpenTelemetry",
    #     description="Send telemetry to Elastic APM/Observability",
    #     enables=["APM traces", "Metrics", "Logs"],
    #     env_vars=["OTEL_EXPORTER_OTLP_ENDPOINT", "OTEL_EXPORTER_OTLP_HEADERS"],
    #     required=False,
    # ),
}


# =============================================================================
# Input Handler - Fixes piped input sync issues
# =============================================================================

class InputHandler:
    """
    Handles input from both TTY (interactive) and piped (scripted) sources.
    """
    
    def __init__(self):
        self.is_tty = sys.stdin.isatty()
        self.piped_lines: List[str] = []
        self.line_index = 0
        
        if not self.is_tty:
            try:
                self.piped_lines = [line.rstrip('\n\r') for line in sys.stdin.readlines()]
            except Exception:
                self.piped_lines = []
    
    def get_input(self, prompt: str = "") -> str:
        """Get input, either from TTY or from pre-read piped lines."""
        if self.is_tty:
            return input(prompt)
        else:
            print(prompt, end="", flush=True)
            if self.line_index < len(self.piped_lines):
                line = self.piped_lines[self.line_index]
                self.line_index += 1
                print(line)
                return line
            else:
                print("[no more input]")
                return ""
    
    def has_remaining_input(self) -> bool:
        if self.is_tty:
            return True
        return self.line_index < len(self.piped_lines)


_input_handler: Optional[InputHandler] = None

def get_input_handler() -> InputHandler:
    global _input_handler
    if _input_handler is None:
        _input_handler = InputHandler()
    return _input_handler


# =============================================================================
# Colors and Printing
# =============================================================================

class Colors:
    HEADER = '\033[95m'
    BLUE = '\033[94m'
    CYAN = '\033[96m'
    GREEN = '\033[92m'
    WARNING = '\033[93m'
    FAIL = '\033[91m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'
    DIM = '\033[2m'

def print_header(text):
    print(f"{Colors.HEADER}{Colors.BOLD}{text}{Colors.ENDC}")

def print_success(text):
    print(f"{Colors.GREEN}✅ {text}{Colors.ENDC}")

def print_error(text):
    print(f"{Colors.FAIL}❌ {text}{Colors.ENDC}")

def print_warning(text):
    print(f"{Colors.WARNING}⚠️  {text}{Colors.ENDC}")

def print_info(text):
    print(f"{Colors.BLUE}ℹ️  {text}{Colors.ENDC}")

def print_step(step_num, text):
    print(f"\n{Colors.CYAN}{Colors.BOLD}[Step {step_num}] {text}{Colors.ENDC}")


# =============================================================================
# Input Helpers
# =============================================================================

def ask(question: str, default: Optional[str] = None, required: bool = True, secret: bool = False) -> str:
    """Ask a question and return the response."""
    handler = get_input_handler()
    suffix = f" [{default}]" if default else ""
    
    while True:
        response = handler.get_input(f"{Colors.BOLD}{question}{suffix}: {Colors.ENDC}").strip()
        if not response and default:
            return default
        if not response and required:
            if not handler.is_tty:
                if default:
                    return default
                print_error("This field is required but no input provided.")
                return ""
            print_error("This field is required.")
            continue
        return response


def ask_yes_no(question: str, default: str = "yes") -> bool:
    """Ask a yes/no question and return boolean."""
    handler = get_input_handler()
    suffix = "[Y/n]" if default.lower() == "yes" else "[y/N]"
    response = handler.get_input(f"{Colors.BOLD}{question} {suffix}: {Colors.ENDC}").strip().lower()
    if not response:
        return default.lower() == "yes"
    return response.startswith('y')


def ask_multi_select(options: List[Tuple[str, str, bool]], prompt: str) -> List[str]:
    """
    Ask user to select multiple options.
    options: List of (id, description, default_selected)
    Returns list of selected option ids.
    """
    handler = get_input_handler()
    
    print(f"\n{Colors.BOLD}{prompt}{Colors.ENDC}")
    print(f"{Colors.DIM}Enter numbers separated by commas, or 'all'/'none'{Colors.ENDC}\n")
    
    for i, (opt_id, description, default) in enumerate(options, 1):
        default_marker = f"{Colors.GREEN}*{Colors.ENDC}" if default else " "
        print(f"  {default_marker}{Colors.CYAN}{i}.{Colors.ENDC} {description}")
    
    print()
    
    # Build default selection string
    defaults = [str(i) for i, (_, _, selected) in enumerate(options, 1) if selected]
    default_str = ",".join(defaults) if defaults else "none"
    
    response = handler.get_input(f"{Colors.BOLD}Select [{default_str}]: {Colors.ENDC}").strip().lower()
    
    if not response:
        return [opt_id for opt_id, _, selected in options if selected]
    
    if response == "all":
        return [opt_id for opt_id, _, _ in options]
    
    if response == "none":
        return []
    
    try:
        indices = [int(x.strip()) for x in response.split(",")]
        return [options[i-1][0] for i in indices if 1 <= i <= len(options)]
    except (ValueError, IndexError):
        print_warning("Invalid selection, using defaults")
        return [opt_id for opt_id, _, selected in options if selected]


# =============================================================================
# System Utilities
# =============================================================================

def check_command(command: str) -> bool:
    """Check if a command exists in PATH."""
    return shutil.which(command) is not None


def is_port_available(port: int) -> bool:
    """Check if a port is available for use."""
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            s.settimeout(1)
            s.bind(('127.0.0.1', port))
            return True
    except (socket.error, OSError):
        return False


def find_available_port(start_port: int, max_attempts: int = 100) -> int:
    """Find an available port starting from start_port."""
    for offset in range(max_attempts):
        port = start_port + offset
        if is_port_available(port):
            return port
    raise RuntimeError(f"Could not find available port starting from {start_port}")


# =============================================================================
# OS Detection
# =============================================================================

class OSInfo:
    """Detects and stores OS information."""
    
    def __init__(self):
        self.system = platform.system().lower()
        self.machine = platform.machine().lower()
        self.distro = None
        self.pkg_manager = None
        
        if self.system == "darwin":
            self.pkg_manager = "brew" if check_command("brew") else None
        elif self.system == "linux":
            self._detect_linux_distro()
    
    def _detect_linux_distro(self):
        try:
            with open("/etc/os-release") as f:
                content = f.read()
                if "ubuntu" in content.lower() or "debian" in content.lower():
                    self.distro = "debian"
                    self.pkg_manager = "apt"
                elif "fedora" in content.lower() or "rhel" in content.lower():
                    self.distro = "redhat"
                    self.pkg_manager = "dnf" if check_command("dnf") else "yum"
                elif "arch" in content.lower():
                    self.distro = "arch"
                    self.pkg_manager = "pacman"
        except FileNotFoundError:
            pass
    
    @property
    def is_macos(self) -> bool:
        return self.system == "darwin"
    
    @property
    def is_linux(self) -> bool:
        return self.system == "linux"
    
    def __str__(self):
        if self.is_macos:
            return f"macOS ({self.machine})"
        elif self.is_linux:
            return f"Linux/{self.distro or 'unknown'} ({self.machine})"
        return "Unknown OS"


# =============================================================================
# Prerequisites
# =============================================================================

class Prerequisite:
    def __init__(self, name: str, check_cmd: str, required: bool = True, description: str = ""):
        self.name = name
        self.check_cmd = check_cmd
        self.required = required
        self.description = description
        self.install_cmds: Dict[str, List[str]] = {}
    
    def add_install_cmd(self, os_key: str, cmd: List[str]):
        self.install_cmds[os_key] = cmd
        return self
    
    def is_installed(self) -> bool:
        return check_command(self.check_cmd)
    
    def get_install_cmd(self, os_info: OSInfo) -> Optional[List[str]]:
        if os_info.pkg_manager and os_info.pkg_manager in self.install_cmds:
            return self.install_cmds[os_info.pkg_manager]
        if os_info.system in self.install_cmds:
            return self.install_cmds[os_info.system]
        return None


def get_prerequisites() -> List[Prerequisite]:
    """Define all prerequisites."""
    prereqs = []
    
    # Node.js
    node = Prerequisite("Node.js", "node", required=True, description="Required for frontend")
    node.add_install_cmd("brew", ["brew", "install", "node"])
    node.add_install_cmd("apt", ["sudo", "apt", "install", "-y", "nodejs", "npm"])
    node.add_install_cmd("dnf", ["sudo", "dnf", "install", "-y", "nodejs", "npm"])
    node.add_install_cmd("pacman", ["sudo", "pacman", "-S", "--noconfirm", "nodejs", "npm"])
    prereqs.append(node)
    
    # Yarn (optional)
    yarn = Prerequisite("Yarn", "yarn", required=False, description="Faster package manager")
    yarn.add_install_cmd("brew", ["brew", "install", "yarn"])
    yarn.add_install_cmd("apt", ["sudo", "npm", "install", "-g", "yarn"])
    prereqs.append(yarn)
    
    return prereqs


def install_prerequisite(prereq: Prerequisite, os_info: OSInfo) -> bool:
    """Install a single prerequisite."""
    cmd = prereq.get_install_cmd(os_info)
    if not cmd:
        print_warning(f"No automatic installation available for {prereq.name} on {os_info}")
        return False
    
    print(f"   Installing {prereq.name}...")
    print(f"   {Colors.DIM}$ {' '.join(cmd)}{Colors.ENDC}")
    
    try:
        # stdin=DEVNULL prevents subprocess from stealing piped input
        subprocess.run(cmd, check=True, stdin=subprocess.DEVNULL)
        print_success(f"{prereq.name} installed!")
        return True
    except subprocess.CalledProcessError as e:
        print_error(f"Failed to install {prereq.name}: {e}")
        return False


# =============================================================================
# Feature Configuration Functions
# =============================================================================

def get_kibana_headers(api_key: str) -> Dict[str, str]:
    return {
        "Authorization": f"ApiKey {api_key}",
        "Content-Type": "application/json",
        "kbn-xsrf": "true"
    }


def normalize_url(url: str) -> str:
    return url.rstrip('/')


def configure_agent_builder() -> Dict[str, str]:
    """Configure Agent Builder connection. Returns env vars dict."""
    print(f"\n{Colors.BOLD}Agent Builder Configuration{Colors.ENDC}")
    print(f"{Colors.DIM}Enables: Chat, Branded Demo, Audit, MCP Explorer{Colors.ENDC}\n")
    
    print("You'll need:")
    print(f"  • {Colors.BOLD}Kibana URL{Colors.ENDC} - Your Elastic Cloud deployment URL")
    print(f"    {Colors.DIM}(e.g., https://my-deployment.kb.us-west2.gcp.elastic-cloud.com){Colors.ENDC}")
    print(f"  • {Colors.BOLD}API Key{Colors.ENDC} - Created in Kibana → Stack Management → Security → API Keys")
    print(f"    {Colors.DIM}Needs 'agent_builder' privileges, or use a 'superuser' key for demos{Colors.ENDC}")
    print()
    
    if not ask_yes_no("Do you have these details ready?"):
        print_info("No problem! You can configure this later by running ./setup.sh")
        return {}
    
    env_vars = {}
    
    while True:
        kibana_url = ask("Kibana URL")
        api_key = ask("API Key")
        
        agents = validate_and_list_agents(kibana_url, api_key)
        
        if agents is not None:
            env_vars["KIBANA_URL"] = normalize_url(kibana_url)
            env_vars["ELASTIC_API_KEY"] = api_key
            
            agent_id = select_agent(agents)
            if agent_id:
                env_vars["AGENT_ID"] = agent_id
                
                if ask_yes_no("Test the agent with a quick message?", default="yes"):
                    test_agent(kibana_url, api_key, agent_id)
            break
        
        if not ask_yes_no("Connection failed. Try again?"):
            print_info("You can configure this later by editing backend/.env")
            agent_id = ask("Agent ID (or leave blank)", required=False)
            if kibana_url:
                env_vars["KIBANA_URL"] = normalize_url(kibana_url)
            if api_key:
                env_vars["ELASTIC_API_KEY"] = api_key
            if agent_id:
                env_vars["AGENT_ID"] = agent_id
            break
    
    return env_vars


def validate_and_list_agents(kibana_url: str, api_key: str) -> Optional[List[Dict]]:
    """Validate connection by listing agents."""
    print("   ⏳ Connecting to Elastic...", end="", flush=True)
    
    kibana_url = normalize_url(kibana_url)
    url = f"{kibana_url}/api/agent_builder/agents"
    headers = get_kibana_headers(api_key)
    
    try:
        req = urllib.request.Request(url, headers=headers, method="GET")
        with urllib.request.urlopen(req, timeout=15) as response:
            if response.status == 200:
                data = json.loads(response.read().decode())
                agents = data.get("results", [])
                print(f"\r   ✅ Connected! Found {len(agents)} agent(s)                ")
                return agents
            else:
                print(f"\r   ❌ Unexpected status: {response.status}              ")
                return None
                
    except urllib.error.HTTPError as e:
        print(f"\r   ❌ HTTP {e.code}: {e.reason}                          ")
        if e.code == 401:
            print("      API key is invalid or expired.")
            print(f"      {Colors.DIM}→ Create a new key: Kibana → Stack Management → Security → API Keys{Colors.ENDC}")
            print(f"      {Colors.DIM}→ Copy the encoded key (Base64), not the ID{Colors.ENDC}")
        elif e.code == 403:
            print("      API key doesn't have required permissions.")
            print(f"      {Colors.DIM}→ Create a key with 'agent_builder' application privileges{Colors.ENDC}")
            print(f"      {Colors.DIM}→ Or use a key with 'superuser' role for demos{Colors.ENDC}")
        elif e.code == 404:
            print("      Agent Builder endpoint not found.")
            print(f"      {Colors.DIM}→ Verify Agent Builder is enabled on your deployment{Colors.ENDC}")
            print(f"      {Colors.DIM}→ Check the Kibana URL is correct (should end in .kb...){Colors.ENDC}")
        return None
    except urllib.error.URLError as e:
        print(f"\r   ❌ Network error: {e.reason}                          ")
        print("      Check the Kibana URL is correct and accessible.")
        return None
    except Exception as e:
        print(f"\r   ❌ Error: {str(e)}                                    ")
        return None


def select_agent(agents: List[Dict]) -> Optional[str]:
    """Display available agents and let user select one."""
    if not agents:
        print_warning("No agents found. You'll need to enter an agent ID manually.")
        return ask("Agent ID", required=False)
    
    print(f"\n{Colors.BOLD}Available Agents:{Colors.ENDC}")
    
    user_agents = [a for a in agents if not a.get("readonly", False)]
    system_agents = [a for a in agents if a.get("readonly", False)]
    all_agents = user_agents + system_agents
    
    for i, agent in enumerate(all_agents, 1):
        name = agent.get("name", agent.get("id", "Unknown"))
        agent_id = agent.get("id", "")
        readonly = " (system)" if agent.get("readonly") else ""
        print(f"   {Colors.CYAN}{i}.{Colors.ENDC} {name}{readonly}")
        print(f"      {Colors.DIM}ID: {agent_id}{Colors.ENDC}")
    
    print(f"   {Colors.CYAN}0.{Colors.ENDC} Enter ID manually")
    print()
    
    handler = get_input_handler()
    
    while True:
        choice = handler.get_input(f"{Colors.BOLD}Select agent [1-{len(all_agents)}]: {Colors.ENDC}").strip()
        
        if not choice:
            if user_agents:
                selected = user_agents[0]
                print_info(f"Selected: {selected.get('name', selected.get('id'))}")
                return selected.get("id")
            if not handler.is_tty and user_agents:
                return user_agents[0].get("id")
            continue
            
        try:
            choice_num = int(choice)
            if choice_num == 0:
                return ask("Agent ID", required=True)
            elif 1 <= choice_num <= len(all_agents):
                selected = all_agents[choice_num - 1]
                print_success(f"Selected: {selected.get('name', selected.get('id'))}")
                return selected.get("id")
        except ValueError:
            matching = [a for a in all_agents if a.get("id") == choice]
            if matching:
                print_success(f"Selected: {matching[0].get('name', choice)}")
                return choice
        
        print_error(f"Please enter 0-{len(all_agents)}")
        if not handler.is_tty and user_agents:
            return user_agents[0].get("id")


def test_agent(kibana_url: str, api_key: str, agent_id: str) -> bool:
    """Test that we can talk to the selected agent."""
    print("   ⏳ Testing agent...", end="", flush=True)
    
    kibana_url = normalize_url(kibana_url)
    url = f"{kibana_url}/api/agent_builder/converse"
    headers = get_kibana_headers(api_key)
    payload = {"input": "hi", "agent_id": agent_id}
    
    try:
        req = urllib.request.Request(
            url,
            data=json.dumps(payload).encode('utf-8'),
            headers=headers,
            method="POST"
        )
        with urllib.request.urlopen(req, timeout=60) as response:
            if response.status in [200, 201, 202]:
                print(f"\r   ✅ Agent responded successfully!                     ")
                return True
            print(f"\r   ❌ Unexpected status: {response.status}              ")
            return False
    except Exception as e:
        print(f"\r   ❌ Error: {str(e)[:40]}                          ")
        return False


def configure_llm_proxy() -> Dict[str, str]:
    """Configure LLM Proxy for A2A multi-agent. Returns env vars dict."""
    print(f"\n{Colors.BOLD}LLM Proxy Configuration (A2A Multi-Agent){Colors.ENDC}")
    print(f"{Colors.DIM}Enables: A2A Multi-Agent orchestration{Colors.ENDC}\n")
    
    print("The A2A feature uses an LLM as a coordinator to orchestrate multiple agents.")
    print("You'll need access to an OpenAI-compatible LLM proxy.\n")
    
    print(f"  • {Colors.BOLD}LLM Proxy URL{Colors.ENDC} - OpenAI-compatible endpoint")
    print(f"    {Colors.DIM}(e.g., https://api.openai.com/v1 or your internal proxy){Colors.ENDC}")
    print(f"  • {Colors.BOLD}API Key{Colors.ENDC} - Authentication for the LLM proxy")
    print(f"  • {Colors.BOLD}Model{Colors.ENDC} - Model to use (optional, default: gpt-4)")
    print()
    
    if not ask_yes_no("Do you have LLM proxy credentials?"):
        print_info("No problem! You can configure this later in backend/.env")
        return {}
    
    env_vars = {}
    
    llm_url = ask("LLM Proxy URL", default="https://api.openai.com/v1")
    llm_key = ask("LLM Proxy API Key")
    llm_model = ask("Model name", default="gpt-4", required=False)
    
    env_vars["LLM_PROXY_URL"] = llm_url
    env_vars["LLM_PROXY_API_KEY"] = llm_key
    if llm_model:
        env_vars["LLM_PROXY_MODEL"] = llm_model
    
    print_success("LLM Proxy configured")
    return env_vars


# Future feature configurators can be added here:
# def configure_elasticsearch() -> Dict[str, str]: ...
# def configure_otel() -> Dict[str, str]: ...


# =============================================================================
# Branding
# =============================================================================

def configure_branding(frontend_port: int) -> Optional[str]:
    """Configure branding options. Returns path to branding prompt file if created."""
    print(f"\n{Colors.BOLD}Branding Options:{Colors.ENDC}")
    print(f"   {Colors.CYAN}1.{Colors.ENDC} Brand Editor - Manual color/logo picker at /brands")
    print(f"   {Colors.CYAN}2.{Colors.ENDC} AI Extraction - Extract from a website URL")
    print(f"   {Colors.CYAN}3.{Colors.ENDC} Skip for now")
    print()
    
    handler = get_input_handler()
    choice = handler.get_input(f"{Colors.BOLD}Select option [1-3]: {Colors.ENDC}").strip()
    
    if choice == "1":
        print_success(f"Use the Brand Editor at: http://localhost:{frontend_port}/brands")
        return None
    elif choice == "2":
        url = ask("Enter the website URL to extract branding from")
        prompt_path = create_branding_prompt(url)
        print_success(f"Created: {prompt_path}")
        print_info("Your AI assistant will extract colors, fonts, and logos automatically")
        return prompt_path
    else:
        print_info("Skipping - Brand Editor available at /brands anytime")
        return None


def create_branding_prompt(url: str) -> str:
    """Creates a customized prompt file for branding extraction."""
    brand_name = extract_brand_name_from_url(url)
    prompt_path = "NEXT_STEPS_BRANDING.md"
    
    content = f"""# 🎨 Branding Customization for {url}

Your setup is complete! To apply custom branding, use this prompt with your AI coding assistant.

---

## Quick Start

Copy and paste this into **Cursor** or **Claude Code**:

---

**PROMPT:**

I need to customize this demo application for the brand at **{url}**.

Please:
1. Analyze `{url}` to extract their brand identity
2. Create `frontend/src/branding/{brand_name}Theme.ts` using `exampleTheme.ts` as template
3. Export a `{brand_name}Branding` object
4. Extract: primary colors, accent colors, fonts, and logo (SVG preferred)
5. Set `{brand_name}` as the default brand

Reference `hive-mind/patterns/branding/BRANDING_EXTRACTION_PATTERNS.md` for the extraction pattern.

---

## After branding is applied:

- Restart the frontend: `./dev restart`
- Or switch brands via URL: `http://localhost:3000?brand={brand_name}`

---

*Delete this file after completing the branding setup.*
"""
    with open(prompt_path, "w") as f:
        f.write(content)
    return prompt_path


def extract_brand_name_from_url(url: str) -> str:
    clean = url.replace('https://', '').replace('http://', '').replace('www.', '')
    domain_part = clean.split('.')[0]
    return ''.join(c for c in domain_part if c.isalnum())


# =============================================================================
# Existing Setup Detection
# =============================================================================

def detect_existing_setup() -> Dict[str, bool]:
    """Detect what parts of the setup already exist."""
    return {
        "backend_venv": os.path.exists("backend/venv"),
        "backend_env": os.path.exists("backend/.env"),
        "frontend_modules": os.path.exists("frontend/node_modules"),
    }


def load_existing_env() -> Dict[str, str]:
    """Load existing environment variables from backend/.env."""
    env_vars = {}
    if os.path.exists("backend/.env"):
        with open("backend/.env") as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    key, value = line.split("=", 1)
                    env_vars[key.strip()] = value.strip()
    return env_vars


def save_env_file(env_vars: Dict[str, str]):
    """Save environment variables to backend/.env."""
    os.makedirs("backend", exist_ok=True)
    
    # Group variables for readability
    groups = [
        ("# Elastic Agent Builder", ["KIBANA_URL", "ELASTIC_API_KEY", "AGENT_ID"]),
        ("# LLM Proxy (A2A Multi-Agent)", ["LLM_PROXY_URL", "LLM_PROXY_API_KEY", "LLM_PROXY_MODEL"]),
        ("# Server Ports", ["PORT", "FRONTEND_PORT"]),
        # Future groups:
        # ("# Elasticsearch", ["ELASTICSEARCH_URL", "ES_API_KEY"]),
        # ("# OpenTelemetry", ["OTEL_EXPORTER_OTLP_ENDPOINT", "OTEL_EXPORTER_OTLP_HEADERS"]),
    ]
    
    lines = []
    written_keys = set()
    
    for header, keys in groups:
        group_lines = []
        for key in keys:
            if key in env_vars and env_vars[key]:
                group_lines.append(f"{key}={env_vars[key]}")
                written_keys.add(key)
        
        if group_lines:
            lines.append(header)
            lines.extend(group_lines)
            lines.append("")
    
    # Write any remaining keys not in groups
    remaining = [f"{k}={v}" for k, v in env_vars.items() if k not in written_keys and v]
    if remaining:
        lines.append("# Other")
        lines.extend(remaining)
    
    with open("backend/.env", "w") as f:
        f.write("\n".join(lines))


def has_meaningful_existing_setup(existing: Dict[str, bool]) -> bool:
    return existing["backend_env"] or existing["backend_venv"] or existing["frontend_modules"]


def show_existing_setup(existing: Dict[str, bool]) -> None:
    print(f"\n{Colors.BOLD}Previous setup detected:{Colors.ENDC}")
    if existing["backend_env"]:
        print(f"   ✅ Configuration exists (backend/.env)")
    if existing["backend_venv"]:
        print(f"   ✅ Backend dependencies installed")
    if existing["frontend_modules"]:
        print(f"   ✅ Frontend dependencies installed")


def get_setup_mode(existing: Dict[str, bool]) -> str:
    """Ask user what they want to do with existing setup."""
    if not has_meaningful_existing_setup(existing):
        return "fresh"
    
    show_existing_setup(existing)
    
    print(f"\n{Colors.BOLD}What would you like to do?{Colors.ENDC}")
    print(f"   {Colors.CYAN}1.{Colors.ENDC} Start fresh (delete everything)")
    print(f"   {Colors.CYAN}2.{Colors.ENDC} Keep existing, configure what's missing")
    print(f"   {Colors.CYAN}3.{Colors.ENDC} Add/modify feature configuration")
    print(f"   {Colors.CYAN}4.{Colors.ENDC} Exit")
    print()
    
    handler = get_input_handler()
    choice = handler.get_input(f"{Colors.BOLD}Select option [1-4]: {Colors.ENDC}").strip()
    
    if choice == "1":
        print_warning("This will delete your existing configuration.")
        if ask_yes_no("Are you sure?", default="no"):
            return "fresh"
        return "update"
    elif choice == "2":
        return "update"
    elif choice == "3":
        return "reconfigure"
    elif choice == "4":
        print_info("Setup cancelled.")
        sys.exit(0)
    else:
        return "update"


def clean_existing_setup(existing: Dict[str, bool]) -> None:
    """Remove existing setup files."""
    import shutil as sh
    
    if existing.get("backend_venv"):
        print("   Removing backend dependencies...")
        sh.rmtree("backend/venv", ignore_errors=True)
    
    if existing.get("backend_env"):
        print("   Removing configuration...")
        os.remove("backend/.env")
    
    if existing.get("frontend_modules"):
        print("   Removing frontend dependencies...")
        sh.rmtree("frontend/node_modules", ignore_errors=True)
    
    print_success("Cleaned up. Starting fresh...")


# =============================================================================
# Main Setup Flow
# =============================================================================

def main():
    print("\n")
    print_header("╔════════════════════════════════════════════╗")
    print_header("║    Elastic Demo Starter - Setup Wizard     ║")
    print_header("╚════════════════════════════════════════════╝")
    print("\n")
    print("This wizard will help you configure your demo environment.")
    print("You can choose which features to set up based on your needs.\n")
    
    # Initialize input handler
    handler = get_input_handler()
    if not handler.is_tty:
        print_info(f"Running in piped/scripted mode ({len(handler.piped_lines)} input lines)")
    
    # Detect OS
    os_info = OSInfo()
    print(f"{Colors.BLUE}Detected: {os_info}{Colors.ENDC}")
    
    # Check for existing setup
    existing = detect_existing_setup()
    existing_env = load_existing_env()
    setup_mode = get_setup_mode(existing)
    
    if setup_mode == "fresh" and has_meaningful_existing_setup(existing):
        print_step(0, "Cleaning Existing Setup")
        clean_existing_setup(existing)
        existing = detect_existing_setup()
        existing_env = {}
    
    # ==========================================================================
    # Step 1: Prerequisites
    # ==========================================================================
    if setup_mode != "reconfigure":
        print_step(1, "Checking Prerequisites")
        
        prereqs = get_prerequisites()
        missing_required = []
        
        for prereq in prereqs:
            if not prereq.required:
                continue
            if prereq.is_installed():
                print_success(f"{prereq.name} found")
            else:
                print_error(f"{prereq.name} not found")
                missing_required.append(prereq)
        
        if missing_required:
            print(f"\n{Colors.BOLD}Missing required prerequisites:{Colors.ENDC}")
            for prereq in missing_required:
                print(f"  • {prereq.name}: {prereq.description}")
            
            if os_info.pkg_manager:
                if ask_yes_no("\nInstall missing prerequisites?"):
                    for prereq in missing_required:
                        if not install_prerequisite(prereq, os_info):
                            print_error(f"Failed to install {prereq.name}.")
                            sys.exit(1)
                else:
                    print_error("Cannot proceed without required prerequisites.")
                    sys.exit(1)
            else:
                print_error("Please install the missing prerequisites manually.")
                sys.exit(1)
    
    # ==========================================================================
    # Step 2: Feature Selection
    # ==========================================================================
    print_step(2, "Feature Selection")
    
    print("\nThis template supports multiple features. Select what you want to configure:\n")
    
    # Build options list with current status
    feature_options = []
    for feature_id, info in FEATURES.items():
        # Check if already configured
        already_configured = all(
            existing_env.get(var) for var in info.env_vars[:2]  # Check first 2 vars
        )
        status = f" {Colors.GREEN}(configured){Colors.ENDC}" if already_configured else ""
        
        description = f"{info.name}{status} - {info.description}"
        # Default to not selected if already configured (unless reconfigure mode)
        default_selected = not already_configured or setup_mode == "reconfigure"
        
        feature_options.append((feature_id.value, description, default_selected and not already_configured))
    
    selected_features = ask_multi_select(
        feature_options,
        "Which features do you want to configure?"
    )
    
    # ==========================================================================
    # Step 3: Configure Selected Features
    # ==========================================================================
    print_step(3, "Feature Configuration")
    
    # Start with existing env vars
    env_vars = existing_env.copy()
    
    # Port detection
    backend_port = int(env_vars.get("PORT", 0)) or find_available_port(8001)
    frontend_port = int(env_vars.get("FRONTEND_PORT", 0)) or find_available_port(3000)
    env_vars["PORT"] = str(backend_port)
    env_vars["FRONTEND_PORT"] = str(frontend_port)
    
    if backend_port != 8001 or frontend_port != 3000:
        print_info(f"Using ports: Backend={backend_port}, Frontend={frontend_port}")
    
    # Configure each selected feature
    if Feature.AGENT_BUILDER.value in selected_features:
        new_vars = configure_agent_builder()
        env_vars.update(new_vars)
    
    if Feature.LLM_PROXY.value in selected_features:
        new_vars = configure_llm_proxy()
        env_vars.update(new_vars)
    
    # Future features:
    # if Feature.ELASTICSEARCH.value in selected_features:
    #     new_vars = configure_elasticsearch()
    #     env_vars.update(new_vars)
    
    # Save configuration
    save_env_file(env_vars)
    print_success("Saved configuration to backend/.env")
    
    # ==========================================================================
    # Step 4: Install Dependencies (if needed)
    # ==========================================================================
    if setup_mode != "reconfigure":
        print_step(4, "Installing Dependencies")
        
        # Backend
        print(f"\n{Colors.BOLD}🐍 Backend (Python)...{Colors.ENDC}")
        if existing["backend_venv"] and setup_mode == "update":
            print_info("Virtual environment exists, updating packages...")
        else:
            if not os.path.exists("backend/venv"):
                print("   Creating virtual environment...")
                subprocess.run([sys.executable, "-m", "venv", "backend/venv"], 
                             check=True, stdin=subprocess.DEVNULL)
        
        pip_cmd = "backend/venv/bin/pip" if os.name != 'nt' else "backend\\venv\\Scripts\\pip"
        subprocess.run([pip_cmd, "install", "-r", "backend/requirements.txt"], 
                       stdin=subprocess.DEVNULL, stdout=subprocess.DEVNULL, 
                       stderr=subprocess.PIPE, check=True)
        print_success("Backend dependencies installed")
        
        # Frontend
        print(f"\n{Colors.BOLD}⚛️  Frontend (Node.js)...{Colors.ENDC}")
        pkg_manager = "yarn" if check_command("yarn") else "npm"
        
        if existing["frontend_modules"] and setup_mode == "update":
            print_info("node_modules exists, skipping install")
        else:
            try:
                # Use non-interactive/silent flags and redirect stdin/stdout
                # to prevent output interleaving with prompts
                if pkg_manager == "yarn":
                    cmd = [pkg_manager, "install", "--non-interactive", "--silent"]
                else:
                    cmd = [pkg_manager, "install", "--no-fund", "--no-audit", "--silent"]
                
                subprocess.run(cmd, cwd="frontend", check=True, 
                             stdin=subprocess.DEVNULL, stdout=subprocess.DEVNULL,
                             stderr=subprocess.DEVNULL)
                print_success("Frontend dependencies installed")
            except subprocess.CalledProcessError:
                print_error("Frontend installation failed")
    
    # ==========================================================================
    # Step 5: Branding (Optional)
    # ==========================================================================
    if setup_mode != "reconfigure":
        print_step(5, "Branding (Optional)")
        configure_branding(frontend_port)
    
    # ==========================================================================
    # Complete!
    # ==========================================================================
    print("\n")
    print_header("╔════════════════════════════════════════════╗")
    print_header("║           ✅  Setup Complete!              ║")
    print_header("╚════════════════════════════════════════════╝")
    print("\n")
    
    # Show what was configured
    print(f"{Colors.BOLD}Configured Features:{Colors.ENDC}")
    if env_vars.get("KIBANA_URL"):
        print(f"   ✅ Agent Builder → Chat, Demo, Audit, MCP")
    else:
        print(f"   ⬜ Agent Builder (not configured)")
    
    if env_vars.get("LLM_PROXY_URL"):
        print(f"   ✅ LLM Proxy → A2A Multi-Agent")
    else:
        print(f"   ⬜ LLM Proxy (not configured)")
    
    print()
    
    if ask_yes_no("Launch the demo now?"):
        print()
        print_info("Starting servers...")
        subprocess.run(["./dev", "start"], stdin=subprocess.DEVNULL)
        
        import webbrowser
        import time
        time.sleep(3)
        
        print_info(f"Opening browser to http://localhost:{frontend_port}")
        webbrowser.open(f"http://localhost:{frontend_port}")
        
        print()
        print(f"{Colors.BOLD}Servers running in background.{Colors.ENDC}")
        print(f"   View logs: {Colors.GREEN}./dev logs{Colors.ENDC}")
        print(f"   Stop:      {Colors.GREEN}./dev stop{Colors.ENDC}")
    else:
        print(f"{Colors.BOLD}Dev Commands:{Colors.ENDC}")
        print(f"   {Colors.GREEN}./dev start{Colors.ENDC}  - Start servers")
        print(f"   {Colors.GREEN}./dev stop{Colors.ENDC}   - Stop servers")
        print(f"   {Colors.GREEN}./dev logs{Colors.ENDC}   - View logs")
        print()
        print(f"   Frontend: {Colors.BLUE}http://localhost:{frontend_port}{Colors.ENDC}")
    
    print()
    print(f"{Colors.HEADER}╔════════════════════════════════════════════╗{Colors.ENDC}")
    print(f"{Colors.HEADER}║           🚀  Next Step                    ║{Colors.ENDC}")
    print(f"{Colors.HEADER}╚════════════════════════════════════════════╝{Colors.ENDC}")
    print()
    print(f"Open in {Colors.BOLD}Cursor{Colors.ENDC} or {Colors.BOLD}VS Code + Claude{Colors.ENDC} and tell your AI:")
    print()
    print(f'   {Colors.CYAN}"Read and follow ONBOARDING.md"{Colors.ENDC}')
    print()


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n⚠️  Setup cancelled.")
        sys.exit(1)
