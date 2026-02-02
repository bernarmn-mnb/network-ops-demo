"""Local Demo Tools for Agno.

Simple tools for testing the Agno coordinator without external dependencies.
These tools demonstrate that the Agno framework is working correctly.

Usage:
    from app.agno.tools.local import LocalDemoToolkit
    
    agent = Agent(
        model=model,
        tools=[LocalDemoToolkit()],
    )
"""

import random
from datetime import datetime
from agno.tools import tool, Toolkit


# ============================================================================
# Demo Tools
# ============================================================================

@tool(
    name="server_beep",
    description="A simple test tool that returns 'beep!' text to verify the Agno framework is working. "
                "Use this to test server-side tool calling. Does NOT play audio - for actual sound use browser_beep instead."
)
def server_beep() -> str:
    """
    Returns 'beep!' - a simple test to verify tools are working.
    
    Returns:
        The string 'beep!' to confirm tool execution
    """
    return "🔔 beep! (server-side text response)"


@tool(
    name="echo",
    description="Echoes back the provided message. Useful for testing parameter passing."
)
def echo(message: str) -> str:
    """
    Echoes back the provided message.
    
    Args:
        message: The message to echo back
    
    Returns:
        The same message, prefixed with 'Echo:'
    """
    return f"Echo: {message}"


@tool(
    name="get_current_time",
    description="Returns the current date and time. Useful for testing and time-based queries."
)
def get_current_time() -> str:
    """
    Returns the current date and time.
    
    Returns:
        Current datetime as a formatted string
    """
    now = datetime.now()
    return f"Current time: {now.strftime('%Y-%m-%d %H:%M:%S')}"


@tool(
    name="random_number",
    description="Generates a random number between min and max (inclusive). "
                "Defaults to 1-100 if not specified."
)
def random_number(min_val: int = 1, max_val: int = 100) -> str:
    """
    Generates a random number in the specified range.
    
    Args:
        min_val: Minimum value (default: 1)
        max_val: Maximum value (default: 100)
    
    Returns:
        A random number in the range [min_val, max_val]
    """
    num = random.randint(min_val, max_val)
    return f"Random number between {min_val} and {max_val}: {num}"


@tool(
    name="calculator",
    description="Performs basic arithmetic. Operations: add, subtract, multiply, divide."
)
def calculator(a: float, b: float, operation: str = "add") -> str:
    """
    Performs basic arithmetic calculations.
    
    Args:
        a: First number
        b: Second number
        operation: One of 'add', 'subtract', 'multiply', 'divide'
    
    Returns:
        The result of the calculation
    """
    operation = operation.lower()
    
    if operation == "add":
        result = a + b
        symbol = "+"
    elif operation == "subtract":
        result = a - b
        symbol = "-"
    elif operation == "multiply":
        result = a * b
        symbol = "×"
    elif operation == "divide":
        if b == 0:
            return "Error: Division by zero"
        result = a / b
        symbol = "÷"
    else:
        return f"Error: Unknown operation '{operation}'. Use add, subtract, multiply, or divide."
    
    return f"{a} {symbol} {b} = {result}"


# ============================================================================
# Toolkit Class
# ============================================================================

class LocalDemoToolkit(Toolkit):
    """Agno Toolkit for local demo/testing tools.
    
    These tools don't require any external services and are useful for:
    - Verifying the Agno framework is working
    - Testing tool calling functionality
    - Quick demos without Agent Builder dependency
    
    Usage:
        from app.agno.tools.local import LocalDemoToolkit
        
        agent = Agent(
            model=model,
            tools=[LocalDemoToolkit()],
        )
    """
    
    def __init__(self):
        super().__init__(name="local_demo")
        
        # Register all demo tools
        self.register(server_beep)
        self.register(echo)
        self.register(get_current_time)
        self.register(random_number)
        self.register(calculator)
