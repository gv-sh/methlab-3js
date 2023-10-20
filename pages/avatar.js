import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { config } from '../config.js';
import { isPointInsidePolygon } from '../utils/math.js';

export class Avatar {
	constructor(sceneName, followCam, sceneRef, animationCallback, collidableObjects = null, orbitControls = null) {
		this.sceneName = sceneName;
		this.model = null;
		this.skeleton = null;
		this.loader = new GLTFLoader();
		this.followCam = followCam;
		this.modelPath = config.avatar.modelPath;
		this.scene = sceneRef;
		this.actions = null;
		this.animations = null;
		this.mixer = null;
		this.idleAction = null;
		this.walkAction = null;
		this.runAction = null;
		this.animationCallback = animationCallback;
		this.followCamOffset = config.followCamOffset;
		this.sceneConfig = config.scenes.find((scene) => { return scene.name === sceneName; });
		this.walkableRegion = this.sceneConfig.walkableRegion;
		this.boundingBox = null;
		this.collidableObjects = collidableObjects;
		this.orbitControls = orbitControls;
		this.interactiveRegion = this.sceneConfig.interactiveRegion;
		this.maxSpeed = 0.01; // or whatever maximum speed you find appropriate
		this.acceleration = 0.0001; // acceleration rate
		this.deceleration = 0.0005; // deceleration rate, typically higher than acceleration for a more dynamic feel
		this.velocity = 0; // current velocity, changes over time
		this.emptyNode = new THREE.Object3D();

		this.keysPressed = {
			'w': false,
			'a': false,
			's': false,
			'd': false
		};

		// Set the limits to orbit controls
		if (this.orbitControls) {
			this.orbitControls.minDistance = config.avatar.orbitControls.minDistance;
			this.orbitControls.maxDistance = config.avatar.orbitControls.maxDistance;
		}

		// Set the limits to vertical orbit controls to avoid the camera going underground or above the avatar
		if (this.orbitControls) {
			this.orbitControls.minPolarAngle = config.avatar.orbitControls.minPolarAngle;
			this.orbitControls.maxPolarAngle = config.avatar.orbitControls.maxPolarAngle;
		}

		// Add walking sound 
		this.listener = new THREE.AudioListener();
		this.followCam.add(this.listener);
		this.sound = new THREE.Audio(this.listener);
		this.audioLoader = new THREE.AudioLoader();

		this.audioLoader.load(config.avatar.walkingSound, (buffer) => {
			this.sound.setBuffer(buffer);
			this.sound.setLoop(true);
			this.sound.setVolume(config.avatar.walkingSoundVolume);
		}
		);
	}
	load() {
		const dracoLoader = new DRACOLoader();
		dracoLoader.setDecoderPath('../draco/');
		this.loader.setDRACOLoader(dracoLoader);

		this.loader.load(this.modelPath, (gltf) => {

			if (gltf) {
				this.model = gltf.scene;
			} else {
				console.error('Error: gltf is undefined');
			}

			this.boundingBox = new THREE.Box3().setFromObject(this.model);
			this.emptyNode.position.copy(this.boundingBox.getCenter(new THREE.Vector3()));

			// Rotate the avatar 180 degrees
			this.model.rotateY(Math.PI);

			this.scene.add(this.model);

			// Add the empty node to the scene
			this.scene.add(this.emptyNode);

			// this.model.visible = config.avatar.visible;

			// Set model to cast shadows
			this.model.traverse(function (object) {
				if (object.isMesh) object.castShadow = true;
			});

			if (this.followCamOffset !== null) {
				// Set the camera position behind the model
				this.followCam.position.x = this.model.position.x;
				this.followCam.position.y = this.model.position.y;
				this.followCam.position.z = this.model.position.z + 5;
			}

			if (config.avatar.skeletonHelper) {
				this.skeleton = new THREE.SkeletonHelper(this.model);
				this.skeleton.visible = true;
				this.scene.add(this.skeleton);
			}

			// Create an array to hold vertex coordinates
			let verticesArray = [];

			this.walkableRegion.vertices.forEach((vertex) => {
				verticesArray.push(vertex.x, 0.5, vertex.z);
			});

			const walkableRegion = new THREE.BufferGeometry();
			walkableRegion.setAttribute('position', new THREE.Float32BufferAttribute(verticesArray, 3));

			const walkableRegionMaterial = new THREE.LineBasicMaterial({ color: this.sceneConfig.walkableRegion.color });
			const walkableRegionLines = new THREE.Line(walkableRegion, walkableRegionMaterial);

			this.scene.add(walkableRegionLines);

			walkableRegionLines.visible = this.sceneConfig.walkableRegion.visible;

			// Create an array to hold vertex coordinates
			let verticesArray2 = [];

			this.interactiveRegion.vertices.forEach((vertex) => {
				verticesArray2.push(vertex.x, 0.5, vertex.z);
			});

			const interactiveRegion = new THREE.BufferGeometry();
			interactiveRegion.setAttribute('position', new THREE.Float32BufferAttribute(verticesArray2, 3));

			const interactiveRegionMaterial = new THREE.LineBasicMaterial({ color: this.sceneConfig.interactiveRegion.color });

			const interactiveRegionLines = new THREE.Line(interactiveRegion, interactiveRegionMaterial);

			this.scene.add(interactiveRegionLines);

			interactiveRegionLines.visible = this.sceneConfig.interactiveRegion.visible;

			this.animations = gltf.animations;

			this.mixer = new THREE.AnimationMixer(this.model);

			this.idleAction = this.mixer.clipAction(this.animations[config.avatar.animations.idle]);
			this.walkAction = this.mixer.clipAction(this.animations[config.avatar.animations.walk]);
			// this.runAction = this.mixer.clipAction(this.animations[config.avatar.animations.run]);

			this.actions = [this.idleAction, this.walkAction];

			this.actions[0].play();

			this.updateCamera();

			this.animationCallback();

		});
	}

	moveForwardOld() {
		// Create a model clone 
		const modelClone = this.model.clone();
		// Translate the clone forward
		modelClone.translateZ(-config.avatar.speed);

		// Get vertices in this format [{x: 1, y: 2}, {x: 3, y: 4}, ...]
		const vertices = this.walkableRegion.vertices.map((vertex) => {
			return { x: vertex.x, y: vertex.z };
		});

		if (this.isInTheInteractiveRegion()) {
			console.log('You are in the interactive region');
		}

		// Check if the clone is inside the safe region
		if (isPointInsidePolygon(
			{ x: modelClone.position.x, y: modelClone.position.z },
			vertices
		)) {
			let collisionDistance = 1;
			this.raycaster = new THREE.Raycaster();

			const direction = new THREE.Vector3(0, 0, -1).applyQuaternion(this.model.quaternion);
			this.raycaster.set(this.model.position, direction);

			const intersections = this.raycaster.intersectObjects(this.collidableObjects);

			if (intersections.length > 0 && intersections[0].distance < collisionDistance) {
				console.log('Collision detected');
				return; // Don't move the avatar forward
			}

			// If so, move the model forward
			this.model.translateZ(-config.avatar.speed);
		}

		// this.model.translateZ(-config.avatar.speed);
		this.updateCamera();
	}

	moveBackwardOld() {
		// Create a model clone 
		const modelClone = this.model.clone();
		// Translate the clone forward
		modelClone.translateZ(config.avatar.speed);

		// Get vertices in this format [{x: 1, y: 2}, {x: 3, y: 4}, ...]
		const vertices = this.walkableRegion.vertices.map((vertex) => {
			return { x: vertex.x, y: vertex.z };
		});

		// Check if the clone is inside the safe region
		if (isPointInsidePolygon(
			{ x: modelClone.position.x, y: modelClone.position.z },
			vertices
		)) {
			let collisionDistance = 1;
			this.raycaster = new THREE.Raycaster();

			const direction = new THREE.Vector3(0, 0, -1).applyQuaternion(this.model.quaternion);
			this.raycaster.set(this.model.position, direction);

			const intersections = this.raycaster.intersectObjects(this.collidableObjects);

			if (intersections.length > 0 && intersections[0].distance < collisionDistance) {
				console.log('Collision detected');
				return; // Don't move the avatar forward
			}

			// If so, move the model forward
			this.model.translateZ(config.avatar.speed);
		}

		// this.model.translateZ(-config.avatar.speed);
		this.updateCamera();
	}

	isWalking() {
		return this.actions[1].isRunning();
	}
	toggleWalking(state) {
		if (state) {
			this.actions[0].stop();
			this.actions[1].play();
		} else {
			this.actions[1].stop();
			this.actions[0].play();
		}
	}


	turnLeft() {
		this.model.rotateY(config.avatar.turnSpeed);
		this.updateCamera();
	}
	turnRight() {
		this.model.rotateY(-config.avatar.turnSpeed);
		this.updateCamera();
	}
	turnBack() {
		this.model.rotateY(Math.PI);
		this.updateCamera();
	}

	updateCameraOld() {
		// 1. Get the offset from the avatar's position.
		// Note: The z-value is negative to position the camera behind the avatar.
		const offset = new THREE.Vector3(0, this.followCamOffset.y, -this.followCamOffset.z);

		// 2. Adjust the offset based on the avatar's orientation
		offset.applyQuaternion(this.model.quaternion);

		// 3. Set the camera's position to the adjusted offset
		this.followCam.position.copy(this.model.position).add(offset);

		// 4. Compute the bounding box of the model
		const boundingBox = new THREE.Box3().setFromObject(this.model);

		// 5. Get the center of this bounding box
		const center = new THREE.Vector3();

		boundingBox.getCenter(center);

		// Slightly look at the bottom of the avatar
		center.y = center.y + 0.75;

		// 6. Make the camera look at the center of the avatar
		this.followCam.lookAt(center);

		// Move the orbit controls to the new position
		if (this.orbitControls) {
			this.orbitControls.target.copy(center);
		}
	}
	
	updateCamera() {
		// Compute the bounding box of the model to find its center (used for "lookAt" later).
		const boundingBox = new THREE.Box3().setFromObject(this.model);
		const center = new THREE.Vector3();
		boundingBox.getCenter(center);
	
		// Slightly adjust the center point, so the camera looks slightly downward.
		center.y += 0.75;
	
		// Now, we handle the camera positioning.
		// We want the camera to maintain its relative position to the model (like it's following from behind at a fixed distance).
		// However, we don't want it to rotate when the model turns; we only want it to follow the model's position.
	
		// First, calculate the desired camera position based on the avatar's position.
		const desiredCameraPosition = new THREE.Vector3(
			this.emptyNode.position.x, 
			this.emptyNode.position.y + this.followCamOffset.y,  // Keeping the camera at an elevation relative to the avatar
			this.emptyNode.position.z + this.followCamOffset.z  // Keeping the camera at a fixed distance behind the avatar
		);

		// Rotate the avatar by 90
		// this.model.rotateY(Math.PI);
	
		// Now, set the camera's position. We're directly manipulating the camera's position without considering the avatar's rotation.
		this.followCam.position.copy(desiredCameraPosition);
	
		// Make the camera look at the center of the avatar.
		this.followCam.lookAt(center);
	
		// If using orbit controls, update the target point.
		if (this.orbitControls) {
			this.orbitControls.target.copy(center);
		}
	}
	

	isInTheInteractiveRegion() {

		// Get vertices in this format [{x: 1, y: 2}, {x: 3, y: 4}, ...]
		const vertices = this.interactiveRegion.vertices.map((vertex) => {
			return { x: vertex.x, y: vertex.z };
		});

		// Check if the clone is inside the safe region
		if (isPointInsidePolygon(
			{ x: this.model.position.x, y: this.model.position.z },
			vertices
		)) {
			return true;
		}

		return false;
	}

	bindKeyEventsOld() {
		document.addEventListener('keydown', (event) => {
			switch (event.key.toLowerCase()) {
				case 'w':
					// Play the sound
					if (!this.isWalking()) {
						this.sound.play();
					}
					this.toggleWalking(true);
					this.moveForward();
					break;
				case 'a':
					this.turnLeft();
					break;
				case 's':
					if (!this.isWalking()) {
						this.sound.play();
					}
					this.toggleWalking(true);
					this.moveBackward();
					break;
				case 'd':
					this.turnRight();
					break;
			}
		});

		document.addEventListener('keyup', (event) => {
			switch (event.key.toLowerCase()) {
				case 'w':
					this.sound.stop();
					this.toggleWalking(false);
					break;
				case 'a':
					break;
				case 's':
					this.sound.stop();
					this.toggleWalking(false);
					break;
				case 'd':
					break;
			}
		});
	}

	bindKeyEvents() {
		document.addEventListener('keydown', (event) => {
			const key = event.key.toLowerCase();
			if (key in this.keysPressed) {
				// Step 2: Key is pressed
				this.keysPressed[key] = true;

				// Play sound if starting to walk and not already walking
				if ((key === 'w') && !this.isWalking()) {
					this.sound.play();
					this.toggleWalking(true);
				}
			}
		});

		document.addEventListener('keyup', (event) => {
			const key = event.key.toLowerCase();
			if (key in this.keysPressed) {
				// Step 3: Key is released
				this.keysPressed[key] = false;

				// If no movement keys are pressed, stop the walking sound
				if (!(this.keysPressed['w'])) {
					this.sound.stop();
					this.toggleWalking(false);
				}
			}

			// If key is 's', turn back
			if (key === 's') {
				this.turnBack();
			}
		});
	}

	updateMovementOld() {
		if (this.keysPressed['w']) this.moveForward();
		if (this.keysPressed['a']) this.turnLeft();
		if (this.keysPressed['d']) this.turnRight();
	}

	updateMovement() {
		let isMoving = false;

		if (this.keysPressed['w']) {
			this.velocity += this.acceleration; // increase the velocity (ease-in)
			isMoving = true;
		}

		if (isMoving) {
			// clamp the velocity to ensure it doesn't exceed the maximum speed
			this.velocity = Math.max(-this.maxSpeed, Math.min(this.velocity, this.maxSpeed));
		} else {
			// apply deceleration (ease-out) when no keys are pressed
			if (this.velocity > 0) {
				this.velocity = Math.max(0, this.velocity - this.deceleration);
			} else {
				this.velocity = Math.min(0, this.velocity + this.deceleration);
			}
		}

		// Then, you'd replace your direct translation method with a velocity-based one
		if (this.velocity !== 0) {
			this.translateAvatarZ(-this.velocity); // where translateAvatarZ() is your new movement logic, see below
			// Calculate model center position using its bounding box
			const boundingBox = new THREE.Box3().setFromObject(this.model);
			const center = new THREE.Vector3();
			boundingBox.getCenter(center);
			// Set the empty node position to the model center
			this.emptyNode.position.copy(center);
		}

		// ... handle left/right movement as before ... 
		if (this.keysPressed['a']) this.turnLeft();
		if (this.keysPressed['d']) this.turnRight();
		if (this.keysPressed['s']) this.turnBack();
	}

	translateAvatarZ(amount) {
		// Create a model clone 
		const modelClone = this.model.clone();
		// Translate the clone forward
		modelClone.translateZ(amount);

		// Get vertices in this format [{x: 1, y: 2}, {x: 3, y: 4}, ...]
		const vertices = this.walkableRegion.vertices.map((vertex) => {
			return { x: vertex.x, y: vertex.z };
		});

		if (this.isInTheInteractiveRegion()) {
			console.log('You are in the interactive region');
		}

		// Check if the clone is inside the safe region
		if (isPointInsidePolygon(
			{ x: modelClone.position.x, y: modelClone.position.z },
			vertices
		)) {
			let collisionDistance = 1;
			this.raycaster = new THREE.Raycaster();

			const direction = new THREE.Vector3(0, 0, -1).applyQuaternion(this.model.quaternion);
			this.raycaster.set(this.model.position, direction);

			const intersections = this.raycaster.intersectObjects(this.collidableObjects);

			if (intersections.length > 0 && intersections[0].distance < collisionDistance) {
				console.log('Collision detected');
				return; // Don't move the avatar forward
			}

			// If so, move the model forward
			this.model.translateZ(amount);
		}

		// this.model.translateZ(-config.avatar.speed);
		this.updateCamera();
	}


	update(delta) {
		if (this.mixer) {
			this.mixer.update(delta);
		}
	}

	dispose() {
		this.model.traverse(function (object) {
			if (object.isMesh) object.geometry.dispose();
			if (object.material.isMaterial) object.material.dispose();
		});

		this.scene.remove(this.model);

		// Unbind key events
		document.removeEventListener('keydown');
		document.removeEventListener('keyup');

	}
}
