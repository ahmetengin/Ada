# Ada CAN Parser

A Python library for parsing and working with CAN bus messages using `python-can`.

## Features

- Parse CAN bus messages from various interfaces
- Send and receive CAN messages
- Support for standard and extended CAN IDs
- Context manager support for easy connection management
- Built with modern Python using `uv` package manager

## Requirements

- Python 3.11+
- uv package manager

## Installation

This project uses `uv` for dependency management:

```bash
# Install dependencies
uv sync

# Activate virtual environment
source .venv/bin/activate  # On Linux/macOS
# or
.venv\Scripts\activate  # On Windows
```

## Usage

### Basic Example

```python
from src.ada_parser import CANParser

# Create parser instance
parser = CANParser(interface="socketcan", channel="vcan0", bitrate=500000)

# Use context manager for automatic connection handling
with parser:
    # Send a message
    parser.send_message(
        arbitration_id=0x123,
        data=b'\xDE\xAD\xBE\xEF'
    )

    # Read messages
    messages = parser.read_messages(timeout=5.0, count=10)
    for msg in messages:
        print(msg)
```

### Running the Example

```bash
# Run the example script
uv run python main.py
```

## Setting up Virtual CAN (Linux)

For testing without physical CAN hardware:

```bash
# Load the vcan kernel module
sudo modprobe vcan

# Create a virtual CAN interface
sudo ip link add dev vcan0 type vcan
sudo ip link set up vcan0

# Send test messages
cansend vcan0 123#DEADBEEF
```

## Development

### Adding Dependencies

```bash
uv add <package-name>
```

### Project Structure

```
Ada/
├── src/
│   └── ada_parser/
│       ├── __init__.py
│       └── parser.py
├── main.py
├── pyproject.toml
└── README.md
```

## License

This project is open source.