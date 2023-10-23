import styles from '../../styles/styles.module.css';

export const MethLabModalUI = () => {
    return (
        <div id="modal" className={styles.modal}>
            <div id="modalHeader" className={styles.modalHeader}>
                <p id="modalTitle" className={styles.modalTitle}>MethLAB</p>
                <button id="closeModal" className={styles.closeModal}>&times;</button>
            </div>
            <div id="modalBody" className={styles.modalBody}>
                <p id="modalText" className={styles.modalText}>Modal UI placeholder</p>
            </div>
        </div>
    );
}

export default MethLabModalUI;
