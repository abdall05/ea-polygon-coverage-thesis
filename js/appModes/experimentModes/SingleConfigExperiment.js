import { PointSetGenerator } from '../../model/points/PointSetGenerator.js';
import { createRNG } from '../../utils/rng.js';
import { drawCanvasBoundary, drawPoints, drawPolygon } from '../../rendering/canvas.js';
import {
    drawExperimentCoverageGraph,
    drawExperimentAreaGraph,
    drawExperimentDiversityGraph,
    drawExperimentBoxPlot,
    bindExperimentGraphExpanders,
    createExperimentModal,
    purgePlot
} from '../../rendering/charts.js';

import {
    representationFieldConfig,
    DEFAULT_REPRESENTATION_CONFIG
} from '../../model/individuals/individualConfig.js';

import {
    getMutationDefinition,
    getMutationTypes,
    DEFAULT_MUTATION_TYPE
} from '../../model/mutations/mutationConfig.js';

import {
    getCrossoverDefinition,
    getCrossoverTypes,
    DEFAULT_CROSSOVER_TYPE
} from '../../model/crossovers/crossoverConfig.js';

import {
    getSelectionDefinition,
    getSelectionTypes,
    DEFAULT_SELECTION_TYPE
} from '../../model/selections/selectionConfig.js';

import {
    getPointDistributionDefinition,
    getPointDistributionTypes,
    POINT_DISTRIBUTION_TYPES
} from '../../model/points/pointDistributionConfig.js';

import {
    evolutionFieldConfig,
    DEFAULT_EVOLUTION_CONFIG
} from '../../model/engine/engineConfig.js';

import {
    experimentFieldConfig,
    DEFAULT_EXPERIMENT_CONFIG
} from './experimentConfig.js';

import {
    paramsToDefaults,
    parseIntInput,
    parseFloatInput,
    renderOptions,
    renderParamInputs,
    validateNumberInputsBeforeAction
} from '../../utils/configUiHelpers.js';

const createDefaultState = () => {
    const repType = DEFAULT_REPRESENTATION_CONFIG.type;
    const pointDistType = POINT_DISTRIBUTION_TYPES.UNIFORM;

    const mutationDef = getMutationDefinition(DEFAULT_MUTATION_TYPE, repType);
    const crossoverDef = getCrossoverDefinition(DEFAULT_CROSSOVER_TYPE);
    const selectionDef = getSelectionDefinition(DEFAULT_SELECTION_TYPE);
    const pointDistDef = getPointDistributionDefinition(pointDistType);

    return {
        experiment: {
            numRuns: DEFAULT_EXPERIMENT_CONFIG.numRuns,
            seed: DEFAULT_EXPERIMENT_CONFIG.seed
        },

        pointDistribution: {
            type: pointDistType,
            params: paramsToDefaults(pointDistDef?.params)
        },

        representation: {
            type: repType,
            nVertices: DEFAULT_REPRESENTATION_CONFIG.nVertices
        },

        mutation: {
            type: DEFAULT_MUTATION_TYPE,
            params: paramsToDefaults(mutationDef?.params)
        },

        crossover: {
            type: DEFAULT_CROSSOVER_TYPE,
            params: paramsToDefaults(crossoverDef?.params)
        },

        selection: {
            type: DEFAULT_SELECTION_TYPE,
            params: paramsToDefaults(selectionDef?.params)
        },

        evolution: {
            populationSize: DEFAULT_EVOLUTION_CONFIG.populationSize,
            maxGenerations: DEFAULT_EVOLUTION_CONFIG.maxGenerations,
            elitismCount: DEFAULT_EVOLUTION_CONFIG.elitismCount
        },
        viewOptions: {
            enableDiversity: false
        },

        points: null,
        runPoints: null,
        isRunning: false,
        worker: null,
        runResults: []
    };
};

export class SingleConfigExperiment {
    constructor(container) {
        this.container = container;
        this.state = createDefaultState();
        this.dom = {};

        this.lastRepType = this.state.representation.type;
        this.lastMutationType = this.state.mutation.type;
        this.lastCrossoverType = this.state.crossover.type;
        this.lastSelectionType = this.state.selection.type;
        this.lastPointDistType = this.state.pointDistribution.type;
    }

    async start() {
        this._renderBase();
        this._cacheDomReferences();
        this._bindEvents();
        this._renderAllDynamicForms();
        this._syncUIControls();
        this._updatePoints(true);
        this._drawPreview();
    }

    _renderBase() {
        const pointDistOptions = getPointDistributionTypes().map(type => {
            const def = getPointDistributionDefinition(type);
            return { value: type, label: def?.label ?? type };
        });

        const mutationOptions = getMutationTypes().map(type => {
            const def = getMutationDefinition(type, this.state.representation.type);
            return { value: type, label: def?.label ?? type };
        });

        const crossoverOptions = getCrossoverTypes().map(type => {
            const def = getCrossoverDefinition(type);
            return { value: type, label: def?.label ?? type };
        });

        const selectionOptions = getSelectionTypes().map(type => {
            const def = getSelectionDefinition(type);
            return { value: type, label: def?.label ?? type };
        });

        const showDiversity = this.state.viewOptions.enableDiversity;

        this.container.innerHTML = `
        <section class="single-config-experiment" aria-label="Single configuration experiment">
            <section class="exp-global-settings" aria-labelledby="single-exp-setup-title">
                <div class="exp-global-main">
                    <h3 id="single-exp-setup-title">Experiment Setup</h3>

                    <div class="exp-setup-stack">
                        <section class="setup-group" aria-labelledby="single-exp-points-title">
                            <div class="setup-group-head">
                                <h4 id="single-exp-points-title">Point Set</h4>
                                <p class="setup-group-note">
                                    Distribution and sampling parameters used to generate the input points.
                                </p>
                            </div>

                            <div class="setup-group-body">
                                <div class="param-row">
                                    <label for="exp-pointdist-type">Distribution</label>
                                    <select id="exp-pointdist-type">
                                        ${renderOptions(pointDistOptions, this.state.pointDistribution.type)}
                                    </select>
                                </div>

                                <div id="exp-pointdist-params" class="params-container"></div>
                            </div>
                        </section>

                        <section class="setup-group" aria-labelledby="single-exp-control-title">
                            <div class="setup-group-head">
                                <h4 id="single-exp-control-title">Experiment Control</h4>
                                <p class="setup-group-note">
                                    Execution settings for repeated runs and reproducibility.
                                </p>
                            </div>

                            <div class="setup-group-body setup-group-body--compact">
                                <div class="param-row">
                                    <label for="exp-numRuns">${experimentFieldConfig.numRuns.label}</label>
                                    <div class="param-control">
                                        <input
                                            id="exp-numRuns"
                                            type="number"
                                            min="${experimentFieldConfig.numRuns.min}"
                                            max="${experimentFieldConfig.numRuns.max}"
                                            step="${experimentFieldConfig.numRuns.step}"
                                            value="${this.state.experiment.numRuns}"
                                        >
                                    </div>
                                </div>

                                <div class="param-row">
                                    <label for="exp-seed">${experimentFieldConfig.seed.label}</label>
                                    <div class="param-control">
                                        <input
                                            id="exp-seed"
                                            type="number"
                                            min="${experimentFieldConfig.seed.min}"
                                            max="${experimentFieldConfig.seed.max}"
                                            step="${experimentFieldConfig.seed.step}"
                                            value="${this.state.experiment.seed}"
                                        >
                                    </div>
                                </div>
                            </div>
                        </section>
                    </div>
                </div>

                <aside class="exp-global-preview" aria-labelledby="single-exp-preview-title">
                    <div class="preview-container">
                        <div class="preview-head">
                            <div id="single-exp-preview-title" class="preview-label">Point Preview</div>
                            <p class="preview-note">
                                Preview of the generated point set for the current distribution and seed.
                            </p>
                        </div>
                        <canvas
                            id="expPreviewCanvas"
                            width="400"
                            height="400"
                            class="preview-canvas"
                        ></canvas>
                    </div>
                </aside>
            </section>

            <section
                id="singleConfigArea"
                class="single-config-area"
                aria-labelledby="single-exp-config-title"
            >
                <div class="config-card">
                    <div class="config-card-header">
                        <div id="single-exp-config-title" class="config-card-title">
                            Algorithm Configuration
                        </div>
                        <div class="config-card-subtitle">
                            Representation, operators, and evolutionary parameters.
                        </div>
                    </div>

                    <div class="config-card-body">
                        <section class="config-section" aria-labelledby="sc-section-representation">
                            <h4 id="sc-section-representation">Representation</h4>

                            <div class="param-row">
                                <label for="sc-rep-type">${representationFieldConfig.type.label}</label>
                                <select id="sc-rep-type">
                                    ${renderOptions(
            representationFieldConfig.type.options,
            this.state.representation.type
        )}
                                </select>
                            </div>

                            <div class="param-row">
                                <label for="sc-rep-nVertices">${representationFieldConfig.nVertices.label}</label>
                                <div class="param-control">
                                    <input
                                        id="sc-rep-nVertices"
                                        type="number"
                                        min="${representationFieldConfig.nVertices.min}"
                                        max="${representationFieldConfig.nVertices.max}"
                                        step="${representationFieldConfig.nVertices.step}"
                                        value="${this.state.representation.nVertices}"
                                    >
                                </div>
                            </div>
                        </section>

                        <section class="config-section" aria-labelledby="sc-section-mutation">
                            <h4 id="sc-section-mutation">Mutation</h4>

                            <div class="param-row">
                                <label for="sc-mutation-type">Type</label>
                                <select id="sc-mutation-type">
                                    ${renderOptions(mutationOptions, this.state.mutation.type)}
                                </select>
                            </div>

                            <div id="sc-mutation-params" class="params-container"></div>
                        </section>

                        <section class="config-section" aria-labelledby="sc-section-crossover">
                            <h4 id="sc-section-crossover">Crossover</h4>

                            <div class="param-row">
                                <label for="sc-crossover-type">Type</label>
                                <select id="sc-crossover-type">
                                    ${renderOptions(crossoverOptions, this.state.crossover.type)}
                                </select>
                            </div>

                            <div id="sc-crossover-params" class="params-container"></div>
                        </section>

                        <section class="config-section" aria-labelledby="sc-section-selection">
                            <h4 id="sc-section-selection">Selection</h4>

                            <div class="param-row">
                                <label for="sc-selection-type">Type</label>
                                <select id="sc-selection-type">
                                    ${renderOptions(selectionOptions, this.state.selection.type)}
                                </select>
                            </div>

                            <div id="sc-selection-params" class="params-container"></div>
                        </section>

                        <section class="config-section" aria-labelledby="sc-section-ea">
                            <h4 id="sc-section-ea">EA Parameters</h4>
                            <div id="sc-evolution-params" class="params-container"></div>
                        </section>
                    </div>
                </div>
            </section>

            <div class="exp-actions" aria-label="Experiment actions">
                <button id="runExpBtn" class="primary" type="button">Run experiment</button>
                <button id="clearExpBtn" class="secondary" type="button" disabled>
    Clear Results
</button>
                <button id="exportExpBtn" class="secondary" type="button" disabled>
                    Export CSV
                </button>
            </div>

            <section
                id="expProgressSection"
                class="progress-section"
                style="display:none;"
                aria-live="polite"
            >
                <div class="gen-status">
                    Run <span id="expCurrentRun">0</span> of <span id="expTotalRuns">0</span>
                </div>

                <div class="progress-bar">
                    <div
                        id="expProgressFill"
                        class="progress-fill"
                        style="width:0%;"
                    ></div>
                </div>
            </section>

            <section
                id="expResultsPanel"
                class="exp-results-panel"
                style="display:none;"
                aria-labelledby="single-exp-results-title"
            >
                <h3 id="single-exp-results-title" class="sr-only">Experiment results</h3>

                <section class="experiment-canvas-section" aria-labelledby="best-solution-title">
                    <div class="experiment-viewer-layout">
                        <div class="experiment-canvas-card">
                            <canvas
                                id="experimentMainCanvas"
                                width="400"
                                height="400"
                                class="experiment-main-canvas"
                            ></canvas>
                        </div>

                        <aside class="experiment-run-summary" aria-labelledby="best-solution-title">
                            <h4 id="best-solution-title">Best Solution</h4>

                            <div class="run-info-display">
                                <div class="experiment-stat-row">
                                    <span class="experiment-stat-label">Run</span>
                                    <span id="currentRunDisplay" class="experiment-stat-value">—</span>
                                </div>

                                <div class="experiment-stat-row">
                                    <span class="experiment-stat-label">Coverage</span>
                                    <span id="runCoverageDisplay" class="experiment-stat-value">—</span>
                                </div>

                                <div class="experiment-stat-row">
                                    <span class="experiment-stat-label">Area</span>
                                    <span id="runAreaDisplay" class="experiment-stat-value">—</span>
                                </div>
                            </div>

                            <div class="gen-controls">
                                <div class="gen-row">
                                    <span class="gen-label">Displayed run</span>
                                    <span id="runSliderDisplay">0 / 0</span>
                                </div>

                                <div class="gen-row">
                                    <input
                                        type="range"
                                        id="runSlider"
                                        min="0"
                                        max="0"
                                        value="0"
                                        step="1"
                                        disabled
                                    >
                                </div>
                            </div>

                            <p class="experiment-note">
                                Use the slider to inspect the best final solution from each run.
                            </p>
                        </aside>
                    </div>
                </section>

                <section
                    class="exp-convergence-graphs"
                    aria-labelledby="single-exp-convergence-title"
                >
                    <h4 id="single-exp-convergence-title">Convergence Analysis</h4>
                    <div class="graph-row">
                        ${this._createGraphItem('expCoverageGraph', 'Mean Best Coverage')}
                        ${this._createGraphItem('expAreaGraph', 'Mean Best Area')}
                        ${showDiversity ? this._createGraphItem('expDiversityGraph', 'Mean Diversity') : ''}
                    </div>
                </section>

                <section
                    class="exp-final-graphs"
                    aria-labelledby="single-exp-final-title"
                >
                    <div class="section-head">
                        <div>
                            <h4 id="single-exp-final-title">Final Distribution</h4>
                            <p class="section-note">
                                Final area is computed only for runs that reached full coverage.
                            </p>
                        </div>

                        <div class="success-summary" aria-live="polite">
                            <div class="success-summary-label">Full-coverage runs</div>
                            <div class="success-summary-value">
                                <span id="expFullCoverageCount">—</span>
                                <span class="success-summary-sep">/</span>
                                <span id="expRunCountSummary">—</span>
                            </div>
                            <div class="success-summary-meta" id="expFullCoverageRate">—</div>
                        </div>
                    </div>

                    <div class="graph-row">
                        ${this._createGraphItem('expFinalCoverageGraph', 'Final Coverage')}
                        ${this._createGraphItem('expFinalAreaGraph', 'Final Area')}
                        ${showDiversity ? this._createGraphItem('expFinalDiversityGraph', 'Final Diversity') : ''}
                    </div>
                </section>
            </section>

            ${createExperimentModal()}
        </section>
    `;
    }

    _setClearButtonState({ disabled, text }) {
        const clearBtn = document.getElementById('clearExpBtn');
        if (!clearBtn) return;

        clearBtn.disabled = disabled;
        clearBtn.textContent = text;
    }

    _createGraphItem(containerId, title) {
        return `
        <section class="graph-item" aria-labelledby="${containerId}-label">
            <div class="graph-head">
                <div id="${containerId}-label" class="graph-label">${title}</div>
                <button
                    class="button small expand-graph-btn"
                    data-graph="${containerId}"
                    type="button"
                    aria-label="Expand ${title}"
                >
                    Expand
                </button>
            </div>
            <div id="${containerId}" class="graph-plot" style="width:100%; height:280px;"></div>
        </section>
    `;
    }

    _cacheDomReferences() {
        this.dom.pointDistParams = this.container.querySelector('#exp-pointdist-params');
        this.dom.mutationParams = this.container.querySelector('#sc-mutation-params');
        this.dom.crossoverParams = this.container.querySelector('#sc-crossover-params');
        this.dom.selectionParams = this.container.querySelector('#sc-selection-params');
        this.dom.evolutionParams = this.container.querySelector('#sc-evolution-params');
        this.dom.previewCanvas = this.container.querySelector('#expPreviewCanvas');
    }

    _bindEvents() {
        this.container.addEventListener('change', (e) => this._handleChange(e));
        this.container.addEventListener('click', (e) => this._handleClick(e));
    }

    _handleChange(e) {
        const id = e.target.id;

        switch (id) {
            case 'exp-pointdist-type':
                this.state.pointDistribution.type = e.target.value;
                this._onPointDistChanged();
                break;

            case 'exp-numRuns':
                this.state.experiment.numRuns = parseIntInput(
                    e.target,
                    experimentFieldConfig.numRuns.default,
                    experimentFieldConfig.numRuns
                );
                break;

            case 'exp-seed':
                this.state.experiment.seed = parseIntInput(
                    e.target,
                    experimentFieldConfig.seed.default,
                    experimentFieldConfig.seed
                );
                this._updatePoints(true);
                this._drawPreview();
                break;

            case 'sc-rep-type':
                this.state.representation.type = e.target.value;
                this._onRepChanged();
                break;

            case 'sc-rep-nVertices':
                this.state.representation.nVertices = parseIntInput(
                    e.target,
                    representationFieldConfig.nVertices.default,
                    representationFieldConfig.nVertices
                );
                break;

            case 'sc-mutation-type':
                this.state.mutation.type = e.target.value;
                this._onMutationChanged();
                break;

            case 'sc-crossover-type':
                this.state.crossover.type = e.target.value;
                this._onCrossoverChanged();
                break;

            case 'sc-selection-type':
                this.state.selection.type = e.target.value;
                this._onSelectionChanged();
                break;

            default:
                if (id.startsWith('exp-pointdist-param-')) {
                    const key = id.slice('exp-pointdist-param-'.length);
                    const def = getPointDistributionDefinition(this.state.pointDistribution.type);

                    if (def?.params[key]) {
                        if (key === 'count' || Number.isInteger(def.params[key].step)) {
                            this.state.pointDistribution.params[key] = parseIntInput(
                                e.target,
                                def.params[key].default,
                                def.params[key]
                            );
                        } else {
                            this.state.pointDistribution.params[key] = parseFloatInput(
                                e.target,
                                def.params[key].default,
                                def.params[key]
                            );
                        }

                        this._updatePoints(true);
                        this._drawPreview();
                    }
                } else if (id.startsWith('sc-mut-param-')) {
                    const key = id.slice('sc-mut-param-'.length);
                    const def = getMutationDefinition(this.state.mutation.type, this.state.representation.type);

                    if (def?.params[key]) {
                        this.state.mutation.params[key] = parseFloatInput(
                            e.target,
                            def.params[key].default,
                            def.params[key]
                        );
                    }
                } else if (id.startsWith('sc-cross-param-')) {
                    const key = id.slice('sc-cross-param-'.length);
                    const def = getCrossoverDefinition(this.state.crossover.type);

                    if (def?.params[key]) {
                        this.state.crossover.params[key] = parseFloatInput(
                            e.target,
                            def.params[key].default,
                            def.params[key]
                        );
                    }
                } else if (id.startsWith('sc-sel-param-')) {
                    const key = id.slice('sc-sel-param-'.length);
                    const def = getSelectionDefinition(this.state.selection.type);

                    if (def?.params[key]) {
                        this.state.selection.params[key] = parseFloatInput(
                            e.target,
                            def.params[key].default,
                            def.params[key]
                        );
                    }
                } else if (id.startsWith('sc-evo-')) {
                    const key = id.slice('sc-evo-'.length);
                    const cfg = evolutionFieldConfig[key];

                    if (cfg) {
                        this.state.evolution[key] = parseIntInput(
                            e.target,
                            cfg.default,
                            cfg
                        );
                    }
                }
                break;
        }
    }

    _handleClick(e) {
        const id = e.target.id;

        switch (id) {
            case 'runExpBtn':
                if (!validateNumberInputsBeforeAction(
                    this.container,
                    input => this._handleChange({ target: input }),
                    {
                        selector: '.single-config-experiment input[type="number"]:not(:disabled)',
                        message: 'Some invalid inputs were reset to their default values. Please review them and click Run experiment again.'
                    }
                )) {
                    return;
                }

                this._runExperiments();
                break;
            case 'clearExpBtn':
                this._clear();
                break;
            case 'exportExpBtn':
                this._exportCSV();
                break;
            default:
                if (e.target.classList.contains('expand-graph-btn')) {
                    // handled by bindExperimentGraphExpanders after results render
                }
                break;
        }
    }

    _onPointDistChanged() {
        if (this.state.pointDistribution.type !== this.lastPointDistType) {
            this.lastPointDistType = this.state.pointDistribution.type;
            const def = getPointDistributionDefinition(this.state.pointDistribution.type);
            this.state.pointDistribution.params = paramsToDefaults(def?.params);
            this._renderPointDistForm();
            this._updatePoints(true);
            this._drawPreview();
        }
    }

    _onRepChanged() {
        if (this.state.representation.type !== this.lastRepType) {
            this.lastRepType = this.state.representation.type;
            this._refreshMutationUi();
        }
    }

    _onMutationChanged() {
        if (this.state.mutation.type !== this.lastMutationType) {
            this.lastMutationType = this.state.mutation.type;
            this._refreshMutationUi();
        }
    }

    _onCrossoverChanged() {
        if (this.state.crossover.type !== this.lastCrossoverType) {
            this.lastCrossoverType = this.state.crossover.type;
            const def = getCrossoverDefinition(this.state.crossover.type);
            this.state.crossover.params = paramsToDefaults(def?.params);
            this._renderCrossoverForm();
        }
    }

    _onSelectionChanged() {
        if (this.state.selection.type !== this.lastSelectionType) {
            this.lastSelectionType = this.state.selection.type;
            const def = getSelectionDefinition(this.state.selection.type);
            this.state.selection.params = paramsToDefaults(def?.params);
            this._renderSelectionForm();
        }
    }

    _refreshMutationUi() {
        this._rebuildMutationDefaults();

        const mutationTypeSelect = this.container.querySelector('#sc-mutation-type');
        if (mutationTypeSelect) {
            const mutationOptions = getMutationTypes().map(type => {
                const def = getMutationDefinition(type, this.state.representation.type);
                return { value: type, label: def?.label ?? type };
            });

            mutationTypeSelect.innerHTML = renderOptions(mutationOptions, this.state.mutation.type);
            mutationTypeSelect.value = this.state.mutation.type;
        }

        this._renderMutationForm();
    }

    _rebuildMutationDefaults() {
        const def = getMutationDefinition(this.state.mutation.type, this.state.representation.type);
        this.state.mutation.params = paramsToDefaults(def?.params);
    }

    _renderAllDynamicForms() {
        this._renderPointDistForm();
        this._renderMutationForm();
        this._renderCrossoverForm();
        this._renderSelectionForm();
        this._renderEvolutionForm();
    }

    _renderPointDistForm() {
        const def = getPointDistributionDefinition(this.state.pointDistribution.type);
        renderParamInputs(
            this.dom.pointDistParams,
            def,
            this.state.pointDistribution.params,
            'exp-pointdist'
        );
    }

    _renderMutationForm() {
        const def = getMutationDefinition(this.state.mutation.type, this.state.representation.type);
        renderParamInputs(this.dom.mutationParams, def, this.state.mutation.params, 'sc-mut');
    }

    _renderCrossoverForm() {
        const def = getCrossoverDefinition(this.state.crossover.type);
        renderParamInputs(this.dom.crossoverParams, def, this.state.crossover.params, 'sc-cross');
    }

    _renderSelectionForm() {
        const def = getSelectionDefinition(this.state.selection.type);
        renderParamInputs(this.dom.selectionParams, def, this.state.selection.params, 'sc-sel');
    }

    _renderEvolutionForm() {
        const container = this.dom.evolutionParams;
        if (!container) return;

        const cfg = evolutionFieldConfig;
        const state = this.state.evolution;

        container.innerHTML = `
        <div class="param-row">
            <label for="sc-evo-populationSize">${cfg.populationSize.label}:</label>
            <div class="param-control">
                <input
                    id="sc-evo-populationSize"
                    type="number"
                    min="${cfg.populationSize.min}"
                    step="${cfg.populationSize.step}"
                    value="${state.populationSize}"
                >
            </div>
        </div>

        <div class="param-row">
            <label for="sc-evo-maxGenerations">${cfg.maxGenerations.label}:</label>
            <div class="param-control">
                <input
                    id="sc-evo-maxGenerations"
                    type="number"
                    min="${cfg.maxGenerations.min}"
                    step="${cfg.maxGenerations.step}"
                    value="${state.maxGenerations}"
                >
            </div>
        </div>

        <div class="param-row">
            <label for="sc-evo-elitismCount">${cfg.elitismCount.label}:</label>
            <div class="param-control">
                <input
                    id="sc-evo-elitismCount"
                    type="number"
                    min="${cfg.elitismCount.min}"
                    step="${cfg.elitismCount.step}"
                    value="${state.elitismCount}"
                >
            </div>
        </div>
    `;
    }

    _syncUIControls() {
        const pointDistSelect = this.container.querySelector('#exp-pointdist-type');
        const mutationSelect = this.container.querySelector('#sc-mutation-type');
        const crossoverSelect = this.container.querySelector('#sc-crossover-type');
        const selectionSelect = this.container.querySelector('#sc-selection-type');
        const repSelect = this.container.querySelector('#sc-rep-type');

        if (pointDistSelect) pointDistSelect.value = this.state.pointDistribution.type;
        if (mutationSelect) mutationSelect.value = this.state.mutation.type;
        if (crossoverSelect) crossoverSelect.value = this.state.crossover.type;
        if (selectionSelect) selectionSelect.value = this.state.selection.type;
        if (repSelect) repSelect.value = this.state.representation.type;
    }

    _updatePoints(regenerate = true) {
        if (!regenerate) return;

        const type = this.state.pointDistribution.type;
        const params = this.state.pointDistribution.params;

        const safeParams = {
            ...params,
            count: parseInt(params.count, 10) || 100
        };

        const rng = createRNG(this.state.experiment.seed);

        this.state.points = PointSetGenerator.generate(
            type,
            safeParams,
            rng
        );
    }

    _drawPreview() {
        const canvas = this.dom.previewCanvas;
        if (!canvas || !this.state.points) return;

        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#f8f9fa';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const { squareX, squareY, squareSize } = drawCanvasBoundary(ctx, canvas.width, canvas.height);
        drawPoints(ctx, this.state.points, squareX, squareY, squareSize);
    }

    _runExperiments() {
        if (this.state.isRunning) return;

        this.state.isRunning = true;
        this.state.runResults = [];
        this.state.runPoints = this.state.points?.slice?.() ?? null;

        const runBtn = document.getElementById('runExpBtn');
        const clearBtn = document.getElementById('clearExpBtn');
        const exportBtn = document.getElementById('exportExpBtn');
        const progressSection = document.getElementById('expProgressSection');
        const resultsPanel = document.getElementById('expResultsPanel');

        runBtn.disabled = true;

        this._setClearButtonState({
            disabled: false,
            text: 'Stop Run'
        });

        if (exportBtn) exportBtn.disabled = true;
        progressSection.style.display = 'block';
        resultsPanel.style.display = 'none';

        const totalRuns = this.state.experiment.numRuns;
        document.getElementById('expTotalRuns').innerText = totalRuns;
        document.getElementById('expCurrentRun').innerText = '0';
        document.getElementById('expProgressFill').style.width = '0%';

        if (this.state.worker) this.state.worker.terminate();
        this.state.worker = new Worker(new URL('../../workers/evolutionWorker.js', import.meta.url), {
            type: 'module'
        });
        this.state.worker.onmessage = (e) => this._handleWorkerMessage(e);

        const evolutionParams = {
            popSize: this.state.evolution.populationSize,
            genCount: this.state.evolution.maxGenerations,
            mutation: {
                type: this.state.mutation.type,
                params: this.state.mutation.params
            },
            crossover: {
                type: this.state.crossover.type,
                params: this.state.crossover.params
            },
            selection: {
                type: this.state.selection.type,
                params: this.state.selection.params
            },
            elitismCount: this.state.evolution.elitismCount,
            representation: this.state.representation.type,
            nVertices: this.state.representation.nVertices
        };

        const resultConfig = {
            storePopulation: false,
            includeAvgFitness: false,
            includeDiversity: false,
            lineageTracking: false
        };

        this.state.worker.postMessage({
            evolutionParams,
            points: this.state.points,
            resultConfig,
            numRuns: totalRuns,
            seed: this.state.experiment.seed
        });
    }

    _handleWorkerMessage(e) {
        const data = e.data;

        if (data.type === 'runProgress') {
            const runCompleted = data.runCompleted;
            const total = data.totalRuns;

            document.getElementById('expCurrentRun').innerText = runCompleted;
            document.getElementById('expProgressFill').style.width = `${(runCompleted / total) * 100}%`;

            if (data.latestRun) {
                this.state.runResults[runCompleted - 1] = data.latestRun;
            }
        } else if (data.type === 'complete') {
            this.state.runResults = data.results || [];
            this._displayResults();

            if (this.state.worker) {
                this.state.worker.terminate();
                this.state.worker = null;
            }

            this.state.isRunning = false;

            const runBtn = document.getElementById('runExpBtn');
            const clearBtn = document.getElementById('clearExpBtn');
            const exportBtn = document.getElementById('exportExpBtn');
            const progressSection = document.getElementById('expProgressSection');

            if (runBtn) runBtn.disabled = false;

            this._setClearButtonState({
                disabled: this.state.runResults.length === 0,
                text: 'Clear Results'
            });

            if (exportBtn) exportBtn.disabled = this.state.runResults.length === 0;
            if (progressSection) progressSection.style.display = 'none';
        } else if (data.type === 'error') {
            console.error('Worker error:', data.message);
            alert(`Evolution error: ${data.message}`);
            this._clear();
        }
    }

    _displayResults() {
        if (!this.state.runResults.length) return;

        const resultsPanel = document.getElementById('expResultsPanel');
        resultsPanel.style.display = 'block';

        const runSlider = document.getElementById('runSlider');
        const runLabel = document.getElementById('runSliderDisplay');

        if (runSlider) {
            runSlider.max = this.state.runResults.length - 1;
            runSlider.value = 0;
            runSlider.disabled = false;

            runSlider.oninput = (e) => {
                const idx = parseInt(e.target.value, 10);
                runLabel.innerText = `${idx + 1} / ${this.state.runResults.length}`;
                this._drawRunCanvas(idx);
                this._updateRunStats(idx);
            };

            runLabel.innerText = `1 / ${this.state.runResults.length}`;
            this._drawRunCanvas(0);
            this._updateRunStats(0);
        }

        const pointCount = this.state.pointDistribution.params.count ?? 100;
        const successCoverageTarget = pointCount;

        const successfulRuns = this.state.runResults.filter((r) => {
            const last = r.history?.[r.history.length - 1];
            const coverage = last?.bestFitness?.coverage;
            return coverage === successCoverageTarget;
        });

        const successCount = successfulRuns.length;
        const totalRuns = this.state.runResults.length;
        const successRate = totalRuns > 0 ? (100 * successCount / totalRuns) : 0;

        const fullCoverageCountEl = document.getElementById('expFullCoverageCount');
        const runCountSummaryEl = document.getElementById('expRunCountSummary');
        const fullCoverageRateEl = document.getElementById('expFullCoverageRate');

        if (fullCoverageCountEl) fullCoverageCountEl.textContent = String(successCount);
        if (runCountSummaryEl) runCountSummaryEl.textContent = String(totalRuns);
        if (fullCoverageRateEl) fullCoverageRateEl.textContent = `${successRate.toFixed(1)}% success rate`;

        drawExperimentCoverageGraph(
            'expCoverageGraph',
            this.state.runResults,
            this.state.pointDistribution.params.count ?? 100
        );
        drawExperimentAreaGraph('expAreaGraph', this.state.runResults);

        if (this.state.viewOptions.enableDiversity && document.getElementById('expDiversityGraph')) {
            drawExperimentDiversityGraph('expDiversityGraph', this.state.runResults);
        }

        const finalCoverage = this.state.runResults
            .map(r => r.history?.[r.history.length - 1]?.bestFitness?.coverage ?? null)
            .filter(v => v !== undefined && v !== null);

        const finalArea = successfulRuns
            .map(r => r.history?.[r.history.length - 1]?.bestFitness?.area ?? null)
            .filter(v => v !== undefined && v !== null);

        drawExperimentBoxPlot('expFinalCoverageGraph', finalCoverage, 'Final Coverage', null);
        drawExperimentBoxPlot(
            'expFinalAreaGraph',
            finalArea,
            'Final Area (Successful Runs)',
            null
        );

        if (this.state.viewOptions.enableDiversity && document.getElementById('expFinalDiversityGraph')) {
            const finalDiversity = this.state.runResults
                .map(r => r.history?.[r.history.length - 1]?.diversity ?? null)
                .filter(v => v !== undefined && v !== null);

            if (finalDiversity.length) {
                drawExperimentBoxPlot('expFinalDiversityGraph', finalDiversity, 'Final Diversity', null);
            }
        }

        bindExperimentGraphExpanders(this.container, this);
    }

    _drawRunCanvas(runIdx) {
        const canvas = document.getElementById('experimentMainCanvas');
        if (!canvas) return;

        const run = this.state.runResults[runIdx];
        if (!run) return;

        const ctx = canvas.getContext('2d');
        const w = canvas.width;
        const h = canvas.height;

        ctx.fillStyle = '#fefefe';
        ctx.fillRect(0, 0, w, h);

        const { squareX, squareY, squareSize } = drawCanvasBoundary(ctx, w, h);
        const pointsToDraw = this.state.runPoints || this.state.points;
        drawPoints(ctx, pointsToDraw, squareX, squareY, squareSize);

        const history = run.history || [];
        if (!history.length) return;

        const lastGen = history[history.length - 1];
        const bestShape = lastGen?.bestShape;
        if (bestShape) drawPolygon(ctx, bestShape, squareX, squareY, squareSize);
    }

    _updateRunStats(runIdx) {
        const run = this.state.runResults[runIdx];
        if (!run) return;

        const currentRunDisplay = document.getElementById('currentRunDisplay');
        const runCoverageDisplay = document.getElementById('runCoverageDisplay');
        const runAreaDisplay = document.getElementById('runAreaDisplay');
        const runSliderDisplay = document.getElementById('runSliderDisplay');

        const lastGen = run.history?.[run.history.length - 1];
        const finalBestCoverage = lastGen?.bestFitness?.coverage ?? '—';
        const finalBestArea = lastGen?.bestFitness?.area ?? '—';

        if (currentRunDisplay) currentRunDisplay.textContent = `${run.run}`;
        if (runCoverageDisplay) runCoverageDisplay.textContent = `${finalBestCoverage}`;
        if (runAreaDisplay) {
            runAreaDisplay.textContent = typeof finalBestArea === 'number'
                ? finalBestArea.toFixed(4)
                : finalBestArea;
        }
        if (runSliderDisplay) runSliderDisplay.textContent = `${runIdx + 1} / ${this.state.runResults.length}`;
    }

    _getHistoryExportColumns() {
        const columns = [
            { key: 'run', label: 'run', getter: (run) => run.run },
            { key: 'generation', label: 'generation', getter: (_run, h, genIdx) => h.generation ?? genIdx },
            { key: 'bestCoverage', label: 'bestCoverage', getter: (_run, h) => h.bestFitness?.coverage ?? '' },
            { key: 'bestArea', label: 'bestArea', getter: (_run, h) => h.bestFitness?.area ?? '' }
        ];

        if (this.state.viewOptions.enableDiversity) {
            columns.push({
                key: 'diversity',
                label: 'diversity',
                getter: (_run, h) => h.diversity ?? ''
            });
        }

        return columns;
    }

    _flattenConfigForExport() {
        return {
            exportType: 'single-config-experiment-history',
            pointDistributionType: this.state.pointDistribution.type,
            pointDistributionParams: JSON.stringify(this.state.pointDistribution.params || {}),
            representationType: this.state.representation.type,
            representationVertices: this.state.representation.nVertices,
            mutationType: this.state.mutation.type,
            mutationParams: JSON.stringify(this.state.mutation.params || {}),
            crossoverType: this.state.crossover.type,
            crossoverParams: JSON.stringify(this.state.crossover.params || {}),
            selectionType: this.state.selection.type,
            selectionParams: JSON.stringify(this.state.selection.params || {}),
            populationSize: this.state.evolution.populationSize,
            maxGenerations: this.state.evolution.maxGenerations,
            elitismCount: this.state.evolution.elitismCount,
            numRuns: this.state.experiment.numRuns,
            experimentSeed: this.state.experiment.seed,
            diversityLogging: this.state.viewOptions.enableDiversity ? 'enabled' : 'disabled'
        };
    }

    _sanitizeFilePart(value) {
        return String(value).replace(/\s+/g, '').replace(/[^a-zA-Z0-9._-]/g, '');
    }

    _buildExportFilename() {
        return 'single-config-experiment-history.csv';
    }

    _escapeCSV(value) {
        if (value === null || value === undefined) return '';
        const str = String(value);
        if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
        return str;
    }

    _exportCSV() {
        if (!this.state.runResults || this.state.runResults.length === 0) {
            alert('No experiment results to export');
            return;
        }
        if (!this.state.runResults[0].history) {
            alert('No history data available for export');
            return;
        }

        const columns = this._getHistoryExportColumns();
        const csvRows = [];

        csvRows.push('# Single Configuration Experiment Export');
        const configEntries = this._flattenConfigForExport();
        for (const [key, value] of Object.entries(configEntries)) {
            csvRows.push(`# ${key},${this._escapeCSV(value)}`);
        }

        csvRows.push('');
        csvRows.push(columns.map(col => this._escapeCSV(col.label)).join(','));

        for (const run of this.state.runResults) {
            const history = run.history || [];
            for (let genIdx = 0; genIdx < history.length; genIdx++) {
                const h = history[genIdx];
                const row = columns.map(col => this._escapeCSV(col.getter(run, h, genIdx)));
                csvRows.push(row.join(','));
            }
        }

        const csvString = csvRows.join('\n');
        const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = this._buildExportFilename();
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    _clear() {
        if (this.state.worker) this.state.worker.terminate();
        this.state.worker = null;
        this.state.isRunning = false;
        this.state.runResults = [];
        this.state.runPoints = null;

        const panel = document.getElementById('expResultsPanel');
        if (panel) panel.style.display = 'none';

        const progressSection = document.getElementById('expProgressSection');
        if (progressSection) progressSection.style.display = 'none';

        const runBtn = document.getElementById('runExpBtn');
        if (runBtn) runBtn.disabled = false;

        this._setClearButtonState({
            disabled: true,
            text: 'Clear Results'
        });

        const exportBtn = document.getElementById('exportExpBtn');
        if (exportBtn) exportBtn.disabled = true;

        const currentRunDisplay = document.getElementById('currentRunDisplay');
        const runCoverageDisplay = document.getElementById('runCoverageDisplay');
        const runAreaDisplay = document.getElementById('runAreaDisplay');
        const runSliderDisplay = document.getElementById('runSliderDisplay');
        const runSlider = document.getElementById('runSlider');

        if (currentRunDisplay) currentRunDisplay.textContent = '-';
        if (runCoverageDisplay) runCoverageDisplay.textContent = '-';
        if (runAreaDisplay) runAreaDisplay.textContent = '-';
        if (runSliderDisplay) runSliderDisplay.textContent = '0 / 0';

        if (runSlider) {
            runSlider.value = 0;
            runSlider.max = 0;
            runSlider.disabled = true;
        }

        const modal = document.getElementById('graphModal');
        if (modal) modal.style.display = 'none';

        const plot = document.getElementById('graphModalPlot');
        if (plot) purgePlot(plot);
    }

    destroy() {
        if (this.state.worker) this.state.worker.terminate();
        this.container.innerHTML = '';
    }
}