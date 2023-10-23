/**
 * @fileoverview This file defines the Simulator component.
 * The Simulator component is used to display and play the game.
 * @package
 * @module interface/Simulator
 * @author gv-sh
 * @version 1.0.0
 */

import { useEffect, useState } from 'react';
import Stats from 'three/examples/jsm/libs/stats.module.js';

import { config } from '../../config.js';
import { World } from '../gameplay/World.js';
import { KeyboardMap } from './KeyboardMap';
import { SoundToggle } from './SoundToggle';
import { LoadingScreen } from './LoadingScreen';
import { ModalDispatcher } from './ModalDispatcher';

/**
 * Component representing the simulator for the game.
 * @returns {Object} The Simulator component.
 */
export const Simulator = () => {

    const [loadingProgress, setLoadingProgress] = useState(0);
    const [loadingText, setLoadingText] = useState('Loading assets...');
    const [isLoaded, setIsLoaded] = useState(false);
    const worldID = 1;

    let soundOn = true; // Assuming sound is on by default

    useEffect(() => {

        let world = new World(worldID);

        if (module.hot) {
            module.hot.dispose(() => {
                // Stop all sounds 
                world.bgm.stop();
            });
        }

        const soundButton = document.getElementById('soundToggle');

        /**
         * Event listener for sound button
         */
        soundButton.addEventListener('click', () => {
            soundOn = !soundOn;

            if (soundOn) {
                soundButton.innerText = "Sound: ON";
                soundButton.classList.add('soundOn');
                world.setVolume(0.5);
                world.keyboardControl.setVolume(0.5);

            } else {
                soundButton.innerText = "Sound: OFF";
                // Remove the class soundOn from the body to indicate that sound is off
                soundButton.classList.remove('soundOn');
                world.setVolume(0);
                world.keyboardControl.setVolume(0);
            }
        });

        // Event listener for SPACE key
        document.addEventListener('keydown', (event) => {
            if (event.code === 'Space') {
                // Confirm if the player is inside an interactive region
                if (world.isPlayerInsideInteractiveRegion()) {
                    document.getElementById('modal').style.display = 'flex';
                }
            }
        });

        // Event listener for close button
        document.getElementById('closeModal').addEventListener('click', () => {
            document.getElementById('modal').style.display = 'none';
        });

        // Main function
        const main = async () => {

            setLoadingText('Initialising renderer...');
            await world.initialiseRenderer(window);
            setLoadingProgress(prev => prev + 5);

            setLoadingText('Loading environment map...');
            await world.loadEnvironmentMap();
            setLoadingProgress(prev => prev + 10);

            setLoadingText('Loading scene...');
            await world.loadScene();
            setLoadingProgress(prev => prev + 50);

            setLoadingText('Setting up camera...');
            await world.setupCamera();
            setLoadingProgress(prev => prev + 5);

            setLoadingText('Setting up orbit controls...');
            await world.setupOrbitControls(world.camera);
            setLoadingProgress(prev => prev + 5);

            setLoadingText('Loading player...');
            await world.loadPlayer();
            setLoadingProgress(prev => prev + 15);

            setLoadingText('Starting...');

            world.bindKeyboardEvents();

            world.bgm.play();

            document.getElementById('cube-container').appendChild(world.renderer.domElement);

            world.animate();

            world.bindStats(new Stats());
            config.global.showStats ? document.body.appendChild(world.stats.dom) : null;

            setLoadingProgress(prev => prev + 5);

            // After 300ms, set isLoaded to true to remove the loading screen
            setTimeout(() => {
                setIsLoaded(true);
            }, 500);
        }

        main();

    }, []);

    return (
        <div>
            {!isLoaded && (
                <LoadingScreen
                    loadingProgress={loadingProgress}
                    loadingText={loadingText}
                />
            )}
            <div id="cube-container" style={{ width: '100vw', height: '100vh' }}>
            </div>
            <KeyboardMap />
            <SoundToggle soundOn={soundOn} />
            <ModalDispatcher worldID={worldID} />
        </div>
    );
};