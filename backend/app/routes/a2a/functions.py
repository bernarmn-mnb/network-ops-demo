"""
A2A Function Definition Builders

Converts A2A agent cards to OpenAI function calling format.
This allows the coordinator LLM to understand what agents are available
and call them with appropriate parameters.

LLM Documentation:
- build_function_from_agent_card: Convert agent card to OpenAI function
- extract_agent_id_from_function_name: Get agent ID from function name
"""

from typing import Dict, Any, Optional


def build_function_from_agent_card(agent_card: Dict[str, Any]) -> Dict[str, Any]:
    """
    Build OpenAI function definition from A2A agent card.
    
    The function name follows the pattern: call_agent_{agent_id}
    where dashes are converted to underscores for compatibility.
    
    The description combines the agent's description with its
    available skills/tools to help the LLM understand capabilities.
    """
    agent_name = agent_card.get("name", "Unknown Agent")
    agent_description = agent_card.get("description", "")
    
    # Extract skills/tools information
    skills = agent_card.get("skills", [])
    
    # Build tools description
    tools_description = ""
    if skills:
        tools_description = "\n\nAvailable tools/skills:\n"
        for skill in skills:
            skill_name = skill.get("name", skill.get("id", ""))
            skill_desc = skill.get("description", "")
            # Truncate very long descriptions
            if len(skill_desc) > 200:
                skill_desc = skill_desc[:197] + "..."
            tools_description += f"- {skill_name}: {skill_desc}\n"
    
    # Combine agent description with tools
    full_description = agent_description + tools_description
    
    # Extract agent ID from URL
    agent_url = agent_card.get("url", "")
    # URL format: .../api/agent_builder/a2a/{agent_id}
    agent_id = agent_url.split("/a2a/")[-1] if "/a2a/" in agent_url else "unknown"
    
    return {
        "name": f"call_agent_{agent_id.replace('-', '_')}",
        "description": full_description.strip(),
        "parameters": {
            "type": "object",
            "properties": {
                "input": {
                    "type": "string",
                    "description": f"User message or query to send to {agent_name}. The agent has access to the tools listed above and will use them as needed."
                }
            },
            "required": ["input"]
        }
    }


def extract_agent_id_from_function_name(function_name: str) -> Optional[str]:
    """
    Extract agent ID from function name.
    
    Function names follow pattern: call_agent_{agent_id_with_underscores}
    Agent IDs use dashes, so we convert underscores back to dashes.
    
    Example: call_agent_meal_planner -> meal-planner
    """
    if function_name.startswith("call_agent_"):
        agent_id = function_name.replace("call_agent_", "").replace("_", "-")
        return agent_id
    return None

