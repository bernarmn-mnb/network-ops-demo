"""Unit tests for Agno coordinator.

Tests the coordinator module:
- get_coordinator
- get_coordinator_config
- check_coordinator_health
"""

import json
from unittest.mock import MagicMock, patch

import pytest

from app.agno.coordinator import (
    check_coordinator_health,
    get_coordinator_config,
    get_llm_model,
    COORDINATOR_INSTRUCTIONS,
)


class TestGetLlmModel:
    """Tests for get_llm_model function."""

    @patch("app.agno.coordinator.settings")
    def test_raises_when_not_configured(self, mock_settings):
        """Should raise ValueError when LLM proxy not configured."""
        mock_settings.LLM_PROXY_URL = ""
        mock_settings.LLM_PROXY_API_KEY = ""
        
        with pytest.raises(ValueError, match="LLM proxy not configured"):
            get_llm_model()

    @patch("app.agno.coordinator.settings")
    def test_creates_model_with_proxy_config(self, mock_settings):
        """Should create OpenAIChat with proxy settings."""
        mock_settings.LLM_PROXY_URL = "https://proxy.example.com/v1"
        mock_settings.LLM_PROXY_API_KEY = "test-key"
        mock_settings.LLM_PROXY_MODEL = "gpt-4o"
        
        model = get_llm_model()
        
        assert model.id == "gpt-4o"
        assert model.base_url == "https://proxy.example.com/v1"


class TestGetCoordinatorConfig:
    """Tests for get_coordinator_config function."""

    @patch("app.agno.coordinator.settings")
    def test_returns_config_dict(self, mock_settings):
        """Should return configuration dictionary."""
        mock_settings.LLM_PROXY_URL = "https://proxy.example.com/v1"
        mock_settings.LLM_PROXY_API_KEY = "test-key"
        mock_settings.LLM_PROXY_MODEL = "gpt-4o"
        mock_settings.KIBANA_URL = "https://kibana.example.com"
        mock_settings.ELASTIC_API_KEY = "kibana-key"
        
        config = get_coordinator_config()
        
        assert config["llm_configured"] is True
        assert config["llm_model"] == "gpt-4o"
        assert config["kibana_configured"] is True
        assert config["memory_enabled"] is True

    @patch("app.agno.coordinator.settings")
    def test_detects_missing_llm_config(self, mock_settings):
        """Should detect when LLM is not configured."""
        mock_settings.LLM_PROXY_URL = ""
        mock_settings.LLM_PROXY_API_KEY = ""
        mock_settings.LLM_PROXY_MODEL = "gpt-4o"
        mock_settings.KIBANA_URL = "https://kibana.example.com"
        mock_settings.ELASTIC_API_KEY = "kibana-key"
        
        config = get_coordinator_config()
        
        assert config["llm_configured"] is False

    @patch("app.agno.coordinator.settings")
    def test_detects_missing_kibana_config(self, mock_settings):
        """Should detect when Kibana is not configured."""
        mock_settings.LLM_PROXY_URL = "https://proxy.example.com/v1"
        mock_settings.LLM_PROXY_API_KEY = "test-key"
        mock_settings.LLM_PROXY_MODEL = "gpt-4o"
        mock_settings.KIBANA_URL = ""
        mock_settings.ELASTIC_API_KEY = ""
        
        config = get_coordinator_config()
        
        assert config["kibana_configured"] is False


class TestCheckCoordinatorHealth:
    """Tests for check_coordinator_health function."""

    @patch("app.agno.coordinator.get_available_agents")
    @patch("app.agno.coordinator.settings")
    def test_healthy_when_all_configured(self, mock_settings, mock_agents):
        """Should report healthy when all services configured."""
        mock_settings.LLM_PROXY_URL = "https://proxy.example.com/v1"
        mock_settings.LLM_PROXY_API_KEY = "test-key"
        mock_settings.KIBANA_URL = "https://kibana.example.com"
        mock_settings.ELASTIC_API_KEY = "kibana-key"
        mock_agents.return_value = json.dumps({"agents": [{"id": "test"}]})
        
        health = check_coordinator_health()
        
        assert health["healthy"] is True
        assert health["llm_proxy"]["status"] == "configured"
        assert health["agent_builder"]["status"] == "connected"

    @patch("app.agno.coordinator.settings")
    def test_unhealthy_without_llm(self, mock_settings):
        """Should report unhealthy when LLM not configured."""
        mock_settings.LLM_PROXY_URL = ""
        mock_settings.LLM_PROXY_API_KEY = ""
        mock_settings.KIBANA_URL = "https://kibana.example.com"
        mock_settings.ELASTIC_API_KEY = "kibana-key"
        
        health = check_coordinator_health()
        
        assert health["healthy"] is False
        assert health["llm_proxy"]["status"] == "not_configured"


class TestCoordinatorInstructions:
    """Tests for coordinator system prompt."""

    def test_instructions_contain_key_elements(self):
        """Should contain essential instructions for routing."""
        assert "Agent Builder" in COORDINATOR_INSTRUCTIONS
        assert "get_available_agents" in COORDINATOR_INSTRUCTIONS
        assert "call_agent_builder" in COORDINATOR_INSTRUCTIONS
        assert "route" in COORDINATOR_INSTRUCTIONS.lower()
