// js/appModes/ExperimentMode.js
import { SingleConfigExperiment } from './experimentModes/SingleConfigExperiment.js';
import { CompareConfigsExperiment } from './experimentModes/CompareConfigsExperiment.js';
import { ConfigLocalityExperiment } from './experimentModes/ConfigLocalityExperiment.js';

const EXPERIMENT_SUBMODES = [
    {
        key: 'single',
        label: 'Single Config',
        factory: (container) => new SingleConfigExperiment(container)
    },
    {
        key: 'locality',
        label: 'Locality Analysis',
        factory: (container) => new ConfigLocalityExperiment(container)
    },
    {
        key: 'compare',
        label: 'Config Comparison',
        factory: (container) => new CompareConfigsExperiment(container)
    }
];

export class ExperimentMode {
    constructor(container) {
        this.container = container;
        this.currentSubMode = null;
        this.currentSubModeKey = null;
        this._subModeContainer = null;
        this._tabButtons = [];
        this._appRoot = document.getElementById('app');
    }

    async start() {
        this._applyExperimentRoot(EXPERIMENT_SUBMODES[0].key);

        this.container.innerHTML = `
            <section class="experiment-mode" aria-label="Experiment workspace">
                <header class="experiment-mode__header">
                    <h2 class="experiment-mode__title">Experiments</h2>
                    <p class="experiment-mode__subtitle">
                        Run controlled analyses for one configuration, locality behavior, or cross-configuration comparison.
                    </p>
                </header>

                <div
                    class="exp-submode-tabs"
                    role="tablist"
                    aria-label="Experiment views"
                >
                    ${EXPERIMENT_SUBMODES.map((mode, index) => `
                        <button
                            class="submode-btn${index === 0 ? ' active' : ''}"
                            type="button"
                            data-submode="${mode.key}"
                            role="tab"
                            aria-selected="${index === 0 ? 'true' : 'false'}"
                            tabindex="${index === 0 ? '0' : '-1'}"
                            id="exp-tab-${mode.key}"
                            aria-controls="exp-panel-${mode.key}"
                        >
                            ${mode.label}
                        </button>
                    `).join('')}
                </div>

                <section
                    id="exp-panel-root"
                    class="sub-mode-container"
                    aria-live="polite"
                ></section>
            </section>
        `;

        this._subModeContainer = this.container.querySelector('#exp-panel-root');
        this._tabButtons = Array.from(this.container.querySelectorAll('[data-submode]'));

        this._bindEvents();
        this._switchSubMode(EXPERIMENT_SUBMODES[0].key);
    }

    _applyExperimentRoot(modeKey) {
        if (!this._appRoot) return;
        this._appRoot.setAttribute('data-app-view', 'experiment');
        this._appRoot.setAttribute('data-experiment-mode', modeKey);
    }

    _bindEvents() {
        this._tabButtons.forEach((btn) => {
            btn.addEventListener('click', () => {
                const nextKey = btn.dataset.submode;
                this._switchSubMode(nextKey);
            });

            btn.addEventListener('keydown', (event) => {
                const currentIndex = this._tabButtons.indexOf(btn);
                if (currentIndex === -1) return;

                let nextIndex = null;

                if (event.key === 'ArrowRight') {
                    nextIndex = (currentIndex + 1) % this._tabButtons.length;
                } else if (event.key === 'ArrowLeft') {
                    nextIndex = (currentIndex - 1 + this._tabButtons.length) % this._tabButtons.length;
                } else if (event.key === 'Home') {
                    nextIndex = 0;
                } else if (event.key === 'End') {
                    nextIndex = this._tabButtons.length - 1;
                }

                if (nextIndex === null) return;

                event.preventDefault();
                const nextButton = this._tabButtons[nextIndex];
                nextButton.focus();
                this._switchSubMode(nextButton.dataset.submode);
            });
        });
    }

    _setActiveSubModeButton(modeKey) {
        this._tabButtons.forEach((btn) => {
            const isActive = btn.dataset.submode === modeKey;
            btn.classList.toggle('active', isActive);
            btn.setAttribute('aria-selected', String(isActive));
            btn.setAttribute('tabindex', isActive ? '0' : '-1');
        });
    }

    _destroyCurrentSubMode() {
        if (this.currentSubMode && typeof this.currentSubMode.destroy === 'function') {
            this.currentSubMode.destroy();
        }

        this.currentSubMode = null;
        this.currentSubModeKey = null;

        if (this._subModeContainer) {
            this._subModeContainer.innerHTML = '';
        }
    }

    _switchSubMode(modeKey) {
        if (!this._subModeContainer) return;
        if (this.currentSubModeKey === modeKey) return;

        const definition = EXPERIMENT_SUBMODES.find((mode) => mode.key === modeKey);
        if (!definition) {
            throw new Error(`Unknown experiment submode: ${modeKey}`);
        }

        this._destroyCurrentSubMode();
        this._applyExperimentRoot(modeKey);
        this._setActiveSubModeButton(modeKey);

        this._subModeContainer.id = `exp-panel-${modeKey}`;
        this._subModeContainer.setAttribute('role', 'tabpanel');
        this._subModeContainer.setAttribute('aria-labelledby', `exp-tab-${modeKey}`);

        this.currentSubMode = definition.factory(this._subModeContainer);
        this.currentSubModeKey = modeKey;
        this.currentSubMode.start();
    }

    destroy() {
        this._destroyCurrentSubMode();

        if (this._appRoot) {
            this._appRoot.removeAttribute('data-experiment-mode');
        }

        this.container.innerHTML = '';
    }
}