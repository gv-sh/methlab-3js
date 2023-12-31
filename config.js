export const config = {
    global: {
        showStats: true,
        camera: {
            fov: 100,
            near: 0.1,
            far: 100,
            initialPosition: [0, 1.35, -1],
        },
        orbitControls: {
            enabled: true,
            minDistance: 1,
            maxDistance: 2,
            minPolarAngle: Math.PI / 4,
            maxPolarAngle: Math.PI / 2,
            damping: {
                enabled: true,
                factor: 0.05,
            },
            screenSpacePanning: false,
        },
        dracoPath: 'draco/',
        player: {
            speed: 1.2
        }
    },
    worldSelector: {
        sceneModel: 'glb/WorldSelector3.glb',
        player1Model: 'glb/Walter.glb',
        player2Model: 'glb/GusFring.glb',
        player1IdleState: 1,
        player2IdleState: 0,
        camera: {
            fov: 15,
            near: 0.1,
            far: 1000,
            initialPosition: [0, 3, 25]
        },
    },
    worlds: [
        {
            name: 'MethLab',
            scene: {
                modelPath: 'glb/MethLab.glb',
                environmentMap: 'hdr/MethLab.hdr',
                elevationOffset: -0.25,
                bgm: 'mp3/deep-research-144798.mp3',
                walkableRegions: {
                    whitelist: [
                        [
                            [-0.8, 0, -0.6],
                            [0.6, 0, -0.6],
                            [0.6, 0, 8],
                            [-0.8, 0, 8],
                            [-0.8, 0, -0.6] // Last vertex must be same as first vertex
                        ],
                        [
                            // Add vertices of next polygon here
                        ]
                    ],
                    visible: true,
                    color: 0x00ff00,
                },
                interactiveRegions: {
                    whitelist: [
                        [
                            [-0.5, 0, 2.5],
                            [1, 0, 2.5],
                            [1, 0, 4.5],
                            [-0.5, 0, 4.5],
                            [-0.5, 0, 2.5] // Last vertex must be same as first vertex
                        ],
                    ],
                    visible: true,
                    color: 0xff0000,
                },
                teleportRegions: {
                    whitelist: [
                        [
                            [-0.5, 0, 5.5],
                            [1, 0, 5.5],
                            [1, 0, 7.5],
                            [-0.5, 0, 7.5],
                            [-0.5, 0, 5.5] // Last vertex must be same as first vertex
                        ]
                    ],
                    visible: true,
                    color: 0x0000ff,
                }
            },
            player: {
                modelPath: 'glb/Walter.glb',
                initialPosition: [0, 0, 0],

                initialOrientation: Math.PI,
                scale: 1,
                walkSound: 'mp3/step_soundwav-14903.mp3',
            }
        },
        {
            name: 'Spacebar',
            scene: {
                modelPath: 'glb/Spacebar.glb',
                environmentMap: 'hdr/Spacebar.hdr',
                elevationOffset: 5.5,
                bgm: 'mp3/deep-research-144798.mp3',
                walkableRegions: {
                    whitelist: [
                        [
                            [-0.8, 0, -0.6],
                            [0.6, 0, -0.6],
                            [0.6, 0, 8],
                            [-0.8, 0, 8],
                            [-0.8, 0, -0.6] // Last vertex must be same as first vertex
                        ],
                        [
                            // Add vertices of next polygon here
                        ]
                    ],
                    visible: true,
                    color: 0x00ff00,
                },
                interactiveRegions: {
                    whitelist: [
                        [
                            [-0.5, 0, 2.5],
                            [1, 0, 2.5],
                            [1, 0, 4.5],
                            [-0.5, 0, 4.5],
                            [-0.5, 0, 2.5] // Last vertex must be same as first vertex
                        ],
                    ],
                    visible: true,
                    color: 0xff0000,
                },
                teleportRegions: {
                    whitelist: [
                        [
                            [-0.5, 0, 5.5],
                            [1, 0, 5.5],
                            [1, 0, 7.5],
                            [-0.5, 0, 7.5],
                            [-0.5, 0, 5.5] // Last vertex must be same as first vertex
                        ]
                    ],
                    visible: true,
                    color: 0x0000ff,
                }
            },
            player: {
                modelPath: 'glb/GusFring.glb',
                initialPosition: [0, 0, 0],

                initialOrientation: Math.PI,
                scale: 1,
                walkSound: 'mp3/step_soundwav-14903.mp3',
            }
        }
    ]
};