from flask import Flask, request
from simple_websocket import Server, ConnectionClosed
from tinydb import TinyDB, Query
import secrets, json, time, hashlib

app = Flask(__name__)
db = TinyDB('data.json')
world = json.load(open("world.json", "r"))
clients = {}

def sendToAll(data, condition = lambda c: True):
    for client in clients:
        if(condition(client)):
            clients[client].send(data)

@app.route('/play', websocket=True)
def play():
    if("cid" in request.environ):
        del request.environ["cid"]
    if("clID" in request.environ):
        del request.environ["clID"]
    request.environ["cid"] = secrets.token_hex(16) #Adding a property to differentiate websocket clients
    ws = Server.accept(request.environ)
    try:
        while True:
            data = json.loads(ws.receive())
            print(data)
            if(data["action"] == "reg_clID"):
                clID = data.get("clID")
                for client in clients:
                    if(client["clID"] == clID):
                        ws.send(json.dumps({"action": "error", "status": "You are already on this server!"}))
                        continue 
                
                mi = {"ws": ws, "clID": clID, "position": {"x": 0, "y": 0, "z": 0}, "rotation": 0}
                clients[clID] = mi
                request.environ["clID"] = clID
                sendToAll(json.dumps({"action": "join", "info": mi}))
                ws.send(json.dumps({"action": "info", "players": [clients[client] for client in clients if client != clID], "world": world}))
                


            #ws.send(data)
    except ConnectionClosed:
        if(request.environ["clID"]):
            del clients[request.environ["clID"]]
            print(request.environ["clID"], "Disconnected")
            sendToAll(json.dumps({"action": "leave", "user": request.environ["clID"]}))
    return ''

app.run()