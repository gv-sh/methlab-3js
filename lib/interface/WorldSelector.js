import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLBModel } from '../loaders/GLBModel';
import { config } from '../../config';

import { LoadingScreen } from './LoadingScreen';

const WorldSelector = () => {
    const canvasRef = useRef(null);
    const [loadingProgress, setLoadingProgress] = useState(0);
    const [loadingText, setLoadingText] = useState('Loading assets...');
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {

        // Create a new scene
        const scene = new THREE.Scene();
        let walter, gusfring;
        let model, mixers;
        const camera = new THREE.PerspectiveCamera(config.worldSelector.camera.fov, window.innerWidth / window.innerHeight, config.worldSelector.camera.near, config.worldSelector.camera.far);
        const renderer = new THREE.WebGLRenderer({ canvas: canvasRef.current, antialias: true });

        // Set renderer size
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(window.devicePixelRatio);

        mixers = [];

        setLoadingText('Loading assets...');
        // Load a GLB model
        const glbModel = new GLBModel(config.worldSelector.sceneModel);
        glbModel.load().then((gltf) => {
            model = gltf.scene;
            scene.add(model);

        });

        setLoadingProgress(20);
        // Load Players
        const glbModel2 = new GLBModel(config.worldSelector.player1Model);
        glbModel2.load().then((gltf) => {
            walter = gltf.scene;
            scene.add(walter);

            // Add animation mixer
            const mixer = new THREE.AnimationMixer(walter);
            mixers.push(mixer);

            // Play animation
            const action = mixer.clipAction(gltf.animations[config.worldSelector.player1IdleState]);
            action.play();

            // Rotate the model by PI
            walter.rotation.y = Math.PI;

            walter.position.x = -2;

            // Increase the size
            walter.scale.set(3, 3, 3);

        });

        setLoadingProgress(50);
        const glbModel3 = new GLBModel(config.worldSelector.player2Model);
        glbModel3.load().then((gltf) => {
            gusfring = gltf.scene;
            scene.add(gusfring);

            // Add animation mixer
            const mixer = new THREE.AnimationMixer(gusfring);
            mixers.push(mixer);

            // Play animation
            const action = mixer.clipAction(gltf.animations[config.worldSelector.player2IdleState]);
            action.play();

            // Rotate the model by PI
            gusfring.rotation.y = Math.PI;

            gusfring.position.x = 2;

            // Increase the size
            gusfring.scale.set(3, 3, 3);

        });

        setLoadingProgress(80);

        // Add ambient light
        const ambientLight = new THREE.AmbientLight(0xffffff, 1);
        scene.add(ambientLight);

        // Add light
        const pointLight = new THREE.PointLight(0xffffff, 50);
        pointLight.position.set(0, 5, 5);
        scene.add(pointLight);

        // Reposition the camera
        camera.position.set(...config.worldSelector.camera.initialPosition);

        const clock = new THREE.Clock();

        const raycaster = new THREE.Raycaster();
        const mouse = new THREE.Vector2();

        const onMouseMove = (event) => {
            event.preventDefault();

            mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
            mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

            // Update light position to follow the mouse
            pointLight.position.set(mouse.x * 10, mouse.y * 10, 3);

        }

        const onMouseClick = (event) => {
            event.preventDefault();

            raycaster.setFromCamera(mouse, camera);

            const intersects = raycaster.intersectObjects(scene.children, true);

            if (intersects.length > 0) {
                let object = intersects[0].object;
                while (object.parent && object.parent !== scene) {
                    object = object.parent;
                }

                if (object === walter) {
                    window.location.href = "/MethLab";
                } else if (object === gusfring) {
                    window.location.href = "/Spacebar";
                }
            }
        };

        window.addEventListener('mousemove', onMouseMove, false);
        window.addEventListener('click', onMouseClick, false);

        // Add resize event listener
        window.addEventListener('resize', () => {
            // Update sizes
            renderer.setSize(window.innerWidth, window.innerHeight);
            renderer.setPixelRatio(window.devicePixelRatio);

            // Update camera
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
        });

        const animate = () => {
            requestAnimationFrame(animate);

            const delta = clock.getDelta();

            // Update the animation mixer 
            if (mixers) {
                for (let mixer of mixers) {
                    mixer.update(delta);
                }
            }

            renderer.render(scene, camera);
        };


        animate();

        setLoadingProgress(100);

        // After 300ms, set isLoaded to true to remove the loading screen
        setTimeout(() => {
            setIsLoaded(true);
        }, 500);
    }, []);

    return (
        <div>
            {!isLoaded && (
                <LoadingScreen
                    loadingProgress={loadingProgress}
                    loadingText={loadingText}
                />
            )}
            <canvas id="world-selector" ref={canvasRef}>
            </canvas>
        </div>
    );
};

export default WorldSelector;
