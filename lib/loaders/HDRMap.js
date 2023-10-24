
import * as THREE from 'three';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';

export class HDRMap {
    constructor(path, renderer) {
        this.path = path;
        this.envMapLoader = new RGBELoader();
        this.texture;
        this.pmremGenerator;
        this.envMap;
        this.renderer = renderer;
    }
    async load() {
        try {
            this.texture = await new Promise((resolve, reject) => {
                this.envMapLoader.load(this.path, resolve, undefined, reject);
            });

            this.pmremGenerator = new THREE.PMREMGenerator(this.renderer);
            this.envMap = this.pmremGenerator.fromEquirectangular(this.texture).texture;
            // scene.environment = this.envMap;

            this.texture.dispose();
            this.pmremGenerator.dispose();

            return this.envMap;
        }
        catch (error) {
            console.error('Error loading HDR environment map:', error);
        }
    }
}