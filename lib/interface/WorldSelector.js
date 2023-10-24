import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLBModel } from '../loaders/GLBModel';
import { config } from '../../config';

import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { PlayerPreview } from './PlayerPreview';
import { LoadingScreen } from './LoadingScreen';

const WorldSelector = () => {
    const canvas1Ref = useRef(null);
    const canvas2Ref = useRef(null);
    const [loadingProgress, setLoadingProgress] = useState(0);
    const [loadingText, setLoadingText] = useState('Loading assets...');
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {

        setLoadingText('Loading Walter...');
        const walterPreview = new PlayerPreview(config.worlds[0].player.modelPath, canvas1Ref);
        walterPreview.load();
        setLoadingProgress(50);

        setLoadingText('Loading Gus Fring...');
        const gusPreview = new PlayerPreview(config.worlds[1].player.modelPath, canvas2Ref);
        gusPreview.load();
        setLoadingProgress(100);

        // Add event listeners to each canvas
        canvas1Ref.current.addEventListener("click", () => {
            // Open Methlab
            window.location.href = "/MethLab";
        });
        canvas2Ref.current.addEventListener("click", () => {
            window.location.href = "/Spacebar";
        });

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
            <div id="world-selector">

                <canvas ref={canvas1Ref}></canvas>
                <canvas ref={canvas2Ref}></canvas>
            </div>
        </div>
    );
};

export default WorldSelector;
