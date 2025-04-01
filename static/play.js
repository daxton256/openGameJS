import * as THREE from 'three';

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 );

const renderer = new THREE.WebGLRenderer();
renderer.setSize( window.innerWidth, window.innerHeight );
renderer.setAnimationLoop( animate );
document.body.appendChild( renderer.domElement );

const light = new THREE.HemisphereLight( 0xffffff, 0x080808, 1 );
scene.add( light );

const socket = new WebSocket("ws://127.0.0.1:5000/play");
const params =  new URLSearchParams(window.location.search);
const resources = {
    "og:cube": new THREE.Mesh(new THREE.BoxGeometry(1,1,1), new THREE.MeshPhongMaterial({ color: 0xffffff }))
}
const players = {}
const keysPressed = {}

function regPlayer(data){
    players[data.UUID] = resources["og:cube"].clone(true);
    let player = players[data.UUID];
    scene.add(player);
    player.position.set(data.position[0], data.position[1], data.position[2]);
    player.rotation.y = data.rotation;
}

socket.addEventListener("open", (event)=>{
    socket.send(JSON.stringify({"action": "reg_uuid", "UUID": params.get('id')}));
});

socket.addEventListener("message", (event) => {
    //console.log("Server:", event.data);
    const msg = JSON.parse(event.data);
    if(msg.action === "ready") {
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

window.addEventListener("keydown", function(event){
    keysPressed[event.key] = true;
});

window.addEventListener("keyup", function(event){
    keysPressed[event.key] = false;
});

