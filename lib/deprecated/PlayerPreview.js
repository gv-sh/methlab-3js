import * as THREE from 'three';
import { GLBModel } from '../loaders/GLBModel';
import { config } from '../../config';

import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

export class PlayerPreview {
    constructor(path, canvasRef) {
        this.path = path;
        this.canvasRef = canvasRef;
        const aspectRatio = canvasRef.current.clientWidth / canvasRef.current.clientHeight;
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(40, aspectRatio, 0.1, 1000);

        // Position the camera further away to capture the whole model and slightly up the Y-axis
        this.camera.position.set(0, 5, 1);

        this.renderer = new THREE.WebGLRenderer({ canvas: canvasRef.current, antialias: true });
        this.renderer.setPixelRatio(window.devicePixelRatio); // Ensuring we have high DPI on retina displays, etc.

        // Use proper shadow maps for better quality
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        this.controls = null;
    }
    load = async () => {
        try {
            const glbModel = new GLBModel(this.path);
            const gltf = await glbModel.load();

            const model = gltf.scene;
            this.scene.add(model);

            // Adjust the model's position to ensure it's centered vertically
            model.position.y = -1;

            // Adding better lighting
            const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444);
            hemiLight.position.set(0, 20, 0);
            this.scene.add(hemiLight);

            const dirLight = new THREE.DirectionalLight(0xffffff);
            dirLight.position.set(0, 10, -10);
            dirLight.castShadow = true;
            this.scene.add(dirLight);

            // Add shadow
            dirLight.shadow.mapSize.width = 2048;
            dirLight.shadow.mapSize.height = 2048;

            // Add shadow to the model
            model.traverse((child) => {
                if (child.isMesh) {
                    child.castShadow = true;
                }
            });

            // Add a plane
            const planeGeometry = new THREE.PlaneGeometry(100, 100);
            const planeMaterial = new THREE.MeshPhongMaterial({ color: 0x999999, depthWrite: false });
            const plane = new THREE.Mesh(planeGeometry, planeMaterial);
            plane.position.y = 0;
            plane.rotation.x = -Math.PI / 2;
            plane.receiveShadow = true;
            this.scene.add(plane);

            // Add fog
            this.scene.fog = new THREE.Fog(0xaaaaaa, 0, 10);


            // Adjust the canvas size for better fit and resolution
            this.renderer.setSize(this.canvasRef.current.clientWidth, this.canvasRef.current.clientHeight);

            // Background color (optional)
            this.renderer.setClearColor(0xaaaaaa, 1); // Set a background color if needed

            this.controls = new OrbitControls(this.camera, this.renderer.domElement);

            // Get the model center
            const box = new THREE.Box3().setFromObject(model);
            const center = box.getCenter(new THREE.Vector3());

            // Adjust the camera position to frame the model
            const size = box.getSize(new THREE.Vector3()).length();
            this.controls.reset();
            this.camera.position.copy(center);
            this.camera.position.x += 0;
            this.camera.position.y += 3;
            this.camera.position.z += 0;

            // Only allow horizontal rotation
            this.controls.minPolarAngle = Math.PI / 2;
            this.controls.maxPolarAngle = Math.PI / 2;

            // Disable zooming
            this.controls.enableZoom = false;

            // Set the model to walk animation
            const mixer = new THREE.AnimationMixer(model);
            const clips = gltf.animations;
            // Get the clip with the name "Idle"
            const clip = THREE.AnimationClip.findByName(clips, 'Idle');
            const action = mixer.clipAction(clip);
            action.play();

            // Clock
            const clock = new THREE.Clock();

            // Rotate the model 
            // model.rotation.y = - Math.PI / 2;


            const animate = () => {
                const delta = clock.getDelta();
                requestAnimationFrame(animate);
                if (this.controls) this.controls.update(); // Required if controls are added

                // Update the animation
                mixer.update(delta);

                this.renderer.render(this.scene, this.camera);
            }
            animate();
        } catch (error) {
            console.error(error);
        }
    }

}