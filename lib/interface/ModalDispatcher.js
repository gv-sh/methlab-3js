/**
 * @fileoverview This file defines the ModalDispatcher component.
 * The ModalDispatcher component is used to display the required modals during the gameplay.
 * @package
 * @module interface/ModalDispatcher
 * @author gv-sh
 * @version 1.0.0
 */

import MethLab from '../vendor/MethLab';
import Modal2 from '../vendor/Modal2';

/**
 * Component representing the modal dispatcher for the game.
 * @param {Object} props - The props object.
 * @param {number} props.worldID - The world ID.
 */
export const ModalDispatcher = ({ worldID }) => {
    if (worldID === 0) {
        return <MethLab />;
    }
    else if (worldID === 1) {
        return <Modal2 />;
    }
}