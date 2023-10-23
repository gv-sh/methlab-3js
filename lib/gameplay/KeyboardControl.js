/**
 * @fileoverview This file defines the KeyboardControl class.
 * The KeyboardControl class is used to control a 3D model in a scene using the keyboard.
 * It is used to move the model in the scene and to change the animation of the model.
 * It also handles the sound of the model's movement.
 * @package
 * @module gameplay/KeyboardControl
 * @author gv-sh
 * @version 1.0.0
 */

import * as THREE from 'three';
import { config } from '../../config';
import { AudioControl } from '../sound/AudioControl';
import { isPointInsidePolygon } from '../math/Raycasting';

export const W = "w";
export const A = "a";
export const S = "s";
export const D = "d";

export const DIRECTIONS = [W, A, S, D];
export const IDLE = 'Idle';
export const WALKING = 'Walking';

/**
 * Class representing a keyboard controller for a 3D model in a scene.
 */
export class KeyboardControl {
    /**
     * Create a keyboard controller.
     * @param {THREE.Object3D} model - The 3D model to control.
     * @param {THREE.AnimationMixer} mixer - The animation mixer for the model.
     * @param {Map<string, THREE.AnimationClip>} animationsMap - A map of animation clips for the model.
     * @param {THREE.OrbitControls} orbitControl - The orbit control for the camera.
     * @param {THREE.Camera} camera - The camera in the scene.
     * @param {string} currentAction - The current animation action for the model.
     * @param {string} worldID - The ID of the current world in the scene.
     */
    constructor(model, mixer, animationsMap, orbitControl, camera, currentAction, worldID, reactStates) {
        Object.assign(this, {
            model,
            mixer,
            animationsMap,
            orbitControl,
            camera,
            currentAction,
            cameraTarget: new THREE.Vector3(),
            walkDirection: new THREE.Vector3(),
            rotateAngle: new THREE.Vector3(0, 1, 0),
            rotateQuarternion: new THREE.Quaternion(),
            fadeDuration: 0.2,
            walkVelocity: config.global.player.speed,
            worldID: worldID,
            reactStates: reactStates
        });
        this.audioListener = new THREE.AudioListener();
        this.walkSound = new AudioControl(this.audioListener, config.worlds[this.worldID].player.walkSound, true, 0.5);
        this.camera.add(this.audioListener);
        this.animationsMap.get(currentAction)?.play();
        this.updateCameraTarget(0, 0);
        this.walkableRegions = config.worlds[this.worldID].scene.walkableRegions.whitelist;
        this.interactiveRegions = config.worlds[this.worldID].scene.interactiveRegions.whitelist;
        this.teleportRegions = config.worlds[this.worldID].scene.teleportRegions.whitelist;
        this.raycaster = new THREE.Raycaster();
    }

    /**
     * Set the volume of the walking sound.
     * @param {number} value - The volume value to set.
     */
    setVolume(value) {
        this.walkSound.setVolume(value);
    }

    /**
     * Update the controller state.
     * @param {number} delta - The time delta since the last update.
     * @param {Object} keysPressed - An object containing the state of the keyboard keys.
     */
    update(delta, keysPressed) {
        const directionPressed = DIRECTIONS.some(key => keysPressed[key]);
        const nextAction = directionPressed ? WALKING : IDLE;

        this.changeAnimationIfNeeded(nextAction);
        this.mixer.update(delta);

        nextAction === WALKING ? this.handleWalkingMovement(delta, keysPressed) : null;
    }

    /**
     * Change the current animation action if needed.
     * @param {string} nextAction - The next animation action to play.
     */
    changeAnimationIfNeeded(nextAction) {
        if (this.currentAction !== nextAction) {
            this.animationsMap.get(this.currentAction)?.fadeOut(this.fadeDuration);
            this.animationsMap.get(nextAction)?.reset().fadeIn(this.fadeDuration).play()

            if (nextAction === WALKING) {
                this.walkSound.play();
            } else {
                this.walkSound.stop();
            }

            this.currentAction = nextAction;
        }
    }

    /**
     * Check if the model is inside any of the walkable regions.
     * @param {number} x - The x position of the model.
     * @param {number} z - The z position of the model.
     * @returns {boolean} - True if the model is inside a walkable region, false otherwise.
     */
    isModelInsideWalkableRegions(x, z) {

        // Loop over the walkable regions and check if the model is inside any of them
        for (let i = 0; i < this.walkableRegions.length; i++) {
            // Create an array to hold vertex coordinates
            const vertices = this.walkableRegions[i].map((vertex) => {
                return { x: vertex[0], y: vertex[2] };
            });

            if (isPointInsidePolygon({ x: x, y: z }, vertices)) {
                return true;
            }
        }

        return false;
    }

    isModelInsideInteractiveRegions(x, z) {

        // Loop over the interactive regions and check if the model is inside any of them
        for (let i = 0; i < this.interactiveRegions.length; i++) {
            // Create an array to hold vertex coordinates
            const vertices = this.interactiveRegions[i].map((vertex) => {
                return { x: vertex[0], y: vertex[2] };
            });

            if (isPointInsidePolygon({ x: x, y: z }, vertices)) {
                return true;
            }
        }

        return false;
    }

    isModelInsideTeleportRegions(x, z) {

        // Loop over the teleport regions and check if the model is inside any of them
        for (let i = 0; i < this.teleportRegions.length; i++) {
            // Create an array to hold vertex coordinates
            const vertices = this.teleportRegions[i].map((vertex) => {
                return { x: vertex[0], y: vertex[2] };
            });

            if (isPointInsidePolygon({ x: x, y: z }, vertices)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Handle the walking movement of the model.
     * @param {number} delta - The time delta since the last update.
     * @param {Object} keysPressed - An object containing the state of the keyboard keys.
     */
    handleWalkingMovement(delta, keysPressed) {
        const angleYCameraDirection = Math.atan2(
            (this.camera.position.x - this.model.position.x),
            (this.camera.position.z - this.model.position.z)
        );

        const directionOffset = this.directionOffset(keysPressed);

        this.rotateQuarternion.setFromAxisAngle(this.rotateAngle, angleYCameraDirection + directionOffset);
        this.model.quaternion.rotateTowards(this.rotateQuarternion, 0.2);

        this.camera.getWorldDirection(this.walkDirection);
        this.walkDirection.y = 0;
        this.walkDirection.normalize().applyAxisAngle(this.rotateAngle, directionOffset);

        const moveX = this.walkDirection.x * this.walkVelocity * delta;
        const moveZ = this.walkDirection.z * this.walkVelocity * delta;

        if (this.isModelInsideWalkableRegions(this.model.position.x + moveX, this.model.position.z + moveZ)) {
            this.model.position.x += moveX;
            this.model.position.z += moveZ;
            this.updateCameraTarget(moveX, moveZ);
        }

    }

    /**
     * Update the camera target position.
     * @param {number} moveX - The amount to move the camera in the x direction.
     * @param {number} moveZ - The amount to move the camera in the z direction.
     */
    updateCameraTarget(moveX, moveZ) {
        this.camera.position.x += moveX;
        this.camera.position.z += moveZ;

        this.cameraTarget.set(this.model.position.x, this.model.position.y + 1, this.model.position.z);
        this.orbitControl.target.copy(this.cameraTarget);
    }

    /**
     * Calculate the direction offset based on the keyboard keys pressed.
     * @param {Object} keysPressed - An object containing the state of the keyboard keys.
     * @returns {number} - The direction offset value.
     */
    directionOffset(keysPressed) {
        if (keysPressed[W]) {
            return keysPressed[A] ? Math.PI / 4 : (keysPressed[D] ? -Math.PI / 4 : 0);
        } else if (keysPressed[S]) {
            if (keysPressed[A]) return Math.PI * 3 / 4;
            if (keysPressed[D]) return -Math.PI * 3 / 4;
            return Math.PI;
        } else if (keysPressed[A]) {
            return Math.PI / 2;
        } else if (keysPressed[D]) {
            return -Math.PI / 2;
        }
        return 0;
    }
}