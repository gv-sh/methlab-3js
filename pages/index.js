import * as THREE from 'three';
import { useEffect, useState } from 'react';
import Stats from 'three/examples/jsm/libs/stats.module.js';

import { config } from '../config.js';
import { Level } from '../lib/Level.js';


const CubePage = () => {

    const [loadingProgress, setLoadingProgress] = useState(0);
    const [loadingText, setLoadingText] = useState('Loading assets...');
    const [isLoaded, setIsLoaded] = useState(false);
    let soundOn = true; // Assuming sound is on by default


    useEffect(() => {

        let level = new Level(0);

        if (module.hot) {
            module.hot.dispose(() => {
                // Stop all sounds 
                level.bgm.stop();
            });
        }

        const soundButton = document.getElementById('soundToggle');

        soundButton.addEventListener('click', () => {
            soundOn = !soundOn;

            if (soundOn) {
                soundButton.innerText = "Sound: ON";
                // Add a class soundOn to the body to indicate that sound is on
                soundButton.classList.add('soundOn');
                level.setVolume(0.5);
                level.keyboardController.setVolume(0.5);

            } else {
                soundButton.innerText = "Sound: OFF";
                // Remove the class soundOn from the body to indicate that sound is off
                soundButton.classList.remove('soundOn');
                level.setVolume(0);
                level.keyboardController.setVolume(0);
            }
        });

        const main = async () => {

            setLoadingText('Initialising renderer...');
            await level.initialiseRenderer(window);
            setLoadingProgress(prev => prev + 5);

            setLoadingText('Loading environment map...');
            await level.loadEnvMap();
            setLoadingProgress(prev => prev + 10);

            setLoadingText('Loading scene...');
            await level.loadScene();
            setLoadingProgress(prev => prev + 50);

            setLoadingText('Setting up camera...');
            await level.setupCamera();
            setLoadingProgress(prev => prev + 5);

            setLoadingText('Setting up orbit controls...');
            await level.setupOrbitControls(level.camera);
            setLoadingProgress(prev => prev + 5);

            setLoadingText('Loading player...');
            await level.loadPlayer();
            setLoadingProgress(prev => prev + 15);

            setLoadingText('Starting...');
            level.addGridHelper();

            level.bindKeyboardEvents();

            level.bgm.play();

            document.getElementById('cube-container').appendChild(level.renderer.domElement);

            level.animate();

            level.bindStats(new Stats());
            config.global.showStats ? document.body.appendChild(level.stats.dom) : null;

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
                <div id="overlay">
                    <div id="loading">
                        <div id="loading-bar">
                            <div id="loading-progress" style={{ width: `${loadingProgress}%` }}></div>
                        </div>
                        <div id="loading-text">{loadingText}</div>
                    </div>
                </div>
            )}
            <div id="cube-container" style={{ width: '100vw', height: '100vh' }}>
            </div>
            <div id="left-bottom-ui">
                <div className="table">
                    <div className="row">
                        <div className="cell">W</div>
                        <div className="cell">Forward</div>
                    </div>
                    <div className="row">
                        <div className="cell">A</div>
                        <div className="cell">Left</div>
                    </div>
                    <div className="row">
                        <div className="cell">S</div>
                        <div className="cell">Backward</div>
                    </div>
                    <div className="row">
                        <div className="cell">D</div>
                        <div className="cell">Right</div>
                    </div>
                    <div className="row">
                        <div className="cell">Mouse</div>
                        <div className="cell">Look around</div>
                    </div>
                    <div className="row">
                        <div className="cell">SPACE</div>
                        <div className="cell">Interact</div>
                    </div>
                </div>
            </div>
            <div id="bottom-ui">
            </div>
            <div id="right-bottom-ui">
                <button id="soundToggle">{soundOn ? "Sound: ON" : "Sound: OFF"}</button>
            </div>
        </div>
    );
};

export default CubePage;
