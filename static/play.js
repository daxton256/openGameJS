import * as THREE from 'three';

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 );

const renderer = new THREE.WebGLRenderer();
renderer.setSize( window.innerWidth, window.innerHeight );
renderer.setAnimationLoop( animate );
document.body.appendChild( renderer.domElement );

const socket = new WebSocket("ws://127.0.0.1:5000/play");
const params =  new URLSearchParams(window.location.search);
const resources = {
    "og:cube": new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshPhongMaterial({ color: 0xffffff }))
}
const players = {}

socket.addEventListener("open", (event)=>{
    socket.send(JSON.stringify({"action": "reg_uuid", "UUID": params.get('id')}));
});

socket.addEventListener("message", (event) => {
    console.log("Server:", event.data);
    const msg = JSON.parse(event.data);
    if(msg.action === "ready") {
        msg.players.forEach(element => {
            players[element.UUID] = resources["og:cube"].clone();
            let player = players[element.UUID];
            scene.add(player);
            player.position.set(element.position[0], element.position[1], element.position[2]);
            player.rotation.z = element.rotation;
        });

        msg.world.objects.forEach(object => {
            let wo = resources[object].clone();
            scene.add(wo);
        });
    }
});

function animate() {
	renderer.render( scene, camera );
}