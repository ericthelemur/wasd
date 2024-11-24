import argparse
from pythonosc.dispatcher import Dispatcher
from pythonosc import osc_server
from pythonosc.osc_message_builder import OscMessageBuilder

values = {}

def save_handler(address, *args, default=0.0):
    print(address, args)
    if args:
        values[address] = args[0]
        print(f"Setting {address} to {args[0]}")
        return (address, args[0])
    else:
        print(f"Reading {address} as {values.get(address, None)}")
        if address in values: 
            return (address, values[address])
        else:
            values[address] = default
            return (address, default)
        
def save_handler_f(address, *args):
    return save_handler(address, *args, default=0.0)

def save_handler_i(address, *args):
    return save_handler(address, *args, default=0)


def status(address, *osc_args):
    return address, "active", "192.168.1.1", "UWCS-XR18"

def nothing(unused_addr, *args):
    pass
    # print("NOTHING", unused_addr, args)
    # return (unused_addr, 0)

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--ip", default="0.0.0.0", help="The ip to listen on")
    parser.add_argument("--port", type=int, default=5005, help="The port to listen on")
    args = parser.parse_args()

    dispatcher = Dispatcher()
    dispatcher.set_default_handler(print)
    dispatcher.map("/status", status)
    dispatcher.map("/xremote", nothing)
    dispatcher.map("/dca/*/fader", save_handler_f)
    dispatcher.map("/ch/*/mix/*/level", save_handler_f)
    dispatcher.map("/ch/*/mix/on", save_handler_i)

    server = osc_server.ThreadingOSCUDPServer((args.ip, args.port), dispatcher)
    print(f"Serving on {server.server_address}")
    server.serve_forever()