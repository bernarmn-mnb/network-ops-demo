#!/usr/bin/env python3
"""
Setup Telemetry Module

Sends anonymous usage telemetry to help improve the elastic-agent-starter.
All telemetry is opt-in with clear disclosure of what's collected.

The API key embedded here is WRITE-ONLY - it can only create documents
in the telemetry index. It cannot read, update, or delete any data.
"""

import json
import logging
import os
import platform
import subprocess
import urllib.error
import urllib.request
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Dict, List, Optional

logger = logging.getLogger(__name__)

# =============================================================================
# Telemetry Configuration
# =============================================================================

# Elasticsearch Serverless endpoint for telemetry
TELEMETRY_ENDPOINT = "https://demo-starter-telemetry-cc02ab.es.us-central1.gcp.elastic.cloud:443"
TELEMETRY_INDEX = "telemetry-setup"

# Write-only API key - can ONLY create documents, cannot read/update/delete
#
# Security notes:
# - This key has minimal permissions: create documents in telemetry-setup only
# - Cannot read, update, delete, or access any other indices
# - The repository is internal to Elastic (@elastic/elastic-demo-starter)
# - Endpoint is an Elastic Cloud Serverless project with built-in protections
# - If key rotation is needed, update here and redeploy
# - No rate limiting is applied; abuse is mitigated by key restrictions
#
TELEMETRY_API_KEY = "MF9JbkFKd0ItMDRpT0pYdmQ0RXY6ekdweDM1a21McTlpNk5kTmtCUklQQQ=="

# Timeout for telemetry requests (don't block setup if network is slow)
TELEMETRY_TIMEOUT_SECONDS = 10


# =============================================================================
# Data Models
# =============================================================================

@dataclass
class ContactInfo:
    """Optional contact information (only sent with explicit consent)."""
    email: Optional[str] = None
    github_handle: Optional[str] = None
    name: Optional[str] = None

    def to_dict(self) -> Dict:
        return {k: v for k, v in {
            "email": self.email,
            "github_handle": self.github_handle,
            "name": self.name,
        }.items() if v}


@dataclass
class TelemetryEvent:
    """Telemetry event data."""
    features: List[str]
    platform: str
    arch: str
    setup_success: bool
    setup_mode: str  # "fresh", "update", "reconfigure"
    starter_version: Optional[str] = None
    git_commit: Optional[str] = None
    python_version: Optional[str] = None
    node_version: Optional[str] = None
    use_case: Optional[str] = None
    contact: Optional[ContactInfo] = None

    def to_dict(self) -> Dict:
        data = {
            "@timestamp": datetime.now(timezone.utc).isoformat(),
            "features": self.features,
            "platform": self.platform,
            "arch": self.arch,
            "setup_success": self.setup_success,
            "setup_mode": self.setup_mode,
        }

        # Add optional fields if present
        if self.starter_version:
            data["starter_version"] = self.starter_version
        if self.git_commit:
            data["git_commit"] = self.git_commit
        if self.python_version:
            data["python_version"] = self.python_version
        if self.node_version:
            data["node_version"] = self.node_version
        if self.use_case:
            data["use_case"] = self.use_case
        if self.contact:
            contact_dict = self.contact.to_dict()
            if contact_dict:  # Only include if there's actual data
                data["contact"] = contact_dict

        return data


# =============================================================================
# Environment Detection
# =============================================================================

def detect_git_info() -> tuple[Optional[str], Optional[str]]:
    """Detect git version/commit info."""
    version = None
    commit = None

    try:
        # Try to get version tag
        result = subprocess.run(
            ["git", "describe", "--tags", "--always"],
            capture_output=True,
            text=True,
            timeout=5,
        )
        if result.returncode == 0:
            version = result.stdout.strip()
    except (subprocess.SubprocessError, FileNotFoundError, OSError):
        pass

    try:
        # Get short commit hash
        result = subprocess.run(
            ["git", "rev-parse", "--short", "HEAD"],
            capture_output=True,
            text=True,
            timeout=5,
        )
        if result.returncode == 0:
            commit = result.stdout.strip()
    except (subprocess.SubprocessError, FileNotFoundError, OSError):
        pass

    return version, commit


def detect_github_handle() -> Optional[str]:
    """Try to detect GitHub handle via gh CLI."""
    try:
        result = subprocess.run(
            ["gh", "api", "user", "--jq", ".login"],
            capture_output=True,
            text=True,
            timeout=10,
        )
        if result.returncode == 0 and result.stdout.strip():
            return result.stdout.strip()
    except (subprocess.SubprocessError, FileNotFoundError, OSError):
        pass
    return None


def detect_git_email() -> Optional[str]:
    """Get email from git config."""
    try:
        result = subprocess.run(
            ["git", "config", "user.email"],
            capture_output=True,
            text=True,
            timeout=5,
        )
        if result.returncode == 0 and result.stdout.strip():
            return result.stdout.strip()
    except (subprocess.SubprocessError, FileNotFoundError, OSError):
        pass
    return None


def detect_git_name() -> Optional[str]:
    """Get name from git config."""
    try:
        result = subprocess.run(
            ["git", "config", "user.name"],
            capture_output=True,
            text=True,
            timeout=5,
        )
        if result.returncode == 0 and result.stdout.strip():
            return result.stdout.strip()
    except (subprocess.SubprocessError, FileNotFoundError, OSError):
        pass
    return None


def detect_node_version() -> Optional[str]:
    """Detect Node.js version."""
    try:
        result = subprocess.run(
            ["node", "--version"],
            capture_output=True,
            text=True,
            timeout=5,
        )
        if result.returncode == 0:
            return result.stdout.strip().lstrip("v")
    except (subprocess.SubprocessError, FileNotFoundError, OSError):
        pass
    return None


def detect_python_version() -> str:
    """Get Python version."""
    import sys
    return f"{sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}"


def detect_contact_info() -> ContactInfo:
    """Auto-detect contact information from environment."""
    return ContactInfo(
        email=detect_git_email(),
        github_handle=detect_github_handle(),
        name=detect_git_name(),
    )


# =============================================================================
# Telemetry Sending
# =============================================================================

def send_telemetry(event: TelemetryEvent) -> bool:
    """
    Send telemetry event to Elasticsearch.

    Returns True if successful, False otherwise.
    Failures are silent - telemetry should never block setup.
    """
    try:
        url = f"{TELEMETRY_ENDPOINT}/{TELEMETRY_INDEX}/_doc"
        headers = {
            "Authorization": f"ApiKey {TELEMETRY_API_KEY}",
            "Content-Type": "application/json",
        }
        data = json.dumps(event.to_dict()).encode("utf-8")

        req = urllib.request.Request(url, data=data, headers=headers, method="POST")

        with urllib.request.urlopen(req, timeout=TELEMETRY_TIMEOUT_SECONDS) as response:
            if response.status in [200, 201]:
                logger.debug("Telemetry sent successfully")
                return True
            else:
                logger.debug(f"Telemetry failed with status {response.status}")
                return False

    except urllib.error.URLError as e:
        logger.debug(f"Telemetry network error: {e}")
        return False
    except Exception as e:
        logger.debug(f"Telemetry error: {e}")
        return False


# =============================================================================
# Project Context Integration
# =============================================================================

def load_use_case_from_context() -> Optional[str]:
    """
    Try to load use case from project-context.yaml if it exists.
    
    This provides a fallback if use_case isn't passed directly.
    """
    try:
        from project_context import load_context
        ctx = load_context()
        if ctx:
            return ctx.get_use_case_summary()
    except ImportError:
        pass
    except Exception:
        pass
    return None


# =============================================================================
# High-Level API
# =============================================================================

def collect_and_send_telemetry(
    features: List[str],
    setup_success: bool,
    setup_mode: str,
    use_case: Optional[str] = None,
    include_contact: bool = False,
) -> bool:
    """
    Collect system info and send telemetry.

    Args:
        features: List of configured feature IDs
        setup_success: Whether setup completed successfully
        setup_mode: "fresh", "update", or "reconfigure"
        use_case: Optional user-provided use case description
        include_contact: Whether to include contact info (requires consent)

    Returns:
        True if telemetry was sent successfully
    """
    # Detect system info
    starter_version, git_commit = detect_git_info()
    
    # If no use_case provided, try to load from project context
    if not use_case:
        use_case = load_use_case_from_context()

    # Build event
    event = TelemetryEvent(
        features=features,
        platform=platform.system().lower(),
        arch=platform.machine().lower(),
        setup_success=setup_success,
        setup_mode=setup_mode,
        starter_version=starter_version,
        git_commit=git_commit,
        python_version=detect_python_version(),
        node_version=detect_node_version(),
        use_case=use_case,
        contact=detect_contact_info() if include_contact else None,
    )

    return send_telemetry(event)


# =============================================================================
# CLI Test
# =============================================================================

if __name__ == "__main__":
    # Quick test when run directly
    print("Testing telemetry module...")
    print()

    contact = detect_contact_info()
    print(f"Detected contact info:")
    print(f"  Email:  {contact.email}")
    print(f"  GitHub: {contact.github_handle}")
    print(f"  Name:   {contact.name}")
    print()

    print("Sending test telemetry event...")
    success = collect_and_send_telemetry(
        features=["test"],
        setup_success=True,
        setup_mode="test",
        use_case="Module self-test",
        include_contact=True,
    )

    if success:
        print("✅ Telemetry sent successfully!")
    else:
        print("❌ Telemetry failed (check network/endpoint)")
