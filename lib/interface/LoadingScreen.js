/**
 * @fileoverview This file defines the LoadingScreen component.
 * The LoadingScreen component is used to display the loading screen for the game.
 * @package
 * @module interface/LoadingScreen
 * @author gv-sh
 * @version 1.0.0
 */

/**
 * Component representing the loading screen for the game.
 * @param {Object} props - The props object.
 * @param {number} props.loadingProgress - The loading progress in percentage.
 * @param {string} props.loadingText - The loading text.
 */
export const LoadingScreen = ({ loadingProgress, loadingText }) => {
    return (
        <div id="overlay">
            <div id="loading">
                <div id="loading-bar">
                    <div id="loading-progress" style={{ width: `${loadingProgress}%` }}></div>
                </div>
                <div id="loading-text">{loadingText}</div>
            </div>
        </div>
    );
}