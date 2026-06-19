import { ExplorerMode } from './appModes/ExplorerMode.js';
import { ExperimentMode } from './appModes/ExperimentMode.js';

let currentMode = null;
let currentModeType = null;

const appContainer = document.getElementById('app');

function destroyCurrentMode() {
    if (currentMode && typeof currentMode.destroy === 'function') {
        currentMode.destroy();
    }

    if (appContainer) {
        appContainer.innerHTML = '';
        appContainer.removeAttribute('data-app-view');
    }

    currentMode = null;
    currentModeType = null;
}

function setActiveTopNav(modeType) {
    const explorerBtn = document.querySelector('[data-mode="explorer"]');
    const experimentBtn = document.querySelector('[data-mode="experiment"]');

    const isExplorer = modeType === 'explorer';
    const isExperiment = modeType === 'experiment';

    if (explorerBtn) {
        explorerBtn.classList.toggle('active', isExplorer);
        explorerBtn.setAttribute('aria-selected', String(isExplorer));
        explorerBtn.setAttribute('tabindex', isExplorer ? '0' : '-1');
    }

    if (experimentBtn) {
        experimentBtn.classList.toggle('active', isExperiment);
        experimentBtn.setAttribute('aria-selected', String(isExperiment));
        experimentBtn.setAttribute('tabindex', isExperiment ? '0' : '-1');
    }
}

async function switchMode(modeType) {
    if (!appContainer) return;
    if (currentModeType === modeType) return;

    destroyCurrentMode();

    if (modeType === 'explorer') {
        currentMode = new ExplorerMode(appContainer);
    } else if (modeType === 'experiment') {
        currentMode = new ExperimentMode(appContainer);
    } else {
        return;
    }

    appContainer.setAttribute('data-app-view', modeType);

    await currentMode.start();
    currentModeType = modeType;
    setActiveTopNav(modeType);
}

window.addEventListener('DOMContentLoaded', () => {
    const explorerBtn = document.querySelector('[data-mode="explorer"]');
    const experimentBtn = document.querySelector('[data-mode="experiment"]');

    if (explorerBtn) {
        explorerBtn.addEventListener('click', () => switchMode('explorer'));
    }

    if (experimentBtn) {
        experimentBtn.addEventListener('click', () => switchMode('experiment'));
    }

    switchMode('explorer');
});