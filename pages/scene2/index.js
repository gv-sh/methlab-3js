import { useEffect, useRef, useState } from 'react';
import Head from 'next/head';
import styles from '../../styles/styles.module.css';

import * as THREE from 'three';
import Stats from 'three/addons/libs/stats.module.js';

import { config } from '../config.js';
import { Avatar } from '../avatar.js';

import { setupRenderer, setupScene, setupCamera, setupLights, setupOrbitControls, setupAudio, bloomFilter } from '../utils.js';

export default function Scene1() {
    const containerRef = useRef(null);

    useEffect(() => {
        const clock = new THREE.Clock();
        const stats = new Stats();
        document.body.appendChild(stats.dom);

        // Create a renderer
        const sceneName = config.scenes[1].name;
        const renderer = setupRenderer(containerRef);
        const scene = setupScene(sceneName, renderer);
        const camera = setupCamera(renderer);
        const composer = config.postProcessing.enabled? bloomFilter(renderer, scene, camera): null;
        const light = setupLights(scene);
        const controls = config.orbitControls ? setupOrbitControls(camera, renderer) : null;
        const sound = setupAudio(sceneName, camera);
        const updatables = [];
        const disposables = [renderer, scene, camera, composer, light, controls, sound];

        // Hot Module Replacement (HMR) - Remove this snippet to remove HMR.
        if (module.hot) {
            module.hot.dispose(() => {
                // This function is called before the current module is replaced.
                sound.stop();
            });
        }

        // Animation loop
        const animate = () => {
            try {
                requestAnimationFrame(animate);
                updatables.forEach(updatable => updatable.update(clock.getDelta()));

                renderer.render(scene, camera);
                if (config.postProcessing.enabled) composer.render();
                stats.update();
            } catch (error) {
                console.error("Error during animation: ", error);
            }
        };

        animate();

        let avatar;
        try {
            avatar = new Avatar(sceneName, camera, scene, animate, [], controls);
            avatar.load();
            avatar.bindKeyEvents();
            updatables.push(avatar);
        } catch (error) {
            console.error("Error initializing avatar: ", error);
        }

        // Handle window resize
        window.addEventListener('resize', () => {
            renderer.setSize(window.innerWidth, window.innerHeight);
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            composer.setSize(window.innerWidth, window.innerHeight);
        });

        // Add a mouse Move event 
        window.addEventListener('mousemove', (event) => {
            // If sound is not playing, play it
            if (sound.context.state !== 'running') {
                sound.context.resume();
            }
        });

        // Add a click event for the close button
        const closeModal = document.getElementById('closeModal');
        closeModal.addEventListener('click', () => {
            // Hide the modal #modal
            const modal = document.getElementById('modal');
            modal.style.display = 'none';
        });

        // Add a keydown event for SPACE 
        window.addEventListener('keydown', (event) => {
            // Check if the key pressed is the space bar
            // If the modal is already open, close it 
            if (event.code === 'Escape') {
                // Hide the modal #modal
                const modal = document.getElementById('modal');
                modal.style.display = 'none';
            } else if (event.code === 'Space') {
                // Check if avatar is in interactive region
                if (avatar.isInTheInteractiveRegion()) {
                    // Show the modal #modal
                    const modal = document.getElementById('modal');
                    modal.style.display = 'flex';
                }
            }
        });

        // Cleanup on unmount
        return () => {
            try {
                cancelAnimationFrame(animate);
                window.removeEventListener('resize');
                sound.stop();
                disposables.forEach(disposable => {
                    if (disposable && disposable.dispose) {
                        disposable.dispose();
                    }
                });
                document.body.removeChild(stats.dom);
            } catch (error) {
                console.error("Error during component cleanup: ", error);
            }
        };

    }, []);

    return (
        <div ref={containerRef} className={styles.mainCanvas}>
            <Head>
                <title>Diner</title>
            </Head>
            <div id="modal" className={styles.modal}>
                <div id="modalHeader" className={styles.modalHeader}>
                    <p id="modalTitle" className={styles.modalTitle}>Diner</p>
                    <button id="closeModal" className={styles.closeModal}>&times;</button>
                </div>
                <div id="modalBody" className={styles.modalBody}>
                    <p id="modalText" className={styles.modalText}>Modal UI placeholder</p>
                </div>
            </div>
        </div>
    );
}