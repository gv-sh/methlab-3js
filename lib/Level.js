import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import { config } from '../config';
import { AudioController } from './AudioController';
import { KeyboardController } from './KeyboardController';
import { WALKING } from './utils';

export class Level {
    constructor(levelID) {
        this.levelID = levelID;
        this.scene = new THREE.Scene();
        this.model = new THREE.Object3D();
        this.player = new THREE.Object3D();
        this.playerBody;
        this.camera = new THREE.PerspectiveCamera();
        this.controls;
        this.renderer;
        this.keyboardController = null;
        this.stats;
        this.keyPressed = {
            W: false,
            A: false,
            S: false,
            D: false
        }
        this.clock = new THREE.Clock();
        this.audioListener = new THREE.AudioListener();
        this.bgm = new AudioController(this.audioListener, config.levels[0].scene.bgm, true, 0.5);
        this.scene.add(this.audioListener);
        this.walkableRegions = config.levels[levelID].scene.walkableRegions.whitelist;
        this.interactiveRegions = config.levels[levelID].scene.interactiveRegions.whitelist;
        this.teleportRegions = config.levels[levelID].scene.teleportRegions.whitelist;
    }

    bindStats(stats) {
        this.stats = stats;
    }

    setVolume(value) {
        this.bgm.setVolume(value);
    }

    async initialiseRenderer(window) {
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    async addGridHelper() {
        // Create a grid helper with scale marked 
        const size = 10;
        const divisions = 10;
        const gridHelper = new THREE.GridHelper(size, divisions);

        // Add the grid to the scene
        this.scene.add(gridHelper);
    }

    async loadEnvMap() {
        try {
            const envMapLoader = new RGBELoader();
            const texture = await new Promise((resolve, reject) => {
                envMapLoader.load(config.levels[this.levelID].scene.environmentMap, resolve, undefined, reject);
            });

            const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
            const envMap = pmremGenerator.fromEquirectangular(texture).texture;
            this.scene.environment = envMap;

            texture.dispose();
            pmremGenerator.dispose();

            console.log('Loaded HDR environment map');
        } catch (error) {
            console.error('Error loading HDR environment map:', error);
        }
    };

    async loadScene() {
        try {
            const dracoLoader = new DRACOLoader();
            dracoLoader.setDecoderPath('draco/');
            const loader = new GLTFLoader();
            loader.setDRACOLoader(dracoLoader);

            const gltf = await new Promise((resolve, reject) => {
                loader.load(config.levels[this.levelID].scene.modelPath, resolve, undefined, reject);
            });

            this.model = gltf.scene;
            this.scene.add(this.model);

            // If there is an elevation offset, apply it to the model
            if (config.levels[this.levelID].scene.elevationOffset) {
                this.model.position.y += config.levels[this.levelID].scene.elevationOffset;
            }

            this.model.traverse((node) => {
                if (node.isMesh) {
                    node.material.envMapIntensity = 1;
                    node.material.envMap = this.scene.environment;
                    node.material.needsUpdate = true;
                }
            });

            console.log('Loaded scene');
        } catch (error) {
            console.error('Error loading scene:', error);
        }
    }

    async setupCamera() {
        this.camera = new THREE.PerspectiveCamera(config.global.camera.fov, window.innerWidth / window.innerHeight, config.global.camera.near, config.global.camera.far);
        this.camera.position.z = config.global.camera.initialPosition[2];
        this.camera.position.y = config.global.camera.initialPosition[1];
        this.camera.lookAt(this.player.position);

        console.log('Setup camera');
    }

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

    async drawRegions(regions, color, visible) {
        regions.forEach(async (region) => {
            await this.drawRegion(region, color, visible);
        });
    }

    async loadPlayer() {
        try {
            const dracoLoader = new DRACOLoader();
            dracoLoader.setDecoderPath('draco/');
            const loader = new GLTFLoader();
            loader.setDRACOLoader(dracoLoader);

            const gltf = await new Promise((resolve, reject) => {
                loader.load(config.levels[this.levelID].player.modelPath, resolve, undefined, reject);
            });

            this.player = gltf.scene;

            // Set initial player position, rotation, and scale
            this.player.position.x = config.levels[this.levelID].player.initialPosition[0];
            this.player.position.y = config.levels[this.levelID].player.initialPosition[1];
            this.player.position.z = config.levels[this.levelID].player.initialPosition[2];
            this.player.rotation.y = config.levels[this.levelID].player.initialOrientation;
            this.player.scale.x = config.levels[this.levelID].player.scale;

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

            await this.drawRegions (this.walkableRegions, config.levels[this.levelID].scene.walkableRegions.color, config.levels[this.levelID].scene.walkableRegions.visible);

            await this.drawRegions (this.interactiveRegions, config.levels[this.levelID].scene.interactiveRegions.color, config.levels[this.levelID].scene.interactiveRegions.visible);

            await this.drawRegions (this.teleportRegions, config.levels[this.levelID].scene.teleportRegions.color, config.levels[this.levelID].scene.teleportRegions.visible);

            this.keyboardController = new KeyboardController(this.player, mixer, animationmap, this.controls, this.camera, 'Idle', this.levelID);

        }
        catch (error) {
            console.error('Error loading player:', error);
        }
    }

    isPlayerWalking () {
        return this.keyboardController.currentAction === WALKING;
    }

    animate = () => {

        let mixerUpdateDelta = this.clock.getDelta();
        this.keyboardController ? this.keyboardController.update(mixerUpdateDelta, this.keyPressed) : null;
        this.controls.update();

        this.renderer.render(this.scene, this.camera);
        this.stats ? this.stats.update() : null;

        requestAnimationFrame(this.animate);
    }

    bindKeyboardEvents() {
        document.addEventListener('keydown', (event) => {
            this.keyPressed[event.key.toLowerCase()] = true;
        }, false);

        document.addEventListener('keyup', (event) => {
            this.keyPressed[event.key.toLowerCase()] = false;
        }, false);
    }
}