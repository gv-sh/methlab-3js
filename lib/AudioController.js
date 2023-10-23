import * as THREE from 'three';

/**
 * Class representing an audio controller for a THREE.js scene.
 */
export class AudioController {
    /**
     * Create an audio controller.
     * @param {THREE.AudioListener} listener - The audio listener for the scene.
     * @param {string} soundPath - The path to the audio file.
     * @param {boolean} [loop=true] - Whether the audio should loop.
     * @param {number} [volume=0.5] - The volume of the audio.
     */
    constructor(listener, soundPath, loop = true, volume = 0.5) {
        this.sound = new THREE.Audio(listener);
        this.audioLoader = new THREE.AudioLoader();

        this.audioLoader.load(
            soundPath,
            /**
             * @param {AudioBuffer} buffer - The loaded audio buffer.
             */
            (buffer) => {
                this.sound.setBuffer(buffer);
                this.sound.setLoop(loop);
                this.sound.setVolume(volume);
            },
            undefined,
            /**
             * @param {Error} error - The error that occurred while loading the audio.
             */
            (error) => {
                console.error('Error loading audio:', error);
            }
        );
    }

    /**
     * Play the audio.
     */
    play() {
        // Check and resume the AudioContext if it's suspended
        if (this.sound.context.state === 'suspended') {
            this.sound.context.resume().then(() => {
                if (!this.sound.isPlaying) {
                    this.sound.play();
                }
            });
        } else if (!this.sound.isPlaying) {
            this.sound.play();
        }
    }

    /**
     * Pause the audio.
     */
    pause() {
        if (this.sound.isPlaying) {
            this.sound.pause();
        }
    }

    /**
     * Stop the audio.
     */
    stop() {
        if (this.sound.isPlaying) {
            this.sound.stop();
        }
    }

    /**
     * Set the volume of the audio.
     * @param {number} value - The new volume value.
     */
    setVolume(value) {
        this.sound.setVolume(value);
    }

    /**
     * Dispose of the audio buffer.
     */
    dispose() {
        if (this.sound.buffer) {
            this.sound.buffer.dispose();
        }
    }
}