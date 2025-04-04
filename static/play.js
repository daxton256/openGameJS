import * as THREE from 'three';

const params =  new URLSearchParams(window.location.search);
if(params.id !== null){
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 );

    const renderer = new THREE.WebGLRenderer();
    renderer.setSize( window.innerWidth, window.innerHeight );
    renderer.setAnimationLoop( animate );
    document.body.appendChild( renderer.domElement );
    const light = new THREE.HemisphereLight( 0xffffff, 0x080808, 1 );
    scene.add( light );

    const wsURL = (window.location.protocol === "http:" ? "ws:" : "wss:") + '//' + window.location.host + "/play";
    const socket = new WebSocket(wsURL);
    const resources = {
        "og:cube": new THREE.Mesh(new THREE.BoxGeometry(1,1,1), new THREE.MeshPhongMaterial({ color: 0xffffff }))
    }
    const players = {}
    const keysPressed = {}

    function newText(text) {
        const canvas = document.createElement("canvas");
        canvas.width = 256;
        canvas.height = 64;
        const ctx = canvas.getContext("2d");
        ctx.fillStyle = "white";
        ctx.font = "32px Arial";
        ctx.fillText(text,0,32);
        const cvTexture = new THREE.CanvasTexture(canvas);
        const labelObj = new THREE.Sprite(new THREE.SpriteMaterial({map: cvTexture}));
        canvas.remove();
        return labelObj;
    }

    function renderChatMsg(from, message, color="white") {
        let chats = document.querySelector(".messages");
        let chatitm = document.createElement("p");
        chatitm.style.color = color;
        chatitm.innerText = `[${from}]: ${message}`;
        chats.appendChild(chatitm);
        chats.scrollTop = chats.scrollHeight;
    }


    function regPlayer(data){
        const group = new THREE.Group();
        group.add(resources["og:cube"].clone(true));

        let gamerTag = newText(data.UUID);
        group.add(gamerTag);
        gamerTag.position.set(0,1,0);
        gamerTag.scale.set(3,1,1);

        scene.add(group);
        group.position.set(data.position[0], data.position[1], data.position[2]);
        group.rotation.y = data.rotation;
        players[data.UUID] = group;
    }

    socket.addEventListener("open", (event)=>{
        socket.send(JSON.stringify({"action": "reg_uuid", "UUID": params.get('id')}));
        document.querySelector(".chatInp").addEventListener("keydown", function(event){
            if(event.key == "Enter") {
                socket.send(JSON.stringify({"action": "tell", "from": params.get('id'), "data": event.target.value}))
                event.target.value = "";
            }
        });
    });

    socket.addEventListener("message", (event) => {
        //console.log("Server:", event.data);
        const msg = JSON.parse(event.data);
        if(msg.action === "ready") {
            renderChatMsg("Game", "Welcome to the server!", "yellow");
            msg.players.forEach(element => {
                regPlayer(element);
            });

            msg.world.objects.forEach(object => {
                console.log(object);
                let wo = resources[object.reference].clone(true);
                scene.add(wo);
                wo.position.set(object.position[0], object.position[1], object.position[2]);
                wo.rotation.set(object.rotation[0], object.rotation[1], object.rotation[2]);
                wo.scale.set(object.scale[0], object.scale[1], object.scale[2]);
                console.log(wo.scale);
            });
        }

        if(msg.action === "join") {
            regPlayer(msg.data);
            renderChatMsg("System", `${msg.data.UUID} has joined the game.`, "yellow");
        }

        if(msg.action === "transform") {
            players[msg.data.UUID].position.set(msg.data.position[0], msg.data.position[1], msg.data.position[2]);
            players[msg.data.UUID].rotation.y = msg.data.rotation;
        }
        if(msg.action === "left") {
            if(players[msg.UUID]) {
                scene.remove(players[msg.UUID]);
                delete players[msg.UUID];
            }
            renderChatMsg("System", `${msg.UUID} has left the game.`, "yellow");
        }
        if(msg.action === "message") {
            renderChatMsg(msg.from, msg.data, (msg.isSystem ? "yellow" : "white"));
        }
    });

    //scene.add(resources["og:cube"].clone(true));

    camera.position.y = 1;

    function animate() {
        let moved = false;

        if(keysPressed["s"]){
            camera.translateZ(0.1);
            moved = true;
        }
        if(keysPressed["w"]){
            camera.translateZ(-0.1);
            moved = true;
        }
        if(keysPressed["a"]){
            camera.rotation.y += 0.05;
            moved = true;
        }
        if(keysPressed["d"]){
            camera.rotation.y  -= 0.05;
            moved = true;
        }

        if(moved) {
            socket.send(JSON.stringify({"action": "transform", "position": [camera.position.x, camera.position.y, camera.position.z], "rotation": camera.rotation.y}));
            moved = false;
        }

        renderer.render( scene, camera );
    }

    renderer.domElement.setAttribute('tabindex', '0'); 
    renderer.domElement.addEventListener("keydown", function(event){
        keysPressed[event.key] = true;
    });

    renderer.domElement.addEventListener("keyup", function(event){
        keysPressed[event.key] = false;
    });

} else {
    alert("INVALID NAME / ID");
}
