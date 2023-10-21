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
		this.heading = 'front';
		this.isTurningBack = false;
		this.turning = false;
		this.instructionQueue = [];
		this.isProcessingQueue = false;

		this.cameraLerpFactor = 0.08;  // Determines how quickly the camera follows: lower is slower
		this.lookAtLerpFactor = 0.25;  // Determines how quickly the camera looks at the target: lower is slower
		this.targetPosition = new THREE.Vector3();  // The position the camera is moving towards
		this.targetLookAt = new THREE.Vector3();  // The point the camera is looking towards


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
			this.walkAction = this.mixer.clipAction(this.animations[config.avatar.animations.walking]);
			this.turnLeftAction = this.mixer.clipAction(this.animations[config.avatar.animations.turnLeft]);
			this.turnRightAction = this.mixer.clipAction(this.animations[config.avatar.animations.turnRight]);
			this.turnBackAction = this.mixer.clipAction(this.animations[config.avatar.animations.turnBack]);
			// this.runAction = this.mixer.clipAction(this.animations[config.avatar.animations.run]);

			this.actions = {
				'idle': this.idleAction,
				'walk': this.walkAction,
				'turnLeft': this.turnLeftAction,
				'turnRight': this.turnRightAction,
				'turnBack': this.turnBackAction
			}

			// Remove the animation clip at index 0 from this.animations


			this.actions['idle'].play();
			this.heading = 'N';

			// Set turn actions to loop once
			this.actions['turnLeft'].setLoop(THREE.LoopOnce);
			this.actions['turnRight'].setLoop(THREE.LoopOnce);
			this.actions['turnBack'].setLoop(THREE.LoopOnce);

			this.setInitialCameraPosition();

			this.animationCallback();

		});
	}

	enqueueInstruction(instruction) {
		this.instructionQueue.push(instruction);
		this.processInstructionQueue();
	}

	async processInstructionQueue() {
		// If we're already processing the queue, or there's nothing left to process, we do nothing
		if (this.isProcessingQueue || this.instructionQueue.length === 0) {
			return;
		}

		this.isProcessingQueue = true;

		const nextInstruction = this.instructionQueue.shift(); // Get the next instruction

		try {
			await nextInstruction(); // Execute it
		} catch (error) {
			console.error('Error during instruction execution:', error);
			// Handle error appropriately
		}

		this.isProcessingQueue = false;

		// Recursive call to process any remaining instructions
		this.processInstructionQueue();
	}

	isWalking() {
		return this.actions['walk'].isRunning();
	}

	async toggleWalking(state) {
		if (state) {
			this.actions['idle'].stop();
			this.actions['walk'].play();
		} else {
			this.actions['walk'].stop();
			this.actions['idle'].play();
		}

		// // Pause any other actions that are running
		// Object.values(this.actions).forEach(a => {
		// 	if (a.isRunning() && a !== this.actions['walk']) {
		// 		a.stop();
		// 	}
		// });

		// if (state) {
		// 	this.actions['walk'].play();
		// } else {
		// 	this.actions['walk'].stop();
		// 	this.actions['idle'].play();

		// }
	}

	setInitialCameraPosition() {
		// 1. Get the offset from the avatar's position.
		// Note: The z-value is negative to position the camera behind the avatar.
		const offset = new THREE.Vector3(0, this.followCamOffset.y, this.followCamOffset.z);

		// 2. Adjust the offset based on the avatar's orientation
		// offset.applyQuaternion(this.model.quaternion);

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

		// Set the target position to the current camera position
		this.targetPosition.copy(this.followCam.position);

		// Set the target look at to the current camera look at
		this.targetLookAt.copy(center);

	}


	updateCamera() {

		// 1. Get the offset from the avatar's position.
		// Note: The z-value is negative to position the camera behind the avatar.
		const offset = new THREE.Vector3(0, this.followCamOffset.y, this.followCamOffset.z);

		// 2. Adjust the offset based on the avatar's orientation
		// offset.applyQuaternion(this.model.quaternion);

		const targetPosition = this.model.position.clone().add(offset);

		// 3. Set the camera's position to the adjusted offset
		// this.followCam.position.copy(this.model.position).add(offset);
		this.followCam.position.lerp(targetPosition, this.cameraLerpFactor);

		// 4. Compute the bounding box of the model
		const boundingBox = new THREE.Box3().setFromObject(this.model);

		// 5. Get the center of this bounding box
		const center = new THREE.Vector3();

		boundingBox.getCenter(center);

		// Slightly look at the bottom of the avatar
		center.y += 0.75;

		// 6. Make the camera look at the center of the avatar
		// this.followCam.lookAt(center);
		this.targetLookAt.lerp(center, this.lookAtLerpFactor);

		this.followCam.lookAt(this.targetLookAt);

		// Move the orbit controls to the new position
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

	async turnToOld(direction) {

		// Define the action based on the direction parameter, e.g., this.actions[direction] 
		const action = this.actions[direction];
		if (!action) {
			console.error('Invalid direction');
			return;
		}

		// Similar to your current turn functions
		// Stop other actions, configure the turn animation, and play it
		Object.values(this.actions).forEach(a => {
			if (a.isRunning() && a !== action) {
				a.fadeOut(0.2);
			}
		});


		action.reset().setEffectiveTimeScale(1).setEffectiveWeight(1);
		action.clampWhenFinished = false;

		// Play the animation
		action.play();

		// Set the next animation to idle

		// Wait for the turn animation to complete (using your existing promise-based approach)
		await this.whenAnimationFinished(action).then(() => {
			switch (direction) {
				case 'turnLeft':
					this.model.rotateY(Math.PI / 2);
					break;
				case 'turnRight':
					this.model.rotateY(-Math.PI / 2);
					break;
				case 'turnBack':
					this.model.rotateY(Math.PI);
					break;
			}
		});
	}

	async turnTo(direction) {
		// Define the action based on the direction parameter, e.g., this.actions[direction]
		const action = this.actions[direction];
		if (!action) {
			console.error('Invalid direction');
			return;
		}

		// Similar to your current turn functions
		// Stop other actions, configure the turn animation, and play it
		Object.values(this.actions).forEach(a => {
			if (a.isRunning() && a !== action) {
				a.stop();
			}
		});

		action.reset().setEffectiveTimeScale(1).setEffectiveWeight(1);
		action.clampWhenFinished = false; // Set this to true to ensure it stays at the last frame of the animation

		// Play the animation
		action.play();

		// Wait for the turn animation to complete (using your existing promise-based approach)
		await this.whenAnimationFinished(action);

		// Update the model's rotation based on the direction after the turning animation is completed.
		let newRotation;
		switch (direction) {
			case 'turnLeft':
				newRotation = this.model.rotation.y - Math.PI / 2;
				break;
			case 'turnRight':
				newRotation = this.model.rotation.y + Math.PI / 2;
				break;
			case 'turnBack':
				newRotation = this.model.rotation.y + Math.PI;
				break;
		}

		// Apply the new rotation
		this.model.rotation.y = newRotation;

		// Ensure the rotation takes effect
		this.model.updateMatrix();

		// Play the idle animation after the turn is complete
		const idleAction = this.actions['idle']; // Assuming 'idle' is the name of your idle action
		if (!idleAction) {
			console.error('Idle action not found');
			return;
		}

		idleAction.reset().setEffectiveTimeScale(1).setEffectiveWeight(1);
		idleAction.play();
	}


	whenAnimationFinished(action) {
		return new Promise(resolve => {
			const finishCallback = () => {
				console.log('Animation finished');
				action.getMixer().removeEventListener('finished', finishCallback);
				resolve();
			};

			action.getMixer().addEventListener('finished', finishCallback);
		});
	}

	async translateAvatarZ(amount) {
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

	bindKeyEvents() {
		// Add event listeners for keydown and keyup events.
		window.addEventListener('keydown', (event) => this.handleKeyDown(event));
		window.addEventListener('keyup', (event) => this.handleKeyUp(event));
	}

	findDirectionDifference(newDirection) {
		// Given current heading as N, E, W, S, NE, NW, SE, SW
		// newDirection is the direction the avatar is turning to
		// Find the difference between the two directions in terms of angle in radians

		const directionMapping = {
			'N': 0,
			'E': 90,
			'W': -90,
			'S': 180,
			'NE': 45,
			'NW': -45,
			'SE': 135,
			'SW': -135
		}

		const currentDirection = this.heading;

		const currentDirectionAngle = directionMapping[currentDirection];

		const newDirectionAngle = directionMapping[newDirection];

		const difference = newDirectionAngle - currentDirectionAngle;

		return difference;
	}

	findRequiredTurn(newDirection) {
		let difference = this.findDirectionDifference(newDirection);
		console.log('difference ' + difference);

		if (difference === 0) {
			return null;
		} else if (difference === 90) {
			return 'turnRight';
		} else if (difference === -90) {
			return 'turnLeft';
		} else if (difference === 90) {
			return 'turnBack';
		} else if (difference === 45) {
			return 'turnRight';
		} else if (difference === -45) {
			return 'turnLeft';
		} else if (difference === 135) {
			return 'turnRight';
		} else if (difference === -135) {
			return 'turnLeft';
		} else if (difference === 180) {
			return 'turnBack';
		} else if (difference === -180) {
			return 'turnBack';
		} else if (difference === 270) {
			return 'turnLeft';
		} else if (difference === -270) {
			return 'turnRight';
		}

		return null;
	}

	async handleKeyDown(event) {
		// When a key is pressed, set the corresponding state to true
		const key = event.key.toLowerCase();
		this.keysPressed[key] = true;
		let newDirection = null;
		// Find the current rotation of the model
		switch (key) {
			case 'w':
				newDirection = 'N';
				break;
			case 'a':
				newDirection = 'W';
				break;
			case 's':
				newDirection = 'S';
				break;
			case 'd':
				newDirection = 'E';
				break;
		}

		// If two keys are pressed, ignore the second key
		if (this.keysPressed['w'] && this.keysPressed['s']) {
			this.keysPressed['s'] = false;
		}

		if (this.keysPressed['a'] && this.keysPressed['d']) {
			this.keysPressed['d'] = false;
		}

		// Find the required turn
		const requiredTurn = this.findRequiredTurn(newDirection);
		console.log('required turn ' + requiredTurn);

		if (requiredTurn !== null && !this.turning) {
			this.turning = true;
			// Enqueue turning instruction
			this.enqueueInstruction(async () => {
				await this.turnTo(requiredTurn);
				this.heading = newDirection;
				this.turning = false;
				console.log('turned to ' + newDirection);
			});
		}

		// After animation completes, set the heading and potentially initiate walking
		if (!this.turning && (this.keysPressed['w'] || this.keysPressed['a'] || this.keysPressed['s'] || this.keysPressed['d'])) {

			// Check if the avatar is already walking to avoid enqueuing unnecessary instructions
			if (!this.isWalking()) {
				// Enqueue a new instruction for starting to walk
				this.enqueueInstruction(async () => {
					// Play walking sound and change walking state
					this.sound.play();
					await this.toggleWalking(true);
					// You may need additional handling here, especially if toggleWalking returns something useful
				});
			}

			// Enqueue the instruction for translating the avatar's position
			this.enqueueInstruction(async () => {
				this.translateAvatarZ(-config.avatar.speed);
				// If translateAvatarZ is also async, you should await it, and handle any return values/errors
			});
		}

	}

	handleKeyUp(event) {
		// When a key is released, set the corresponding state to false
		this.keysPressed[event.key.toLowerCase()] = false;

		// Additional logic when keys are released can be added here
		// For example, you might stop the walking animation when movement keys are released

		// If no movement keys are pressed, stop the walking sound
		if (!(this.keysPressed['w'] || this.keysPressed['a'] || this.keysPressed['s'] || this.keysPressed['d'])) {
			this.enqueueInstruction(async () => {
				this.sound.stop();
				this.toggleWalking(false);
			});
		}
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
