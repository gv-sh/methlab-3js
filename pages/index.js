import { useEffect, useRef } from 'react';
import Head from 'next/head';
import styles from '../styles/styles.module.css';
import { config } from './config.js';

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
                    <li><a className={styles.link} href="/scene1">{ config.scenes[0].name } (Work in Progress)</a></li>
                    <li><a className={styles.link} href="/scene2">{ config.scenes[1].name } (Work in Progress)</a></li>
                    <li><a className={styles.link} href="/scene3">Scene 3 (Unavailable)</a></li>
                    <li><a className={styles.link} href="/scene4">Scene 4 (Unavailable)</a></li>
                </ul>
            </main>
        </div>
    );
}