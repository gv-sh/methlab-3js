import * as THREE from 'three';
import { config } from './config.js';

import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';

import { BokehPass } from 'three/addons/postprocessing/BokehPass.js';

import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';

import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

export function isPointInsidePolygon(point, vertices) {
    let intersections = 0;

    for (let i = 0; i < vertices.length; i++) {
        const vertex1 = vertices[i];
        const vertex2 = vertices[(i + 1) % vertices.length];  // This ensures the last point connects to the first

        // Check if point is on an horizontal boundary
        if (vertex1.y === point.y && vertex2.y === point.y && point.x > Math.min(vertex1.x, vertex2.x) && point.x < Math.max(vertex1.x, vertex2.x)) {
            return true;
        }

        // Check if point is on a vertex
        if (point.x === vertex1.x && point.y === vertex1.y) {
            return true;
        }

        // Check if ray is intersecting edge (excluding endpoints)
        if (point.y > Math.min(vertex1.y, vertex2.y) && point.y <= Math.max(vertex1.y, vertex2.y) && point.x <= Math.max(vertex1.x, vertex2.x) && vertex1.y !== vertex2.y) {
            const xinters = (point.y - vertex1.y) * (vertex2.x - vertex1.x) / (vertex2.y - vertex1.y) + vertex1.x;
            if (xinters === point.x) {  // Check if point is on the polygon boundary (other than horizontal)
                return true;
            }
            if (vertex1.x === vertex2.x || point.x <= xinters) {
                intersections++;
            }
        }
    }

    // If the number of edges we passed through is odd, then it's in the polygon.
    return intersections % 2 !== 0;
}

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

export const bokehFilter = (renderer, scene, camera) => {
    var composer;
    if (config.bokehPass) {
        // Create an EffectComposer for post-processing
        composer = new EffectComposer(renderer);

        // Create a RenderPass to render the scene
        const renderPass = new RenderPass(scene, camera);
        composer.addPass(renderPass);

        // Create a BokehPass for depth of field
        const bokehPass = new BokehPass(scene, camera, {
            focus: 0.25, // Focus distance (0.0 for near, 1.0 for far)
            aperture: 0.01, // Aperture size (adjust this value for different levels of blur)
            maxblur: 0.001, // Maximum blur strength
        });

        composer.addPass(bokehPass);
    }

    return composer;
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
    scene.add(light);
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

export const bloomFilter = (renderer, scene, camera) => {
    let composer;
    const renderScene = new RenderPass(scene, camera);

    const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1.5, 0.4, 0.85);
    bloomPass.threshold = config.postProcessing.bloomParams.threshold;
    bloomPass.strength = config.postProcessing.bloomParams.strength;
    bloomPass.radius = config.postProcessing.bloomParams.radius;

    const outputPass = new OutputPass();

    composer = new EffectComposer(renderer);
    composer.addPass(renderScene);
    composer.addPass(bloomPass);
    composer.addPass(outputPass);

    return composer;
}