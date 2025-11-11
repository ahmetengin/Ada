"""CAN message parser for Ada project."""

from dataclasses import dataclass
from typing import Optional, List
import can


@dataclass
class CANMessage:
    """Represents a parsed CAN message."""

    arbitration_id: int
    data: bytes
    timestamp: float
    is_extended_id: bool = False
    is_remote_frame: bool = False
    is_error_frame: bool = False
    channel: Optional[str] = None

    def __str__(self) -> str:
        """Return a human-readable string representation of the CAN message."""
        data_hex = " ".join(f"{b:02X}" for b in self.data)
        return (
            f"ID: 0x{self.arbitration_id:X} | "
            f"Data: [{data_hex}] | "
            f"DLC: {len(self.data)} | "
            f"Timestamp: {self.timestamp:.6f}"
        )


class CANParser:
    """Parser for CAN bus messages."""

    def __init__(self, interface: str = "socketcan", channel: str = "vcan0", bitrate: int = 500000):
        """
        Initialize the CAN parser.

        Args:
            interface: CAN interface type (e.g., 'socketcan', 'pcan', 'vector')
            channel: CAN channel to use (e.g., 'vcan0', 'can0')
            bitrate: CAN bus bitrate in bits per second
        """
        self.interface = interface
        self.channel = channel
        self.bitrate = bitrate
        self.bus: Optional[can.Bus] = None

    def connect(self) -> None:
        """Establish connection to the CAN bus."""
        try:
            self.bus = can.Bus(
                interface=self.interface,
                channel=self.channel,
                bitrate=self.bitrate
            )
            print(f"Connected to {self.interface} on channel {self.channel}")
        except Exception as e:
            raise ConnectionError(f"Failed to connect to CAN bus: {e}")

    def disconnect(self) -> None:
        """Disconnect from the CAN bus."""
        if self.bus:
            self.bus.shutdown()
            self.bus = None
            print("Disconnected from CAN bus")

    def parse_message(self, msg: can.Message) -> CANMessage:
        """
        Parse a raw CAN message into a CANMessage object.

        Args:
            msg: Raw CAN message from python-can

        Returns:
            Parsed CANMessage object
        """
        return CANMessage(
            arbitration_id=msg.arbitration_id,
            data=msg.data,
            timestamp=msg.timestamp,
            is_extended_id=msg.is_extended_id,
            is_remote_frame=msg.is_remote_frame,
            is_error_frame=msg.is_error_frame,
            channel=msg.channel
        )

    def read_messages(self, timeout: float = 1.0, count: Optional[int] = None) -> List[CANMessage]:
        """
        Read CAN messages from the bus.

        Args:
            timeout: Timeout in seconds for reading messages
            count: Number of messages to read (None for continuous reading)

        Returns:
            List of parsed CAN messages
        """
        if not self.bus:
            raise RuntimeError("Not connected to CAN bus. Call connect() first.")

        messages = []

        try:
            if count is None:
                # Read until timeout
                while True:
                    msg = self.bus.recv(timeout=timeout)
                    if msg is None:
                        break
                    messages.append(self.parse_message(msg))
            else:
                # Read specific number of messages
                for _ in range(count):
                    msg = self.bus.recv(timeout=timeout)
                    if msg is None:
                        break
                    messages.append(self.parse_message(msg))
        except KeyboardInterrupt:
            print("\nReading interrupted by user")

        return messages

    def send_message(self, arbitration_id: int, data: bytes, is_extended_id: bool = False) -> None:
        """
        Send a CAN message.

        Args:
            arbitration_id: CAN message ID
            data: Message data (up to 8 bytes for standard CAN)
            is_extended_id: Whether to use extended ID format
        """
        if not self.bus:
            raise RuntimeError("Not connected to CAN bus. Call connect() first.")

        msg = can.Message(
            arbitration_id=arbitration_id,
            data=data,
            is_extended_id=is_extended_id
        )

        try:
            self.bus.send(msg)
            print(f"Sent: {self.parse_message(msg)}")
        except can.CanError as e:
            raise RuntimeError(f"Failed to send message: {e}")

    def __enter__(self):
        """Context manager entry."""
        self.connect()
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        """Context manager exit."""
        self.disconnect()
