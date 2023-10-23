/**
 * @fileoverview This file defines the KeyboardMap component.
 * The KeyboardMap component is used to display the keyboard map for the game.
 * @package
 * @module interface/KeyboardMap
 * @author gv-sh
 * @version 1.0.0
 */

/**
 * Component representing the keyboard map for the game.
 */
export const KeyboardMap = () => {
    return (
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
    );
}