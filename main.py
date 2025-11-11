#!/usr/bin/env python3
"""Example usage of the Ada CAN Parser."""

import sys
sys.path.insert(0, 'src')

from ada_parser import CANParser


def example_virtual_can():
    """
    Example using a virtual CAN interface (vcan0).

    To set up a virtual CAN interface on Linux:
        sudo modprobe vcan
        sudo ip link add dev vcan0 type vcan
        sudo ip link set up vcan0
    """
    print("=== Ada CAN Parser Example ===\n")

    # Create parser instance
    parser = CANParser(interface="socketcan", channel="vcan0", bitrate=500000)

    print("Note: This example requires a virtual CAN interface (vcan0).")
    print("To test, you can send messages from another terminal using:")
    print("  cansend vcan0 123#DEADBEEF\n")

    try:
        # Use context manager for automatic connect/disconnect
        with parser:
            print("Listening for CAN messages (Ctrl+C to stop)...\n")

            # Option 1: Send a test message
            parser.send_message(
                arbitration_id=0x123,
                data=b'\xDE\xAD\xBE\xEF',
                is_extended_id=False
            )

            # Option 2: Read messages
            messages = parser.read_messages(timeout=5.0, count=10)

            if messages:
                print(f"\nReceived {len(messages)} messages:")
                for msg in messages:
                    print(f"  {msg}")
            else:
                print("\nNo messages received within timeout period.")

    except ConnectionError as e:
        print(f"Connection error: {e}")
        print("\nMake sure the CAN interface is available and properly configured.")
    except KeyboardInterrupt:
        print("\nStopped by user")
    except Exception as e:
        print(f"Error: {e}")


def main():
    """Main entry point."""
    example_virtual_can()


if __name__ == "__main__":
    main()
