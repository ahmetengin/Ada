#!/usr/bin/env python3
"""
Event sender utility for Ada Multi-Agent Observability

This module provides a simple function to send observability events
to the observability server.
"""

import json
import sys
from datetime import datetime
from typing import Any, Dict, Optional
from urllib import request
from urllib.error import HTTPError, URLError

OBSERVABILITY_SERVER_URL = "http://localhost:8765/events"


def send_event(
    source_app: str,
    session_id: str,
    event_type: str,
    agent_id: Optional[str] = None,
    agent_type: Optional[str] = None,
    tool_name: Optional[str] = None,
    input_data: Optional[str] = None,
    output_data: Optional[str] = None,
    error: Optional[str] = None,
    metadata: Optional[Dict[str, Any]] = None,
    description: Optional[str] = None,
    server_url: Optional[str] = None,
) -> bool:
    """
    Send an observability event to the server.

    Args:
        source_app: Application identifier (e.g., "ada-sea", "ada-marina")
        session_id: Unique session identifier
        event_type: Type of event (agent_created, message_sent, etc.)
        agent_id: Optional agent identifier
        agent_type: Optional agent type
        tool_name: Optional tool name
        input_data: Optional input data
        output_data: Optional output data
        error: Optional error message
        metadata: Optional metadata dictionary
        description: Optional human-readable description
        server_url: Optional custom server URL

    Returns:
        bool: True if event was sent successfully, False otherwise
    """
    url = server_url or OBSERVABILITY_SERVER_URL

    event = {
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "source_app": source_app,
        "session_id": session_id,
        "event_type": event_type,
    }

    # Add optional fields
    if agent_id:
        event["agent_id"] = agent_id
    if agent_type:
        event["agent_type"] = agent_type
    if tool_name:
        event["tool_name"] = tool_name
    if input_data:
        event["input"] = input_data
    if output_data:
        event["output"] = output_data
    if error:
        event["error"] = error
    if metadata:
        event["metadata"] = metadata
    if description:
        event["description"] = description

    try:
        # Create request
        req = request.Request(
            url,
            data=json.dumps(event).encode("utf-8"),
            headers={"Content-Type": "application/json"},
            method="POST",
        )

        # Send request
        with request.urlopen(req, timeout=5) as response:
            if response.status in (200, 201):
                return True
            else:
                print(
                    f"Warning: Event sent but received status {response.status}",
                    file=sys.stderr,
                )
                return False

    except HTTPError as e:
        print(f"HTTP Error sending event: {e.code} - {e.reason}", file=sys.stderr)
        return False
    except URLError as e:
        print(f"URL Error sending event: {e.reason}", file=sys.stderr)
        return False
    except Exception as e:
        print(f"Error sending event: {e}", file=sys.stderr)
        return False


def send_agent_event(
    agent_id: str,
    agent_type: str,
    session_id: str,
    event_type: str,
    source_app: str = "ada-ecosystem",
    metadata: Optional[Dict[str, Any]] = None,
    description: Optional[str] = None,
) -> bool:
    """
    Convenience function to send agent-specific events.

    Args:
        agent_id: Agent identifier
        agent_type: Agent type (sea, marina, travel, congress)
        session_id: Session identifier
        event_type: Event type (agent_created, agent_started, etc.)
        source_app: Source application name
        metadata: Optional metadata
        description: Optional description

    Returns:
        bool: True if successful
    """
    return send_event(
        source_app=source_app,
        session_id=session_id,
        event_type=event_type,
        agent_id=agent_id,
        agent_type=agent_type,
        metadata=metadata,
        description=description,
    )


def send_communication_event(
    from_agent_id: str,
    to_agent_id: str,
    message_id: str,
    message_type: str,
    session_id: str,
    subject: str,
    source_app: str = "ada-ecosystem",
    metadata: Optional[Dict[str, Any]] = None,
) -> bool:
    """
    Send a communication event between agents.

    Args:
        from_agent_id: Sender agent ID
        to_agent_id: Recipient agent ID
        message_id: Message ID
        message_type: Message type (request, response, notification, etc.)
        session_id: Session ID
        subject: Message subject
        source_app: Source application
        metadata: Optional metadata

    Returns:
        bool: True if successful
    """
    event_metadata = {
        "from_agent": from_agent_id,
        "to_agent": to_agent_id,
        "message_id": message_id,
        "message_type": message_type,
        "subject": subject,
    }

    if metadata:
        event_metadata.update(metadata)

    return send_event(
        source_app=source_app,
        session_id=session_id,
        event_type="message_sent",
        agent_id=from_agent_id,
        metadata=event_metadata,
        description=f"Message from {from_agent_id} to {to_agent_id}: {subject}",
    )


def send_task_event(
    agent_id: str,
    agent_type: str,
    session_id: str,
    task_name: str,
    event_type: str,
    source_app: str = "ada-ecosystem",
    input_data: Optional[str] = None,
    output_data: Optional[str] = None,
    error: Optional[str] = None,
    metadata: Optional[Dict[str, Any]] = None,
) -> bool:
    """
    Send a task execution event.

    Args:
        agent_id: Agent identifier
        agent_type: Agent type
        session_id: Session ID
        task_name: Name of the task
        event_type: Event type (task_started, task_completed, task_failed)
        source_app: Source application
        input_data: Optional task input
        output_data: Optional task output
        error: Optional error message
        metadata: Optional metadata

    Returns:
        bool: True if successful
    """
    task_metadata = {"task_name": task_name}
    if metadata:
        task_metadata.update(metadata)

    return send_event(
        source_app=source_app,
        session_id=session_id,
        event_type=event_type,
        agent_id=agent_id,
        agent_type=agent_type,
        tool_name=task_name,
        input_data=input_data,
        output_data=output_data,
        error=error,
        metadata=task_metadata,
        description=f"Task '{task_name}' {event_type.replace('task_', '')}",
    )


if __name__ == "__main__":
    # Test the event sender
    test_event = send_event(
        source_app="test-app",
        session_id="test-session-123",
        event_type="agent_created",
        agent_id="test-agent-001",
        agent_type="test",
        description="Test event from send_event.py",
        metadata={"test": True},
    )

    if test_event:
        print("✅ Test event sent successfully!")
    else:
        print("❌ Failed to send test event")
        sys.exit(1)
