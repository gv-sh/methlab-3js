import * as THREE from 'three';
import { config } from './config.js';

import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';


export const setupRenderer = (containerRef) => {
    const renderer = new THREE.WebGLRenderer({
        antialias: true
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    containerRef.current.appendChild(renderer.domElement);
    renderer.shadowMap.enabled = config.renderer.shadowMapEnabled;
    renderer.shadowMap.type = config.renderer.shadowMapType;
    renderer.toneMapping = config.renderer.toneMapping;
    renderer.toneMappingExposure = 1.0;

    return renderer;
}

export const setupScene = (sceneName, renderer) => {
    const scene = new THREE.Scene();

    if (config.fog.visible) {
        scene.fog = new THREE.Fog(config.fog.color, config.fog.near, config.fog.far);
    }

    // Add a grid helper 
    if (config.showGridHelper) {
        const gridHelper = new THREE.GridHelper(config.groundPlane.size, config.groundPlane.size);
        scene.add(gridHelper);
    }

    const sceneConfig = config.scenes.find(scene => scene.name === sceneName);

    const envMapLoader = new RGBELoader();
    envMapLoader.load(sceneConfig.environmentMap, (texture) => {
        const pmremGenerator = new THREE.PMREMGenerator(renderer);
        const envMap = pmremGenerator.fromEquirectangular(texture).texture;
        scene.environment = envMap;

        // Also set the background to the same texture
        scene.background = envMap;
        
        texture.dispose();
        pmremGenerator.dispose();
    }, undefined, (error) => {
        console.error('Error loading HDR environment map:', error);
    });

    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('../draco/');
    const loader = new GLTFLoader();
    loader.setDRACOLoader(dracoLoader);
    loader.load(
        sceneConfig.modelPath,
        (gltf) => {
            if (gltf) {
                const model = gltf.scene;
                // Move the entire model up by config.scene1.elevationOffset
                model.position.y = sceneConfig.elevationOffset;
                scene.add(model);
                // Add all the objects in the model into collidableObjects
                model.traverse((node) => {
                    if (node.isMesh) {
                        // collidableObjects.push(node);

                        // Set envMap to each mesh
                        node.material.envMapIntensity = 1.5;
                        node.material.envMap = scene.environment;
                        node.material.needsUpdate = true;

                        // Set shadow to each mesh
                        node.castShadow = false;
                        node.receiveShadow = true;
                    }
                });
            }
        },
        undefined,  // onProgress callback, can be omitted or replaced with a progress function
        (error) => {
            console.error('An error occurred while loading the model:', error);
        }
    );

    return scene;
}

export const setupCamera = (renderer) => {
    const camera = new THREE.PerspectiveCamera(config.camera.fov, window.innerWidth / window.innerHeight, config.camera.near, config.camera.far);
    return camera;
}

export const setupLights = (scene) => {
    const light = new THREE.PointLight(0xffffff, 100);
    // Diffuse light
    light.position.set(0, 5, 0);
    light.castShadow = true;
    // scene.add(light);
    return light;
}

export const setupOrbitControls = (camera, renderer) => {
    const controls = new OrbitControls(camera, renderer.domElement);
    return controls;
}

export const setupAudio = (sceneName, camera) => {
    const sceneConfig = config.scenes.find(scene => scene.name === sceneName);

    const listener = new THREE.AudioListener();
    camera.add(listener);

    // create a global audio source
    const sound = new THREE.Audio(listener);

    // load a sound and set it as the Audio object's buffer
    const audioLoader = new THREE.AudioLoader();

    const handleAudioLoaded = (buffer) => {
        sound.setBuffer(buffer);
        sound.setLoop(true);
        sound.setVolume(sceneConfig.bgmVolume);
        sound.play();  // Moved inside the callback to ensure it plays after load.
    };

    // Here, we're checking if the sound object doesn't already have a buffer set to avoid re-loading the audio.
    if (!sound.buffer) {
        audioLoader.load(
            sceneConfig.bgm,
            handleAudioLoaded,
            undefined,
            (error) => {
                console.error('Error loading audio:', error);
            }
        );
    }

    return sound;
};
