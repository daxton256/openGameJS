import * as THREE from 'three';

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 );

const renderer = new THREE.WebGLRenderer();
renderer.setSize( window.innerWidth, window.innerHeight );
renderer.setAnimationLoop( animate );
document.body.appendChild( renderer.domElement );

const socket = new WebSocket("ws://127.0.0.1:5000/play");

socket.addEventListener("open", (event)=>{
    socket.send(JSON.stringify({"action": "reg_clID", "clID": "48fd3742-2236-44c4-a9a5-417f01ab6948"}));
});

socket.addEventListener("message", (event) => {
    console.log("Server:", event.data);
});

function animate() {
	renderer.render( scene, camera );
}