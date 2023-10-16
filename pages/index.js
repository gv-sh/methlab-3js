import { useEffect, useRef } from 'react';
import Head from 'next/head';
import styles from '../styles/home.css';

export default function Home() { 
    return (
        <div className={styles.container}>
            <Head>
                <title>MethLAB Experience</title>
                <link rel="icon" href="/favicon.ico" />
            </Head>

            <main className={styles.main}>
                <h1 className={styles.title}>MethLAB Experience</h1>
                <ul className={styles.list}>
                    <li><a className={styles.link} href="/scene1">Scene 1 (Work in Progress)</a></li>
                    <li><a className={styles.link} href="/scene2">Scene 2 (Unavailable)</a></li>
                    <li><a className={styles.link} href="/scene3">Scene 3 (Unavailable)</a></li>
                    <li><a className={styles.link} href="/scene4">Scene 4 (Unavailable)</a></li>
                </ul>
            </main>
        </div>
    );
}