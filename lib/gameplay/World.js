/**
 * @fileoverview This file defines the World class.
 * The World class is used to create a 3D world in a scene.
 * It is used to load the 3D model of the world, the player, and the environment map.
 * It is also used to setup the camera and the renderer.
 * @package
 * @module gameplay/World
 * @author gv-sh
 * @version 1.0.0
 */

import * as THREE from 'three';

import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

import { config } from '../../config';
import { AudioControl } from '../sound/AudioControl';
import { KeyboardControl, WALKING } from './KeyboardControl';

import { HDRMap } from '../loaders/HDRMap';
import { GLBModel } from '../loaders/GLBModel';

export class World {
    /**
     * Create a 3D world.
     * @param {number} worldID - The ID of the world.
     */
    constructor(worldID) {
        this.worldID = worldID;
        this.scene = new THREE.Scene();
        this.model = new THREE.Object3D();
        this.player = new THREE.Object3D();
        this.playerBody;
        this.camera = new THREE.PerspectiveCamera();
        this.controls;
        this.renderer;
        this.keyboardControl = null;
        this.stats;
        this.keyPressed = {
            W: false,
            A: false,
            S: false,
            D: false
        }
        this.clock = new THREE.Clock();
        this.audioListener = new THREE.AudioListener();
        this.bgm = new AudioControl(this.audioListener, config.worlds[0].scene.bgm, true, 0.5);
        this.scene.add(this.audioListener);
        this.walkableRegions = config.worlds[worldID].scene.walkableRegions.whitelist;
        this.interactiveRegions = config.worlds[worldID].scene.interactiveRegions.whitelist;
        this.teleportRegions = config.worlds[worldID].scene.teleportRegions.whitelist;
    }

    /**
     * Bind the stats object to the world.
     * @param {Stats} stats - The stats object to bind.
     */
    bindStats(stats) {
        this.stats = stats; /* Requires document to be available in scope */
    }

    /**
     * Change volume of the background music.
     * @param {number} value - The volume value to set.
     */
    setVolume(value) {
        this.bgm.setVolume(value);
    }

    /**
     * Initializes the renderer with antialiasing and sets its size to match the window.
     * @async
     * @param {Window} window - The window object to set the renderer size to.
     * @returns {Promise<void>} - A promise that resolves when the renderer is initialized.
     */
    async initialiseRenderer(window) {
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    /**
     * Loads the environment map for the scene.
     * @async
     * @returns {Promise<void>} - A promise that resolves when the environment map is loaded.
     */
    async loadEnvironmentMap() {
        const hdrMap = new HDRMap(config.worlds[this.worldID].scene.environmentMap, this.renderer);
        this.scene.environment = await hdrMap.load();
    };

    /**
     * Loads the scene model
     * @async
     * @returns {Promise<void>} - A promise that resolves when the scene model is loaded.
     */
    async loadScene() {
        const glbModel = new GLBModel(config.worlds[this.worldID].scene.modelPath);
        const gltf = await glbModel.load();
        this.model = gltf.scene;

        // If there is an elevation offset, apply it to the model
        if (config.worlds[this.worldID].scene.elevationOffset) {
            this.model.position.y += config.worlds[this.worldID].scene.elevationOffset;
            console.log(config.worlds[this.worldID].scene.elevationOffset);
        }

        this.model.traverse((node) => {
            if (node.isMesh) {
                node.material.envMapIntensity = 1;
                node.material.envMap = this.scene.environment;
                node.material.needsUpdate = true;
            }
        });

        this.scene.add(this.model);
    }

    /**
     * Setup the camera for the scene.
     * @async
     */
    async setupCamera() {
        this.camera = new THREE.PerspectiveCamera(config.global.camera.fov, window.innerWidth / window.innerHeight, config.global.camera.near, config.global.camera.far);
        this.camera.position.z = config.global.camera.initialPosition[2];
        this.camera.position.y = config.global.camera.initialPosition[1];
        this.camera.lookAt(this.player.position);
    }

    /**
     * Setup the orbit controls for the camera.
     * @async
     * @param {THREE.Camera} camera - The camera in the scene.
     */
    async setupOrbitControls(camera) {
        this.controls = new OrbitControls(camera, this.renderer.domElement);
        this.controls.enableDamping = config.global.orbitControls.damping.enabled;
        this.controls.dampingFactor = config.global.orbitControls.damping.factor;
        this.controls.screenSpacePanning = config.global.orbitControls.screenSpacePanning;

        this.controls.minDistance = config.global.orbitControls.minDistance;
        this.controls.maxDistance = config.global.orbitControls.maxDistance;
        this.controls.minPolarAngle = config.global.orbitControls.minPolarAngle;
        this.controls.maxPolarAngle = config.global.orbitControls.maxPolarAngle;
    }

    /**
     * Draw a region in the scene for development purposes.
     * @async
     * @param {Array<Array<number>>} region - The region to draw.
     * @param {number} color - The color of the region.
     * @param {boolean} visible - Whether the region is visible.
     */
    async drawRegion(region, color, visible) {
        // Create an array to hold vertex coordinates
        let verticesArray = [];

        region.forEach((vertex) => {
            verticesArray.push(vertex[0], 0.5, vertex[2]);
        });

        const regionGeometry = new THREE.BufferGeometry();
        regionGeometry.setAttribute('position', new THREE.Float32BufferAttribute(verticesArray, 3));

        const regionMaterial = new THREE.LineBasicMaterial({ color: color });
        const regionLines = new THREE.Line(regionGeometry, regionMaterial);

        this.scene.add(regionLines);
        regionLines.visible = visible;
    }

    /**
     * Draw multiple regions in the scene for development purposes.
     * @async
     * @param {Array<Array<Array<number>>>} regions - The regions to draw.
     * @param {number} color - The color of the regions.
     * @param {boolean} visible - Whether the regions are visible.
     */
    async drawRegions(regions, color, visible) {
        regions.forEach(async (region) => {
            await this.drawRegion(region, color, visible);
        });
    }

    /**
     * Loads the player model
     * @async
     * @returns {Promise<void>} - A promise that resolves when the player model is loaded.
     */
    async loadPlayer() {
        try {
            const glbModel = new GLBModel(config.worlds[this.worldID].player.modelPath);
            const gltf = await glbModel.load();
            this.player = gltf.scene;

            // Set initial player position, rotation, and scale
            this.player.position.x = config.worlds[this.worldID].player.initialPosition[0];
            this.player.position.y = config.worlds[this.worldID].player.initialPosition[1];
            this.player.position.z = config.worlds[this.worldID].player.initialPosition[2];
            this.player.rotation.y = config.worlds[this.worldID].player.initialOrientation;
            this.player.scale.x = config.worlds[this.worldID].player.scale;

            this.player.traverse(function (object) {
                if (object.isMesh) object.castShadow = true;
            });

            this.scene.add(this.player);

            var gltfAnimations = gltf.animations;
            var mixer = new THREE.AnimationMixer(this.player);
            var animationmap = new Map();

            gltfAnimations.filter(function (a) {
                return a.name !== "";
            }).forEach(function (a) {
                animationmap.set(a.name, mixer.clipAction(a));
            })

            await this.drawRegions(this.walkableRegions, config.worlds[this.worldID].scene.walkableRegions.color, config.worlds[this.worldID].scene.walkableRegions.visible);

            await this.drawRegions(this.interactiveRegions, config.worlds[this.worldID].scene.interactiveRegions.color, config.worlds[this.worldID].scene.interactiveRegions.visible);

            await this.drawRegions(this.teleportRegions, config.worlds[this.worldID].scene.teleportRegions.color, config.worlds[this.worldID].scene.teleportRegions.visible);

            this.keyboardControl = new KeyboardControl(this.player, mixer, animationmap, this.controls, this.camera, 'Idle', this.worldID, this.reactStates);

        }
        catch (error) {
            console.error('Error loading player:', error);
        }
    }

    /**
     * Checks if the player is currently walking
     * @returns {boolean} - Whether the player is currently walking.
     */
    isPlayerWalking() {
        return this.keyboardControl.currentAction === WALKING;
    }

    /**
     * Checks if the player is currently inside an interactive region
     * @returns {boolean} - Whether the player is currently inside an interactive region.
     */
    isPlayerInsideInteractiveRegion() {
        let playerPosition = this.player.position;
        let playerX = playerPosition.x;
        let playerZ = playerPosition.z;

        for (let i = 0; i < this.interactiveRegions.length; i++) {
            let region = this.interactiveRegions[i];

            if (playerX >= region[0][0] && playerX <= region[1][0] && playerZ >= region[0][2] && playerZ <= region[2][2]) {
                return true;
            }
        }

        return false;
    }

    isPlayerInsideTeleportRegion() {
        let playerPosition = this.player.position;
        let playerX = playerPosition.x;
        let playerZ = playerPosition.z;

        for (let i = 0; i < this.teleportRegions.length; i++) {
            let region = this.teleportRegions[i];

            if (playerX >= region[0][0] && playerX <= region[1][0] && playerZ >= region[0][2] && playerZ <= region[2][2]) {
                return true;
            }
        }

        return false;
    }

    /**
     * Main animation loop.
     */
    animate = () => {

        let mixerUpdateDelta = this.clock.getDelta();
        this.keyboardControl ? this.keyboardControl.update(mixerUpdateDelta, this.keyPressed) : null;
        this.controls.update();

        this.renderer.render(this.scene, this.camera);
        this.stats ? this.stats.update() : null;

        requestAnimationFrame(this.animate);
    }

    /**
     * Bind the keyboard events to the document.
     */
    bindKeyboardEvents() {
        document.addEventListener('keydown', (event) => {
            // If SPACE is pressed and the player is inside the interactive region, show the modal 
            this.keyPressed[event.key.toLowerCase()] = true;
        }, false);

        document.addEventListener('keyup', (event) => {
            this.keyPressed[event.key.toLowerCase()] = false;
        }, false);
    }
}