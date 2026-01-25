import argparse
import time

from pythonosc import osc_server
from pythonosc.dispatcher import Dispatcher
from pythonosc.osc_message_builder import OscMessageBuilder
from pythonosc.udp_client import SimpleUDPClient

# Requires Python >3.10 and python-osc package
# Basic simulation of XR18
# Will broadcast changes if subscribed

values = {}
clients = {}

def broadcast(address, val, skip):
    for k, v in clients.items():
        if k == skip: continue
        if time.time() > v["expiry"]: continue
        else: v["client"].send_message(address, args[0])

def subscribe(client_address: tuple[str, int], address: str, *osc_args: list):
    print(address)
    key = f"{client_address[0]}:{client_address[1]}"
    clients[key] = { "client": SimpleUDPClient(client_address[0], client_address[1]), "expiry": time.time() + 10 }


def save_handler(client_address, address, args, default=0.0):
    print(address, args)
    if args:
        values[address] = args[0]
        print(f"Setting {address} to {args[0]}")
        key = f"{client_address[0]}:{client_address[1]}"
        broadcast(address, args[0], key)

        return (address, args[0])
    else:
        print(f"Reading {address} as {values.get(address, None)}")
        if address in values: 
            return (address, values[address])
        else:
            values[address] = default
            return (address, default)
        
def save_handler_f(client_address, address, *osc_args):
    return save_handler(client_address, address, osc_args, default=0.0)

def save_handler_i(client_address: tuple[str, int], address: str, *osc_args: list):
    return save_handler(client_address, address, osc_args, default=0)


def static_response(response=None):
    def respond(address, *osc_args):
        print(address, osc_args, "->", response)
        if response: return (address, *response)
    return respond


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--ip", default="0.0.0.0", help="The ip to listen on")
    parser.add_argument("--port", type=int, default=10024, help="The port to listen on")
    args = parser.parse_args()

# /xinfo 192.168.1.1 Warwick CU XR18 1.16
# /status active 192.168.1.1 Warwick CU
# /info V0.04 Warwick CU XR18 1.16

    dispatcher = Dispatcher()
    dispatcher.set_default_handler(print)
    dispatcher.map("/status", static_response(["active", args.ip, "WASD XR18"]))
    dispatcher.map("/info", static_response(["V0.04", "WASD XR18", "XR18", "1.16"]))
    dispatcher.map("/xinfo", static_response([args.ip, "WASD XR18", "XR18", "1.16"]))
    dispatcher.map("/xremote", subscribe, needs_reply_address=True)
    dispatcher.map("/dca/*/fader", save_handler_f, needs_reply_address=True)
    dispatcher.map("/ch/*/mix", save_handler_f, needs_reply_address=True)
    dispatcher.map("/ch/*/mix/fader", save_handler_f, needs_reply_address=True)
    dispatcher.map("/ch/*/mix/*/level", save_handler_f, needs_reply_address=True)
    dispatcher.map("/ch/*/mix/on", save_handler_i, needs_reply_address=True)
    dispatcher.map("/-stat/solosw/*", save_handler_i, needs_reply_address=True)
    dispatcher.map("/config/mute/*", save_handler_i, needs_reply_address=True)

    server = osc_server.ThreadingOSCUDPServer((args.ip, args.port), dispatcher)
    print(f"Serving on {server.server_address}")
    server.serve_forever()