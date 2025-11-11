"""
Ada CLI Formatting Utilities

Provides dual output modes: human-readable and JSON.
"""

import json
from typing import Any, List, Dict, Optional
from datetime import datetime


def format_datetime(dt: Optional[datetime]) -> str:
    """Format datetime for human-readable output."""
    if dt is None:
        return "N/A"
    return dt.strftime("%Y-%m-%d %H:%M:%S")


def serialize_model(obj: Any) -> Dict[str, Any]:
    """Serialize SQLAlchemy model to dict."""
    if obj is None:
        return {}

    result = {}
    for column in obj.__table__.columns:
        value = getattr(obj, column.name)
        if isinstance(value, datetime):
            result[column.name] = value.isoformat()
        else:
            result[column.name] = value

    return result


class OutputFormatter:
    """Handles dual output formatting (human-readable/JSON)."""

    def __init__(self, output_format: str = "human"):
        """
        Initialize formatter.

        Args:
            output_format: 'human' or 'json'
        """
        self.format = output_format

    def output(self, data: Any) -> str:
        """Format data based on output format."""
        if self.format == "json":
            return self._format_json(data)
        else:
            return self._format_human(data)

    def _format_json(self, data: Any) -> str:
        """Format as JSON."""
        if isinstance(data, list):
            return json.dumps([serialize_model(item) for item in data], indent=2)
        elif hasattr(data, '__table__'):  # SQLAlchemy model
            return json.dumps(serialize_model(data), indent=2)
        else:
            return json.dumps(data, indent=2, default=str)

    def _format_human(self, data: Any) -> str:
        """Format for human readability."""
        if isinstance(data, dict):
            return self._format_dict(data)
        elif isinstance(data, list):
            return self._format_list(data)
        elif hasattr(data, '__table__'):  # SQLAlchemy model
            return self._format_model(data)
        else:
            return str(data)

    def _format_dict(self, data: Dict[str, Any], indent: int = 0) -> str:
        """Format dictionary with nested support."""
        lines = []
        prefix = "  " * indent

        for key, value in data.items():
            if isinstance(value, dict):
                lines.append(f"{prefix}{key}:")
                lines.append(self._format_dict(value, indent + 1))
            elif isinstance(value, list) and value and isinstance(value[0], dict):
                lines.append(f"{prefix}{key}:")
                for item in value:
                    lines.append(self._format_dict(item, indent + 1))
                    lines.append("")
            else:
                lines.append(f"{prefix}{key}: {value}")

        return "\n".join(lines)

    def _format_list(self, data: List[Any]) -> str:
        """Format list of items."""
        if not data:
            return "No items found."

        if hasattr(data[0], '__table__'):  # List of models
            return self._format_model_list(data)
        else:
            return "\n\n".join(str(item) for item in data)

    def _format_model(self, model: Any) -> str:
        """Format single SQLAlchemy model."""
        model_name = model.__class__.__name__
        lines = [f"=== {model_name} ==="]

        for column in model.__table__.columns:
            name = column.name
            value = getattr(model, name)

            if isinstance(value, datetime):
                value = format_datetime(value)

            lines.append(f"{name}: {value}")

        # Handle relationships
        for relationship in model.__mapper__.relationships:
            rel_name = relationship.key
            if hasattr(model, rel_name):
                rel_obj = getattr(model, rel_name)
                if rel_obj is not None:
                    if isinstance(rel_obj, list):
                        lines.append(f"\n{rel_name}: [{len(rel_obj)} items]")
                    else:
                        lines.append(f"\n{rel_name}: {rel_obj.__class__.__name__}")

        return "\n".join(lines)

    def _format_model_list(self, models: List[Any]) -> str:
        """Format list of SQLAlchemy models in table format."""
        if not models:
            return "No items found."

        model_name = models[0].__class__.__name__
        lines = [f"=== {len(models)} {model_name}(s) ===\n"]

        # Get column names
        columns = [col.name for col in models[0].__table__.columns]

        # Calculate column widths
        widths = {}
        for col in columns:
            widths[col] = max(
                len(col),
                max(len(str(getattr(model, col))) for model in models)
            )
            # Cap width at 50 characters
            widths[col] = min(widths[col], 50)

        # Header
        header = " | ".join(col.ljust(widths[col]) for col in columns)
        lines.append(header)
        lines.append("-" * len(header))

        # Rows
        for model in models:
            row_parts = []
            for col in columns:
                value = getattr(model, col)

                if isinstance(value, datetime):
                    value = format_datetime(value)

                value_str = str(value)
                if len(value_str) > widths[col]:
                    value_str = value_str[:widths[col]-3] + "..."

                row_parts.append(value_str.ljust(widths[col]))

            lines.append(" | ".join(row_parts))

        return "\n".join(lines)

    def format_health(self, health_data: Dict[str, Any]) -> str:
        """Format health check data."""
        if self.format == "json":
            return json.dumps(health_data, indent=2)

        status = health_data.get("status", "unknown")
        database = health_data.get("database", "unknown")

        lines = ["=== Ada Health Check ==="]
        lines.append(f"Status: {status}")
        lines.append(f"Database: {database}")

        if "counts" in health_data:
            lines.append("\nResource Counts:")
            for resource, count in health_data["counts"].items():
                lines.append(f"  {resource}: {count}")

        if "error" in health_data:
            lines.append(f"\nError: {health_data['error']}")

        return "\n".join(lines)

    def format_stats(self, stats_data: Dict[str, Any]) -> str:
        """Format statistics data."""
        if self.format == "json":
            return json.dumps(stats_data, indent=2, default=str)

        lines = ["=== Ada Database Statistics ===\n"]

        if "totals" in stats_data:
            lines.append("Total Resources:")
            for resource, count in stats_data["totals"].items():
                lines.append(f"  {resource.capitalize()}: {count}")

        if "tenant_breakdown" in stats_data:
            lines.append("\nFleets per Tenant:")
            for tenant_stat in stats_data["tenant_breakdown"]:
                tenant_name = tenant_stat.get("tenant", "Unknown")
                fleet_count = tenant_stat.get("fleet_count", 0)
                lines.append(f"  {tenant_name}: {fleet_count} fleet(s)")

        return "\n".join(lines)

    def format_error(self, error_message: str) -> str:
        """Format error message."""
        if self.format == "json":
            return json.dumps({"error": error_message}, indent=2)
        else:
            return f"❌ Error: {error_message}"

    def format_success(self, message: str, data: Optional[Any] = None) -> str:
        """Format success message."""
        if self.format == "json":
            result = {"success": True, "message": message}
            if data is not None:
                if hasattr(data, '__table__'):
                    result["data"] = serialize_model(data)
                else:
                    result["data"] = data
            return json.dumps(result, indent=2, default=str)
        else:
            lines = [f"✅ {message}"]
            if data is not None:
                lines.append("")
                lines.append(self._format_human(data))
            return "\n".join(lines)
