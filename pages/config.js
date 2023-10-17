import * as THREE from 'three';

export const config = {
    fog: {
        color: 0x000000,
        near: 10,
        far: 30,
        visible: false
    },
    onScreenControls: {
        consoleTimeout: 3000,
        fpsStats: true,
    },
    showGridHelper: false,
    followCamOffset: new THREE.Vector3(0, 1.5, -1.5),
    bokehPass: false,
    renderer: {
        antialias: true,
        shadowMapEnabled: true,
        shadowMapType: THREE.PCFSoftShadowMap,
        toneMapping: THREE.ACESFilmicToneMapping,
    },
    orbitControls: true,
    avatar: {
        animations: {
            idle: 1,
            walk: 2
        },
        skeletonHelper: false,
        speed: 0.05,
        turnSpeed: 0.1,
        visible: true,
        orbitControls: {
            minDistance: 1.5,
            maxDistance: 3,
            minPolarAngle: Math.PI / 4,
            maxPolarAngle: Math.PI / 2
        },
        modelPath: 'gltf/Walter2.glb',
        walkingSound: 'mp3/step_soundwav-14903.mp3',
        walkingSoundVolume: 0.5
    },
    camera: {
        fov: 80,
        near: 0.35,
        far: 20
    },
    scenes: [
        {
            name: 'MethLab',
            modelPath: 'gltf/MethLAB.glb',
            environmentMap: 'hdr/environment.hdr',
            elevationOffset: -.25,
            walkableRegion: {
                vertices: [
                    new THREE.Vector3(-0.8, 0, -0.6),
                    new THREE.Vector3(0.6, 0, -0.6),
                    new THREE.Vector3(0.6, 0, 8),
                    new THREE.Vector3(-0.8, 0, 8),
                    new THREE.Vector3(-0.8, 0, -0.6)
                ],
                visible: false,
                color: 0x00ff00,
            },
            interactiveRegion: {
                vertices: [
                    new THREE.Vector3(-0.5, 0, 2.5),
                    new THREE.Vector3(1, 0, 2.5),
                    new THREE.Vector3(1, 0, 4.5),
                    new THREE.Vector3(-0.5, 0, 4.5),
                    new THREE.Vector3(-0.5, 0, 2.5)
                ],
                visible: false,
                color: 0xff0000,
            },
            bgm: 'mp3/deep-research-144798.mp3',
            bgmVolume: 0.01
        },
        {
            name: 'Diner',
            modelPath: 'gltf/diner.glb',
            environmentMap: 'hdr/Cracked Road HDR.hdr',
            elevationOffset: 0,
            walkableRegion: {
                vertices: [
                    new THREE.Vector3(-4.5, 0, -1),
                    new THREE.Vector3(6.2, 0, -1),
                    new THREE.Vector3(6.2, 0, 1.5),
                    new THREE.Vector3(-4.5, 0, 1.5),
                    new THREE.Vector3(-4.5, 0, -1)
                ],
                visible: false,
                color: 0x00ff00,
            },
            interactiveRegion: {
                vertices: [
                    new THREE.Vector3(5, 0, -1),
                    new THREE.Vector3(7, 0, -1),
                    new THREE.Vector3(7, 0, 1),
                    new THREE.Vector3(5, 0, 1),
                    new THREE.Vector3(5, 0, -1)
                ],
                visible: false,
                color: 0xff0000,
            },
            bgm: 'mp3/fun-times-together-112809.mp3',
            bgmVolume: 0.01
        }
    ],
    postProcessing: {
        enabled: false,
        bloomParams: {
            threshold: 0,
            strength: 0.2,
            radius: 0,
            exposure: 1,
        }
    }
};