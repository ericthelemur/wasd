import argparse
import random
import time

from pythonosc import udp_client

if __name__ == "__main__":
    client = udp_client.SimpleUDPClient("127.0.0.1", 10024)

    # for x in range(10):
    client.send_message("/status", [])
    reply = next(client.get_messages(2))
    print(str(reply))
    time.sleep(1)