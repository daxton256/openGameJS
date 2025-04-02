from flask import Flask, request, redirect
from simple_websocket import Server, ConnectionClosed
from tinydb import TinyDB, Query
import secrets, json, time, hashlib

app = Flask(__name__)
db = TinyDB('data.json')
world = json.load(open("world.json", "r"))
clientSockets = {}
clientData = {}

def sendToUUIDs(data, uuids):
    for uuid in uuids:
        clientSockets[uuid].send(data)

@app.route('/play', websocket=True)
def play():
    if("rid" in request.environ):
        del request.environ["rid"]
    if("UUID" in request.environ):
        del request.environ["UUID"]
    request.environ["rid"] = secrets.token_hex(16) #Adding a property to differentiate websocket clients
    ws = Server.accept(request.environ)
    try:
        while True:
            data = json.loads(ws.receive())
            #print(data)
            if(data["action"] == "reg_uuid"):
                myUUID = data.get("UUID")
                if(myUUID in clientSockets):
                    ws.send(json.dumps({"action": "error", "status": "You are already on this server!"}))
                    continue 
                #These have to be seperated into two different dictionaries due to serialization issues
                #They could be merged into a singular dictionary, but this would require large amounts of code for every time player data is sent.
                clientSockets[myUUID] = ws 
                mi = {"UUID": myUUID, "position": [0,1,0], "rotation": 0} 
                clientData[myUUID] = mi
                request.environ["UUID"] = myUUID
                ws.send(json.dumps({"action": "ready", "players": [clientData[player] for player in clientData if clientData[player] != mi], "world": world}))
                sendToUUIDs(json.dumps({"action": "join", "data": mi}), [player for player in clientSockets if player != myUUID]) #Alerting all online players of new player join

            if(data["action"] == "transform"):
                if("UUID" in request.environ):
                    myUUID = request.environ["UUID"]
                    clientData[myUUID]["position"] = data.get("position")
                    clientData[myUUID]["rotation"] = data.get("rotation")
                    sendToUUIDs(json.dumps({"action": "transform", "data": clientData[myUUID]}), [player for player in clientSockets if player != myUUID])

            if(data["action"] == "tell"):
                if("UUID" in request.environ):
                    myUUID = request.environ["UUID"]
                    sendToUUIDs(json.dumps({"action": "message", "from": data["from"], "data": data["data"][:250]}), [player for player in clientSockets])
            #ws.send(data)
    except ConnectionClosed:
        if("UUID" in request.environ):
            print("Removing:", request.environ["UUID"])
            del clientSockets[request.environ["UUID"]]
            del clientData[request.environ["UUID"]]
            sendToUUIDs(json.dumps({"action": "left", "UUID": request.environ["UUID"]}), [player for player in clientSockets])
    return ''

@app.route('/')
def home():
    return redirect(code=301, location="/static/play.html")

app.run(host="0.0.0.0")