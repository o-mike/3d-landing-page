import './style.css';
import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';

// Scene setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x2a2a2a);
scene.fog = new THREE.Fog(0x2a2a2a, 30, 60);

// Camera setup
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.set(0, 1.7, 8); // Eye level height

// Renderer setup
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

// Lighting - Ex Machina inspired (warm ambient + strategic spotlights)
const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
scene.add(ambientLight);

// Main overhead light
const mainLight = new THREE.DirectionalLight(0xffffff, 1.2);
mainLight.position.set(5, 10, 5);
mainLight.castShadow = true;
mainLight.shadow.mapSize.width = 2048;
mainLight.shadow.mapSize.height = 2048;
mainLight.shadow.camera.left = -20;
mainLight.shadow.camera.right = 20;
mainLight.shadow.camera.top = 20;
mainLight.shadow.camera.bottom = -20;
scene.add(mainLight);

// Accent lights for zones
const gameCornerLight = new THREE.PointLight(0x00ffff, 2, 15);
gameCornerLight.position.set(-8, 2, -8);
scene.add(gameCornerLight);

const cvCornerLight = new THREE.PointLight(0xffaa00, 2, 15);
cvCornerLight.position.set(8, 2, -8);
scene.add(cvCornerLight);

// Floor - concrete texture feel
const floorGeometry = new THREE.PlaneGeometry(30, 30);
const floorMaterial = new THREE.MeshStandardMaterial({
  color: 0x606060,
  roughness: 0.8,
  metalness: 0.2,
});
const floor = new THREE.Mesh(floorGeometry, floorMaterial);
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
scene.add(floor);

// Walls - clean, minimalist glass/concrete
const wallMaterial = new THREE.MeshStandardMaterial({
  color: 0x808080,
  roughness: 0.7,
  metalness: 0.1,
});

const glassMaterial = new THREE.MeshPhysicalMaterial({
  color: 0xffffff,
  metalness: 0,
  roughness: 0.1,
  transmission: 0.9,
  thickness: 0.5,
});

// Back wall
const backWall = new THREE.Mesh(
  new THREE.BoxGeometry(30, 5, 0.2),
  wallMaterial
);
backWall.position.set(0, 2.5, -15);
backWall.receiveShadow = true;
backWall.castShadow = true;
scene.add(backWall);

// Left wall (glass)
const leftWall = new THREE.Mesh(
  new THREE.BoxGeometry(0.2, 5, 30),
  glassMaterial
);
leftWall.position.set(-15, 2.5, 0);
leftWall.receiveShadow = true;
scene.add(leftWall);

// Right wall (glass)
const rightWall = new THREE.Mesh(
  new THREE.BoxGeometry(0.2, 5, 30),
  glassMaterial
);
rightWall.position.set(15, 2.5, 0);
rightWall.receiveShadow = true;
scene.add(rightWall);

// Interactive zones
const zones = [];

// Retro Game Corner - left back corner
const gameZone = createZone(
  -8, 1.5, -8,
  0x00ffff,
  'RETRO GAMES',
  '🕹️'
);
scene.add(gameZone.group);
zones.push({ ...gameZone, name: 'Retro Game Corner' });

// CV Corner - right back corner
const cvZone = createZone(
  8, 1.5, -8,
  0xffaa00,
  'MY CV',
  '📄'
);
scene.add(cvZone.group);
zones.push({ ...cvZone, name: 'CV & Experience' });

// Helper function to create interactive zones
function createZone(x, y, z, color, label, emoji) {
  const group = new THREE.Group();
  group.position.set(x, y, z);

  // Platform/pedestal
  const platformGeometry = new THREE.BoxGeometry(2, 0.2, 2);
  const platformMaterial = new THREE.MeshStandardMaterial({
    color: color,
    emissive: color,
    emissiveIntensity: 0.3,
    roughness: 0.4,
    metalness: 0.6,
  });
  const platform = new THREE.Mesh(platformGeometry, platformMaterial);
  platform.position.y = -0.5;
  platform.castShadow = true;
  platform.receiveShadow = true;
  group.add(platform);

  // Floating display box
  const boxGeometry = new THREE.BoxGeometry(1.5, 1.5, 1.5);
  const boxMaterial = new THREE.MeshStandardMaterial({
    color: 0x2a2a2a,
    emissive: color,
    emissiveIntensity: 0.2,
    roughness: 0.3,
    metalness: 0.7,
  });
  const box = new THREE.Mesh(boxGeometry, boxMaterial);
  box.castShadow = true;
  group.add(box);

  // Edge glow
  const edgesGeometry = new THREE.EdgesGeometry(boxGeometry);
  const edgesMaterial = new THREE.LineBasicMaterial({ color: color });
  const edges = new THREE.LineSegments(edgesGeometry, edgesMaterial);
  group.add(edges);

  return {
    group,
    position: new THREE.Vector3(x, y, z),
    label,
    emoji,
    box,
    edges
  };
}

// Pointer Lock Controls for first-person movement
const controls = new PointerLockControls(camera, document.body);

const blocker = document.getElementById('blocker');
const instructions = document.getElementById('instructions');

instructions.addEventListener('click', function () {
  controls.lock();
});

controls.addEventListener('lock', function () {
  blocker.classList.add('hidden');
});

controls.addEventListener('unlock', function () {
  blocker.classList.remove('hidden');
});

// No need to add controls to scene - camera is already there
scene.add(camera);

// Movement state
const moveState = {
  forward: false,
  backward: false,
  left: false,
  right: false,
  sliding: false,
  jumping: false,
};

const velocity = new THREE.Vector3();
const direction = new THREE.Vector3();
let currentSlideSpeed = 0; // Current slide momentum
const verticalVelocity = 0;
let currentVerticalVelocity = 0;
const moveSpeed = 15.0;
const slideSpeed = 30.0; // Faster than walking (ULTRAKILL-style)
const slideDecay = 8.0; // How quickly slide momentum fades
const jumpForce = 8.0;
const gravity = 20.0;
const normalCameraHeight = 1.7;
const slideCameraHeight = 1.0; // Crouch height
let currentCameraHeight = normalCameraHeight;
let isGrounded = true;
let canDoubleJump = false; // Can use double jump after first jump
let currentRoom = 'main'; // Track which room player is in

// Keyboard controls
document.addEventListener('keydown', (event) => {
  switch (event.code) {
    case 'KeyW':
    case 'ArrowUp':
      moveState.forward = true;
      break;
    case 'KeyS':
    case 'ArrowDown':
      moveState.backward = true;
      break;
    case 'KeyA':
    case 'ArrowLeft':
      moveState.left = true;
      break;
    case 'KeyD':
    case 'ArrowRight':
      moveState.right = true;
      break;
    case 'KeyC':
      // Hold to slide
      if (!moveState.sliding && controls.isLocked && isGrounded) {
        moveState.sliding = true;
        // Slide moves you forward in the direction you're looking
        // Store the slide speed - we'll use controls.moveForward() in the update loop
      }
      break;
    case 'Space':
      // Jump (with double jump support)
      if (controls.isLocked) {
        if (isGrounded) {
          // First jump from ground
          currentVerticalVelocity = jumpForce;
          isGrounded = false;
          canDoubleJump = true; // Enable double jump
        } else if (canDoubleJump) {
          // Double jump in air
          currentVerticalVelocity = jumpForce;
          canDoubleJump = false; // Used double jump
        }
      }
      break;
  }
});

document.addEventListener('keyup', (event) => {
  switch (event.code) {
    case 'KeyW':
    case 'ArrowUp':
      moveState.forward = false;
      break;
    case 'KeyS':
    case 'ArrowDown':
      moveState.backward = false;
      break;
    case 'KeyA':
    case 'ArrowLeft':
      moveState.left = false;
      break;
    case 'KeyD':
    case 'ArrowRight':
      moveState.right = false;
      break;
    case 'KeyC':
      // Stop sliding when C is released
      moveState.sliding = false;
      currentSlideSpeed = 0;
      break;
  }
});

// Zone detection UI
const zoneLabel = document.createElement('div');
zoneLabel.className = 'zone-label';
document.body.appendChild(zoneLabel);

let currentZone = null;

// Animation loop
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);

  const delta = clock.getDelta();

  // Update movement
  if (controls.isLocked) {
    // Handle vertical movement (jumping/gravity)
    if (!isGrounded) {
      currentVerticalVelocity -= gravity * delta;
      camera.position.y += currentVerticalVelocity * delta;

      // Ground check
      if (camera.position.y <= currentCameraHeight) {
        camera.position.y = currentCameraHeight;
        currentVerticalVelocity = 0;
        isGrounded = true;
        canDoubleJump = false; // Reset double jump on landing
      }
    }

    // Handle sliding
    if (moveState.sliding && isGrounded) {
      // Start slide at full speed if just initiated
      if (currentSlideSpeed === 0) {
        currentSlideSpeed = slideSpeed;
      }

      // Decay slide speed over time
      currentSlideSpeed -= currentSlideSpeed * slideDecay * delta;

      // Move forward at slide speed (in camera look direction)
      controls.moveForward(-currentSlideSpeed * delta);

      // Smoothly lower camera when sliding
      currentCameraHeight += (slideCameraHeight - currentCameraHeight) * 10.0 * delta;
    } else if (!isGrounded) {
      // In air - maintain momentum from last movement
      if (currentSlideSpeed > 0.5) {
        // Carry slide momentum in air
        controls.moveForward(-currentSlideSpeed * delta);
        // Slight air friction
        currentSlideSpeed -= currentSlideSpeed * 2.0 * delta;
      } else {
        // Carry walk momentum in air
        controls.moveRight(-velocity.x * delta);
        controls.moveForward(-velocity.z * delta);
        // Slight air friction
        velocity.x -= velocity.x * 2.0 * delta;
        velocity.z -= velocity.z * 2.0 * delta;
      }
    } else {
      // Normal ground movement
      velocity.x -= velocity.x * 10.0 * delta;
      velocity.z -= velocity.z * 10.0 * delta;

      direction.z = Number(moveState.forward) - Number(moveState.backward);
      direction.x = Number(moveState.right) - Number(moveState.left);
      direction.normalize();

      if (moveState.forward || moveState.backward) {
        velocity.z -= direction.z * moveSpeed * delta;
      }
      if (moveState.left || moveState.right) {
        velocity.x -= direction.x * moveSpeed * delta;
      }

      controls.moveRight(-velocity.x * delta);
      controls.moveForward(-velocity.z * delta);

      // Smoothly raise camera when not sliding
      currentCameraHeight += (normalCameraHeight - currentCameraHeight) * 10.0 * delta;
    }

    // Boundary checking (keep player inside the room)
    const pos = camera.position;
    pos.x = Math.max(-14, Math.min(14, pos.x));
    pos.z = Math.max(-14, Math.min(14, pos.z));
  }

  // Animate zone boxes (rotation)
  zones.forEach(zone => {
    zone.box.rotation.y += 0.01;
    zone.edges.rotation.y += 0.01;
    zone.box.rotation.x = Math.sin(Date.now() * 0.001) * 0.1;
  });

  // Animate zone lights (pulsing)
  gameCornerLight.intensity = 1 + Math.sin(Date.now() * 0.002) * 0.3;
  cvCornerLight.intensity = 1 + Math.sin(Date.now() * 0.002 + Math.PI) * 0.3;

  // Check proximity to zones
  checkZoneProximity();

  renderer.render(scene, camera);
}

function checkZoneProximity() {
  const playerPos = camera.position;
  let nearZone = null;

  zones.forEach(zone => {
    const distance = playerPos.distanceTo(zone.position);
    if (distance < 3) {
      nearZone = zone;
    }
  });

  if (nearZone && nearZone !== currentZone) {
    currentZone = nearZone;
    zoneLabel.textContent = `${nearZone.emoji} ${nearZone.name}`;
    zoneLabel.classList.add('visible');
  } else if (!nearZone && currentZone) {
    currentZone = null;
    zoneLabel.classList.remove('visible');
  }
}

// Handle window resize
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Start animation
animate();
