"""Unit tests for Agno API endpoints.

Tests the FastAPI routes:
- GET /api/agno/v2/health
- GET /api/agno/v2/config
- GET /api/agno/v2/structure
- GET /api/agno/v2/agents
"""

import json
from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture
def client():
    """Create test client."""
    return TestClient(app)


class TestHealthEndpoint:
    """Tests for GET /api/agno/v2/health."""

    @patch("app.agno.routes.check_coordinator_health")
    def test_returns_health_status(self, mock_health, client):
        """Should return health status."""
        mock_health.return_value = {
            "healthy": True,
            "llm_proxy": {"status": "configured"},
            "agent_builder": {"status": "connected"},
        }
        
        response = client.get("/api/agno/v2/health")
        
        assert response.status_code == 200
        data = response.json()
        assert data["healthy"] is True


class TestConfigEndpoint:
    """Tests for GET /api/agno/v2/config."""

    @patch("app.agno.routes.get_coordinator_config")
    def test_returns_config(self, mock_config, client):
        """Should return configuration."""
        mock_config.return_value = {
            "llm_configured": True,
            "llm_model": "gpt-4o",
            "kibana_configured": True,
            "memory_enabled": True,
            "learning_enabled": True,
        }
        
        response = client.get("/api/agno/v2/config")
        
        assert response.status_code == 200
        data = response.json()
        assert data["llm_model"] == "gpt-4o"


class TestStructureEndpoint:
    """Tests for GET /api/agno/v2/structure."""

    @patch("app.agno.routes.get_available_agents")
    def test_returns_graph_structure(self, mock_agents, client):
        """Should return agent architecture graph."""
        mock_agents.return_value = json.dumps({
            "agents": [
                {
                    "id": "sales-agent",
                    "name": "Sales Agent",
                    "description": "Handles sales",
                    "skills": ["search", "pricing"],
                }
            ]
        })
        
        response = client.get("/api/agno/v2/structure")
        
        assert response.status_code == 200
        data = response.json()
        assert "nodes" in data
        
        # Should have coordinator node
        node_names = [n["name"] for n in data["nodes"]]
        assert "Agno Coordinator" in node_names

    @patch("app.agno.routes.get_available_agents")
    def test_handles_no_agents(self, mock_agents, client):
        """Should handle when no agents available."""
        mock_agents.return_value = json.dumps({"agents": []})
        
        response = client.get("/api/agno/v2/structure")
        
        assert response.status_code == 200
        data = response.json()
        assert "nodes" in data


class TestAgentsEndpoint:
    """Tests for GET /api/agno/v2/agents."""

    @patch("app.agno.routes.get_available_agents")
    def test_returns_agents_list(self, mock_agents, client):
        """Should return list of agents."""
        mock_agents.return_value = json.dumps({
            "agents": [
                {"id": "test-agent", "name": "Test Agent"}
            ]
        })
        
        response = client.get("/api/agno/v2/agents")
        
        assert response.status_code == 200
        data = response.json()
        assert "agents" in data
        assert len(data["agents"]) == 1


class TestChatEndpoint:
    """Tests for POST /api/agno/v2/chat."""

    def test_chat_requires_message(self, client):
        """Should require message in request body."""
        response = client.post(
            "/api/agno/v2/chat",
            json={}
        )
        
        # Pydantic validation error
        assert response.status_code == 422

    @patch("app.agno.routes.get_coordinator")
    def test_chat_returns_stream(self, mock_coordinator, client):
        """Should return SSE stream."""
        # Mock coordinator that yields nothing (just completes)
        mock_agent = MagicMock()
        
        async def mock_arun(*args, **kwargs):
            # Empty async generator
            return
            yield  # Make it a generator
        
        mock_agent.arun = mock_arun
        mock_coordinator.return_value = mock_agent
        
        response = client.post(
            "/api/agno/v2/chat",
            json={"message": "Hello"},
            headers={"Accept": "text/event-stream"}
        )
        
        assert response.status_code == 200
        assert "text/event-stream" in response.headers.get("content-type", "")
