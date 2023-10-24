import { config } from '../../config';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader';

export class GLBModel {
    constructor(path) {
        this.path = path;
        this.modelLoader = new GLTFLoader();
        this.dracoLoader = new DRACOLoader();
        this.dracoLoader.setDecoderPath(config.global.dracoPath);
        this.modelLoader.setDRACOLoader(this.dracoLoader);
    }
    async load() {
        try {
            const gltf = await new Promise((resolve, reject) => {
                this.modelLoader.load(this.path, resolve, undefined, reject);
            });

            return gltf;
        }
        catch (error) {
            console.error('Error loading scene:', error);
        }
    }
}