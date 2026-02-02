"""Unit tests for Agent Builder tool.

Tests the AgentBuilderToolkit and its tools:
- get_available_agents
- call_agent_builder
"""

import json
from unittest.mock import MagicMock, patch

import pytest

from app.agno.tools.agent_builder import (
    AgentBuilderToolkit,
    AgentReasoningEvent,
    AgentTextChunkEvent,
    AgentToolCallEvent,
    AgentToolResultEvent,
    get_available_agents,
    extract_agent_id_from_url,
)


class TestExtractAgentIdFromUrl:
    """Tests for extract_agent_id_from_url helper."""

    def test_extracts_id_from_valid_url(self):
        """Should extract agent ID from A2A URL."""
        url = "https://kibana.example.com/api/agent_builder/a2a/sales-agent"
        result = extract_agent_id_from_url(url)
        assert result == "sales-agent"

    def test_returns_none_for_invalid_url(self):
        """Should return None when URL doesn't contain /a2a/."""
        url = "https://kibana.example.com/api/agent_builder/agents"
        result = extract_agent_id_from_url(url)
        assert result is None

    def test_handles_complex_ids(self):
        """Should handle agent IDs with dashes and numbers."""
        url = "/api/agent_builder/a2a/my-agent-123"
        result = extract_agent_id_from_url(url)
        assert result == "my-agent-123"


class TestGetAvailableAgents:
    """Tests for get_available_agents function."""

    @patch("app.agno.tools.agent_builder.fetch_all_agent_cards")
    def test_returns_empty_when_no_agents(self, mock_fetch):
        """Should return empty list when no agents configured."""
        mock_fetch.return_value = []
        
        result = get_available_agents()
        data = json.loads(result)
        
        assert data["agents"] == []
        assert "message" in data

    @patch("app.agno.tools.agent_builder.fetch_all_agent_cards")
    def test_returns_agent_list(self, mock_fetch):
        """Should return formatted agent list."""
        mock_fetch.return_value = [
            {
                "name": "Sales Agent",
                "description": "Handles sales queries",
                "url": "/api/agent_builder/a2a/sales-agent",
                "skills": [
                    {"name": "product_search"},
                    {"name": "pricing_lookup"},
                ],
            }
        ]
        
        result = get_available_agents()
        data = json.loads(result)
        
        assert len(data["agents"]) == 1
        assert data["agents"][0]["id"] == "sales-agent"
        assert data["agents"][0]["name"] == "Sales Agent"
        assert "product_search" in data["agents"][0]["skills"]

    @patch("app.agno.tools.agent_builder.fetch_all_agent_cards")
    def test_handles_fetch_error(self, mock_fetch):
        """Should handle errors gracefully."""
        mock_fetch.side_effect = Exception("Connection failed")
        
        result = get_available_agents()
        data = json.loads(result)
        
        assert "error" in data
        assert data["agents"] == []


class TestAgentBuilderToolkit:
    """Tests for AgentBuilderToolkit class."""

    def test_toolkit_creation(self):
        """Should create toolkit with registered tools."""
        toolkit = AgentBuilderToolkit()
        
        assert toolkit.name == "agent_builder"
        # Check tools are registered
        functions = toolkit.get_functions()
        async_functions = toolkit.get_async_functions()
        
        assert "get_available_agents" in functions or "get_available_agents" in async_functions

    def test_toolkit_has_call_agent_builder(self):
        """Should have call_agent_builder in async functions."""
        toolkit = AgentBuilderToolkit()
        async_functions = toolkit.get_async_functions()
        
        assert "call_agent_builder" in async_functions


class TestCustomEvents:
    """Tests for custom event dataclasses."""

    def test_reasoning_event_creation(self):
        """Should create AgentReasoningEvent with correct fields."""
        event = AgentReasoningEvent(
            agent_id="test-agent",
            agent_name="Test Agent",
            reasoning="Thinking about the query..."
        )
        
        assert event.agent_id == "test-agent"
        assert event.agent_name == "Test Agent"
        assert event.reasoning == "Thinking about the query..."

    def test_text_chunk_event_creation(self):
        """Should create AgentTextChunkEvent with correct fields."""
        event = AgentTextChunkEvent(
            agent_id="test-agent",
            agent_name="Test Agent",
            text_chunk="Hello, world!"
        )
        
        assert event.agent_id == "test-agent"
        assert event.text_chunk == "Hello, world!"

    def test_tool_call_event_creation(self):
        """Should create AgentToolCallEvent with correct fields."""
        event = AgentToolCallEvent(
            agent_id="test-agent",
            agent_name="Test Agent",
            tool_id="tool-123",
            tool_name="search",
            params={"query": "test"}
        )
        
        assert event.tool_id == "tool-123"
        assert event.tool_name == "search"
        assert event.params == {"query": "test"}

    def test_tool_result_event_creation(self):
        """Should create AgentToolResultEvent with correct fields."""
        event = AgentToolResultEvent(
            agent_id="test-agent",
            agent_name="Test Agent",
            tool_id="tool-123",
            tool_name="search",
            result={"hits": []}
        )
        
        assert event.tool_id == "tool-123"
        assert event.result == {"hits": []}
