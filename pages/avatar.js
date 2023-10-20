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

			this.actions['idle'].play();
			this.heading = 'N';

			// Set turn actions to loop once
			this.actions['turnLeft'].setLoop(THREE.LoopOnce);
			this.actions['turnRight'].setLoop(THREE.LoopOnce);
			this.actions['turnBack'].setLoop(THREE.LoopOnce);

			this.updateCamera();

			this.animationCallback();

		});
	}

	isWalking() {
		return this.actions['walk'].isRunning();
	}

	toggleWalking(state) {
		if (state) {
			this.actions['idle'].stop();
			this.actions['walk'].play();
		} else {
			this.actions['walk'].stop();
			this.actions['idle'].play();
		}
	}


	updateCamera() {
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

		action.reset().setEffectiveTimeScale(3).setEffectiveWeight(1.5).fadeIn(0.5);


		action.clampWhenFinished = false;

		// Play the animation
		action.play();

		// Wait for the turn animation to complete (using your existing promise-based approach)
		await this.whenAnimationFinished(action);

		switch (direction) {
			case 'turnLeft':
				this.model.rotateY(Math.PI / 2);
				console.log('turning left');
				break;
			case 'turnRight':
				this.model.rotateY(-Math.PI / 2);
				console.log('turning right');
				break;
			case 'turnBack':
				this.model.rotateY(Math.PI);
				console.log('turning back');
				break;
		}
	}

	whenAnimationFinished(action) {
		return new Promise(resolve => {
			// This assumes your 'action' or 'mixer' instance emits 'finished' when done.
			const finishCallback = () => {
				action.getMixer().removeEventListener('finished', finishCallback);
				resolve();
			};

			action.getMixer().addEventListener('finished', finishCallback);
		});
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

	handleKeyDown(event) {
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

		// Find the required turn
		const requiredTurn = this.findRequiredTurn(newDirection);
		console.log('required turn ' + requiredTurn);

		if (requiredTurn) {
			this.turnTo(requiredTurn);
			this.heading = newDirection;
			console.log('turning to ' + newDirection);
		}

		// After animation completes, set the heading and potentially initiate walking
		if (this.keysPressed['w'] || this.keysPressed['a'] || this.keysPressed['s'] || this.keysPressed['d']) {

			if (!this.isWalking()) {
				this.sound.play();
			}

			this.toggleWalking(true);
			this.translateAvatarZ(-config.avatar.speed);
		}

	}

	handleKeyUp(event) {
		// When a key is released, set the corresponding state to false
		this.keysPressed[event.key.toLowerCase()] = false;

		// Additional logic when keys are released can be added here
		// For example, you might stop the walking animation when movement keys are released

		// If no movement keys are pressed, stop the walking sound
		if (!(this.keysPressed['w'] || this.keysPressed['a'] || this.keysPressed['s'] || this.keysPressed['d'])) {
			this.sound.stop();
			this.toggleWalking(false);
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
