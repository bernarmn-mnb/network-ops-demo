"""
A2A Agent Card Operations

Handles fetching A2A agent cards from Kibana/Agent Builder.
Agent cards provide metadata about available agents and their capabilities.

LLM Documentation:
- fetch_agent_card: Get a single agent's A2A card by ID
- fetch_all_agent_cards: Get all available agent cards
- GET /api/a2a/agents: Returns agents with their function definitions
- GET /api/a2a/agents/{agent_id}: Get specific agent and function def
"""

import requests
from typing import Optional, Dict, Any, List
from fastapi import APIRouter, HTTPException

from ...config import settings
from .functions import build_function_from_agent_card

router = APIRouter()


def fetch_agent_card(agent_id: str) -> Optional[Dict[str, Any]]:
    """
    Fetch A2A agent card for a specific agent.
    
    Agent cards are served at /api/agent_builder/a2a/{agent_id}.json
    and contain standardized metadata about the agent's capabilities.
    """
    if not settings.KIBANA_URL or not settings.ELASTIC_API_KEY:
        return None
    
    url = f"{settings.KIBANA_URL}/api/agent_builder/a2a/{agent_id}.json"
    headers = {
        "Authorization": f"ApiKey {settings.ELASTIC_API_KEY}",
        "Content-Type": "application/json",
    }
    
    try:
        response = requests.get(url, headers=headers, timeout=10)
        if response.status_code == 200:
            return response.json()
        return None
    except requests.exceptions.RequestException:
        return None


def fetch_all_agent_cards() -> List[Dict[str, Any]]:
    """
    Fetch A2A agent cards for all agents.
    
    1. Gets list of agents from /api/agent_builder/agents
    2. Fetches the A2A card for each agent
    3. Returns list of cards (excluding agents without cards)
    """
    if not settings.KIBANA_URL or not settings.ELASTIC_API_KEY:
        return []
    
    url = f"{settings.KIBANA_URL}/api/agent_builder/agents"
    headers = {
        "Authorization": f"ApiKey {settings.ELASTIC_API_KEY}",
        "Content-Type": "application/json",
    }
    
    try:
        response = requests.get(url, headers=headers, timeout=10)
        if response.status_code == 200:
            data = response.json()
            agents = data.get("results", [])
            
            # Fetch agent card for each agent
            agent_cards = []
            for agent in agents:
                agent_id = agent.get("id")
                card = fetch_agent_card(agent_id)
                if card:
                    agent_cards.append(card)
            
            return agent_cards
        return []
    except requests.exceptions.RequestException:
        return []


@router.get("/agents")
async def get_agents():
    """
    Get all agents with A2A agent cards and OpenAI function definitions.
    
    Returns:
    - agents: List of A2A agent cards (standardized format)
    - functions: List of OpenAI function definitions (for LLM)
    """
    try:
        # Fetch agent cards
        agent_cards = fetch_all_agent_cards()
        
        if not agent_cards:
            return {
                "agents": [],
                "functions": [],
                "error": "No agent cards found"
            }
        
        # Build function definitions and add id field to agent cards
        enriched_agents = []
        functions = []
        
        for card in agent_cards:
            # Extract agent ID from URL
            agent_url = card.get("url", "")
            agent_id = agent_url.split("/a2a/")[-1] if "/a2a/" in agent_url else None
            
            # Add id field to agent card
            enriched_card = {**card}
            if agent_id:
                enriched_card["id"] = agent_id
            
            enriched_agents.append(enriched_card)
            functions.append(build_function_from_agent_card(card))
        
        return {
            "agents": enriched_agents,
            "functions": functions
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch agents: {str(e)}"
        )


@router.get("/agents/{agent_id}")
async def get_agent(agent_id: str):
    """Get A2A agent card and function definition for a specific agent."""
    try:
        agent_card = fetch_agent_card(agent_id)
        
        if not agent_card:
            raise HTTPException(
                status_code=404,
                detail=f"Agent {agent_id} not found"
            )
        
        function_def = build_function_from_agent_card(agent_card)
        
        return {
            "agent": agent_card,
            "function": function_def
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch agent: {str(e)}"
        )



