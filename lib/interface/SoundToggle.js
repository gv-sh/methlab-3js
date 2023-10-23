/**
 * @fileoverview This file defines the SoundToggle component.
 * The SoundToggle component is used to display the sound toggle button for the game.
 * @package
 * @module interface/SoundToggle
 * @author gv-sh
 * @version 1.0.0
 */

/**
 * Component representing the sound toggle button for the game.
 * @param {Object} props - The props object.
 * @param {boolean} props.soundOn - Whether the sound is on or off.
 */
export const SoundToggle = ({ soundOn }) => {
    return (
        <div id="right-bottom-ui" className="right-bottom-ui">
            <div id="soundToggle" className="soundToggle">
                {soundOn ? "Sound: ON" : "Sound: OFF"}
            </div>
        </div>
    );
}