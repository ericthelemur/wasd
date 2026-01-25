import argparse
import random
import time

from pythonosc import udp_client

if __name__ == "__main__":
    client = udp_client.SimpleUDPClient("127.0.0.1", 10024)

    # for x in range(10):
    client.send_message("/xinfo", [])
    reply = next(client.get_messages(2))
    print(str(reply))
    time.sleep(1)

    client.send_message("/status", [])
    reply = next(client.get_messages(2))
    print(str(reply))
    time.sleep(1)
    
    client.send_message("/info", [])
    reply = next(client.get_messages(2))
    print(str(reply))
    time.sleep(1)
    
    client.send_message("/ch/1/mix/1/level", 0.5)
    reply = next(client.get_messages(2))
    print(str(reply))
    time.sleep(1)
    
    client.send_message("/ch/1/mix/1/level", [])
    reply = next(client.get_messages(2))
    print(str(reply))
    time.sleep(1)

    
# /xinfo 192.168.1.1 Warwick CU XR18 1.16
# /status active 192.168.1.1 Warwick CU
# /info V0.04 Warwick CU XR18 1.16