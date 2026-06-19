import { PointSetGenerator } from '../../model/points/PointSetGenerator.js';
import { drawCanvasBoundary, drawPoints } from '../../rendering/canvas.js';
import { createRNG } from '../../utils/rng.js';
import { computeExperimentStatistics } from '../../stats/experimentStats.js';

import {
    metricFieldConfig,
    DEFAULT_METRIC_CONFIG,
    METRIC_DEFINITIONS,
    METRIC_KEYS
} from '../../model/metrics/metricConfig.js';

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
} from '../../model/experimentConfig.js';

import {
    paramsToDefaults,
    parseIntInput,
    parseFloatInput,
    renderOptions,
    renderParamInputs
} from '../../utils/configUiHelpers.js';

const createDefaultConfig = (id = null, name = '') => {
    const repType = DEFAULT_REPRESENTATION_CONFIG.type;
    const mutationDef = getMutationDefinition(DEFAULT_MUTATION_TYPE, repType);
    const crossoverDef = getCrossoverDefinition(DEFAULT_CROSSOVER_TYPE);
    const selectionDef = getSelectionDefinition(DEFAULT_SELECTION_TYPE);

    return {
        id,
        name,
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
        }
    };
};

export class CompareConfigsExperiment {
    constructor(container) {
        this.container = container;

        const pointDistType = POINT_DISTRIBUTION_TYPES.UNIFORM;
        const pointDistDef = getPointDistributionDefinition(pointDistType);

        this.global = {
            pointDistribution: {
                type: pointDistType,
                params: paramsToDefaults(pointDistDef?.params)
            },
            experiment: {
                numRuns: DEFAULT_EXPERIMENT_CONFIG.numRuns,
                seed: DEFAULT_EXPERIMENT_CONFIG.seed
            },
            thresholdFraction: DEFAULT_METRIC_CONFIG.thresholdFraction
        };

        this.points = null;
        this.configs = [];
        this.nextConfigId = 1;
        this.isRunning = false;
        this.workers = [];
        this.configResults = [];
        this.statisticsResults = null;
        this.configSnapshots = [];
        this.dom = {};
    }

    async start() {
        this.container.innerHTML = this._createMainView();
        this._cacheDomReferences();
        this._bindGlobalEvents();
        this._generatePoints();
        this._drawPreview();

        this.configs = [];
        this.nextConfigId = 1;
        this._addNewConfig();
        this._addNewConfig();
        this._renderAllConfigCards();
    }

    _createMainView() {
        const pointDistOptions = getPointDistributionTypes().map(type => {
            const def = getPointDistributionDefinition(type);
            return { value: type, label: def?.label ?? type };
        });

        return `
        <section class="compare-experiment thesis-experiment" aria-label="Configuration comparison experiment">
            <section class="compare-hero">
                <div class="compare-hero-copy">
                    <h2>Configuration Comparison</h2>
                    <p class="compare-subtitle">
                        Compare multiple evolutionary algorithm configurations under a shared experimental setup and evaluate statistical differences across outcome metrics.
                    </p>
                </div>
            </section>

            <section class="compare-top-layout" aria-labelledby="compare-global-title">
                <div class="compare-panel compare-global-panel">
                    <div class="compare-section-header">
                        <div>
                            <h3 id="compare-global-title">Shared Experiment Setup</h3>
                            <div class="compare-subtitle">Common settings used for every compared configuration</div>
                        </div>
                    </div>

                    <div class="compare-global-groups">
                        <section class="compare-global-group" aria-labelledby="compare-global-experiment-title">
                            <div class="compare-global-group-title" id="compare-global-experiment-title">Experiment</div>
                            <div class="compare-global-rows">
                                <div class="param-row">
                                    <label for="compNumRuns">${experimentFieldConfig.numRuns.label}</label>
                                    <input
                                        type="number"
                                        id="compNumRuns"
                                        min="${experimentFieldConfig.numRuns.min}"
                                        max="${experimentFieldConfig.numRuns.max}"
                                        step="${experimentFieldConfig.numRuns.step}"
                                        value="${this.global.experiment.numRuns}"
                                    >
                                </div>

                                <div class="param-row">
                                    <label for="compSeed">${experimentFieldConfig.seed.label}</label>
                                    <input
                                        type="number"
                                        id="compSeed"
                                        min="${experimentFieldConfig.seed.min}"
                                        max="${experimentFieldConfig.seed.max}"
                                        step="${experimentFieldConfig.seed.step}"
                                        value="${this.global.experiment.seed}"
                                    >
                                </div>
                            </div>
                        </section>

                        <section class="compare-global-group" aria-labelledby="compare-global-pointset-title">
                            <div class="compare-global-group-title" id="compare-global-pointset-title">Point Set</div>
                            <div class="compare-global-rows">
                                <div class="param-row">
                                    <label for="compPointDistType">Distribution</label>
                                    <select id="compPointDistType">
                                        ${renderOptions(pointDistOptions, this.global.pointDistribution.type)}
                                    </select>
                                </div>
                            </div>
                            <div id="compPointDistParams" class="compare-global-param-list"></div>
                        </section>

                        <section class="compare-global-group" aria-labelledby="compare-global-metrics-title">
                            <div class="compare-global-group-title" id="compare-global-metrics-title">Metrics</div>
                            <div class="compare-global-rows">
                                <div class="param-row">
                                    <label for="compThresholdFraction">${metricFieldConfig.thresholdFraction.label}</label>
                                    <input
                                        type="number"
                                        id="compThresholdFraction"
                                        value="${this.global.thresholdFraction}"
                                        min="${metricFieldConfig.thresholdFraction.min}"
                                        max="${metricFieldConfig.thresholdFraction.max}"
                                        step="${metricFieldConfig.thresholdFraction.step}"
                                    >
                                </div>
                            </div>

                            <div class="compare-metric-summary-label">Included outcome metrics</div>
                            <div class="compare-metric-tags">
                            ${this._renderMetricGroupTags()}
                            </div>
                        </section>
                    </div>
                </div>

                <aside class="compare-panel compare-preview-panel" aria-labelledby="compare-preview-title">
                    <div class="compare-section-header">
                        <div>
                            <h3 id="compare-preview-title">Point Set Preview</h3>
                            <div class="compare-subtitle">Preview of the shared sampled environment</div>
                        </div>
                    </div>

                    <div class="compare-preview-container">
                        <canvas id="compPreviewCanvas" width="400" height="400" class="compare-preview-canvas"></canvas>
                    </div>
                </aside>
            </section>

            <section class="compare-configs-section" aria-labelledby="compare-configs-title">
                <div class="compare-configs-header">
                    <div>
                        <h3 id="compare-configs-title">Compared Configurations</h3>
                        <div class="compare-subtitle">At least two configurations are required, with up to five total</div>
                    </div>
                    <button id="addConfigBtn" class="secondary" type="button">Add configuration</button>
                </div>

                <div id="configsContainer" class="configs-container"></div>

                <div class="exp-actions compare-actions">
                    <button id="runCompareBtn" class="primary" type="button">Run comparison</button>
                    <button id="clearCompareBtn" class="secondary" type="button">Reset</button>
                </div>
            </section>

            <section id="compProgressSection" class="progress-section compare-panel" style="display: none;" aria-labelledby="compare-progress-title">
                <div class="compare-section-header">
                    <div>
                        <h3 id="compare-progress-title">Execution Progress</h3>
                        <div class="compare-subtitle">Configuration-level and run-level progress during the comparison</div>
                    </div>
                </div>

                <div class="progress-block">
                    <div class="gen-status">Configuration <span id="compCurrentConfig">0</span> / <span id="compTotalConfigs">0</span></div>
                    <div class="progress-bar"><div id="compProgressFill" class="progress-fill" style="width:0%"></div></div>
                </div>

                <div class="progress-block">
                    <div class="gen-status">Run <span id="compCurrentRun">0</span> / <span id="compTotalRuns">0</span></div>
                    <div class="progress-bar"><div id="compRunProgressFill" class="progress-fill" style="width:0%"></div></div>
                </div>
            </section>

            <section id="compResultsPanel" class="compare-results" style="display:none;" aria-labelledby="compare-results-title">
                <div class="compare-results-header">
                    <div>
                        <h3 id="compare-results-title">Statistical Results</h3>
                        <div class="compare-subtitle">
                            Descriptive summaries, omnibus significance tests, and corrected pairwise comparisons
                        </div>
                    </div>
                </div>
                <div id="compStatisticsContent"></div>
            </section>
        </section>
        `;
    }

    _renderMetricGroupTags() {
        const groups = new Map();

        for (const def of Object.values(METRIC_DEFINITIONS)) {
            const group = def.group || 'other';
            if (!groups.has(group)) groups.set(group, []);
            groups.get(group).push(def);
        }

        const orderedGroups = ['coverage', 'area', 'diversity'];
        return orderedGroups
            .filter(group => groups.has(group))
            .map(group => {
                const defs = groups.get(group) || [];
                const title = group.charAt(0).toUpperCase() + group.slice(1);

                return `
                <div class="compare-metric-tag-group">
                    <div class="compare-metric-tag-group-title">${this._escapeHtml(title)}</div>
                    <div class="compare-metric-tag-list">
                        ${defs.map(def => {
                    const label = def.usesThresholdFraction
                        ? `${def.label} (${(this.global.thresholdFraction * 100).toFixed(0)}%)`
                        : def.label;
                    return `<span class="compare-metric-tag">${this._escapeHtml(label)}</span>`;
                }).join('')}
                    </div>
                </div>
            `;
            })
            .join('');
    }

    _cacheDomReferences() {
        this.dom.pointDistParams = this.container.querySelector('#compPointDistParams');
        this.dom.previewCanvas = this.container.querySelector('#compPreviewCanvas');
        this.dom.configsContainer = this.container.querySelector('#configsContainer');
        this.dom.resultsPanel = this.container.querySelector('#compResultsPanel');
        this.dom.progressSection = this.container.querySelector('#compProgressSection');
    }

    _addNewConfig() {
        if (this.configs.length >= 5) {
            alert('Maximum 5 configurations allowed.');
            return null;
        }

        const cfg = createDefaultConfig(this.nextConfigId++, '');
        this.configs.push(cfg);
        this._reindexAndRenameConfigs();
        return cfg;
    }

    _removeConfigById(configId) {
        const index = this.configs.findIndex(cfg => cfg.id === configId);
        if (index === -1) return;

        if (index < 2) {
            alert('Config A and Config B are required and cannot be removed.');
            return;
        }

        this.configs.splice(index, 1);
        this._reindexAndRenameConfigs();
        this._renderAllConfigCards();
    }

    _renderAllConfigCards() {
        const container = this.dom.configsContainer;
        if (!container) return;

        container.innerHTML = '';
        this.configs.forEach((cfg, idx) => {
            const card = this._createConfigCard(cfg, idx);
            container.appendChild(card);
            this._populateConfigCardUI(cfg);
        });
    }

    _createConfigCard(cfg, idx) {
        const cardDiv = document.createElement('article');
        cardDiv.className = 'config-card compare-panel compare-config-card';
        cardDiv.dataset.configId = String(cfg.id);

        const removeButtonHtml = idx >= 2
            ? `<button class="remove-config-btn small secondary" data-remove-config-id="${cfg.id}" type="button">Remove</button>`
            : '';

        cardDiv.innerHTML = `
        <div class="config-card-header compare-card-header">
            <div>
                <div class="config-card-title">${this._escapeHtml(cfg.name)}</div>
                <div class="config-card-subtitle">
                    Editable algorithm specification for side-by-side comparison.
                </div>
            </div>
            ${removeButtonHtml}
        </div>

        <div class="compare-config-grid" data-config-id="${cfg.id}">
            <section class="compare-config-section" aria-labelledby="cmp-rep-title-${cfg.id}">
                <div class="compare-config-section-head">
                    <h4 id="cmp-rep-title-${cfg.id}">Representation</h4>
                    <p class="compare-config-section-note">
                        Encoding and polygon complexity.
                    </p>
                </div>
                <div class="compare-config-section-body" id="cmp-rep-body-${cfg.id}"></div>
            </section>

            <section class="compare-config-section" aria-labelledby="cmp-mut-title-${cfg.id}">
                <div class="compare-config-section-head">
                    <h4 id="cmp-mut-title-${cfg.id}">Mutation</h4>
                    <p class="compare-config-section-note">
                        Operator choice and mutation-specific parameters.
                    </p>
                </div>
                <div class="compare-config-section-body" id="cmp-mut-body-${cfg.id}"></div>
            </section>

            <section class="compare-config-section" aria-labelledby="cmp-cross-title-${cfg.id}">
                <div class="compare-config-section-head">
                    <h4 id="cmp-cross-title-${cfg.id}">Crossover</h4>
                    <p class="compare-config-section-note">
                        Recombination operator and parameterization.
                    </p>
                </div>
                <div class="compare-config-section-body" id="cmp-cross-body-${cfg.id}"></div>
            </section>

            <section class="compare-config-section" aria-labelledby="cmp-sel-title-${cfg.id}">
                <div class="compare-config-section-head">
                    <h4 id="cmp-sel-title-${cfg.id}">Selection</h4>
                    <p class="compare-config-section-note">
                        Parent selection strategy and related parameters.
                    </p>
                </div>
                <div class="compare-config-section-body" id="cmp-sel-body-${cfg.id}"></div>
            </section>

            <section class="compare-config-section" aria-labelledby="cmp-ea-title-${cfg.id}">
                <div class="compare-config-section-head">
                    <h4 id="cmp-ea-title-${cfg.id}">EA Parameters</h4>
                    <p class="compare-config-section-note">
                        Population size, generations, and elitism.
                    </p>
                </div>
                <div class="compare-config-section-body" id="cmp-ea-body-${cfg.id}"></div>
            </section>
        </div>
    `;

        return cardDiv;
    }
    _populateConfigCardUI(cfg) {
        const repBody = this.container.querySelector(`#cmp-rep-body-${cfg.id}`);
        const mutBody = this.container.querySelector(`#cmp-mut-body-${cfg.id}`);
        const crossBody = this.container.querySelector(`#cmp-cross-body-${cfg.id}`);
        const selBody = this.container.querySelector(`#cmp-sel-body-${cfg.id}`);
        const eaBody = this.container.querySelector(`#cmp-ea-body-${cfg.id}`);

        if (!repBody || !mutBody || !crossBody || !selBody || !eaBody) return;

        const mutationOptions = getMutationTypes().map(type => {
            const def = getMutationDefinition(type, cfg.representation.type);
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

        repBody.innerHTML = `
        <div class="param-row">
            <label for="repType_${cfg.id}">${representationFieldConfig.type.label}</label>
            <select
                id="repType_${cfg.id}"
                data-config-id="${cfg.id}"
                data-field="representation-type"
            >
                ${renderOptions(representationFieldConfig.type.options, cfg.representation.type)}
            </select>
        </div>

        <div class="param-row">
            <label for="vertices_${cfg.id}">${representationFieldConfig.nVertices.label}</label>
            <input
                type="number"
                id="vertices_${cfg.id}"
                min="${representationFieldConfig.nVertices.min}"
                max="${representationFieldConfig.nVertices.max}"
                step="${representationFieldConfig.nVertices.step}"
                value="${cfg.representation.nVertices}"
                data-config-id="${cfg.id}"
                data-field="representation-nVertices"
            >
        </div>
    `;

        mutBody.innerHTML = `
        <div class="param-row">
            <label for="mutType_${cfg.id}">Type</label>
            <select
                id="mutType_${cfg.id}"
                data-config-id="${cfg.id}"
                data-field="mutation-type"
            >
                ${renderOptions(mutationOptions, cfg.mutation.type)}
            </select>
        </div>
        <div id="mutParams_${cfg.id}" class="params-container"></div>
    `;

        crossBody.innerHTML = `
        <div class="param-row">
            <label for="crossType_${cfg.id}">Type</label>
            <select
                id="crossType_${cfg.id}"
                data-config-id="${cfg.id}"
                data-field="crossover-type"
            >
                ${renderOptions(crossoverOptions, cfg.crossover.type)}
            </select>
        </div>
        <div id="crossParams_${cfg.id}" class="params-container"></div>
    `;

        selBody.innerHTML = `
        <div class="param-row">
            <label for="selType_${cfg.id}">Type</label>
            <select
                id="selType_${cfg.id}"
                data-config-id="${cfg.id}"
                data-field="selection-type"
            >
                ${renderOptions(selectionOptions, cfg.selection.type)}
            </select>
        </div>
        <div id="selParams_${cfg.id}" class="params-container"></div>
    `;

        eaBody.innerHTML = `
        <div id="eaParams_${cfg.id}" class="params-container"></div>
    `;

        const mutContainer = mutBody.querySelector(`#mutParams_${cfg.id}`);
        const mutDef = getMutationDefinition(cfg.mutation.type, cfg.representation.type);
        renderParamInputs(mutContainer, mutDef, cfg.mutation.params, `cmp-mut-${cfg.id}`);
        this._decorateParamInputs(mutContainer, cfg.id, 'mutation-param', `cmp-mut-${cfg.id}-param-`);

        const crossContainer = crossBody.querySelector(`#crossParams_${cfg.id}`);
        const crossDef = getCrossoverDefinition(cfg.crossover.type);
        renderParamInputs(crossContainer, crossDef, cfg.crossover.params, `cmp-cross-${cfg.id}`);
        this._decorateParamInputs(crossContainer, cfg.id, 'crossover-param', `cmp-cross-${cfg.id}-param-`);

        const selContainer = selBody.querySelector(`#selParams_${cfg.id}`);
        const selDef = getSelectionDefinition(cfg.selection.type);
        renderParamInputs(selContainer, selDef, cfg.selection.params, `cmp-sel-${cfg.id}`);
        this._decorateParamInputs(selContainer, cfg.id, 'selection-param', `cmp-sel-${cfg.id}-param-`);

        this._renderEvolutionParams(cfg);
    }

    _decorateParamInputs(container, configId, fieldName, idPrefix) {
        if (!container) return;

        const inputs = container.querySelectorAll('input, select');
        inputs.forEach(input => {
            if (!input.id.startsWith(idPrefix)) return;
            const key = input.id.slice(idPrefix.length);
            input.dataset.configId = String(configId);
            input.dataset.field = fieldName;
            input.dataset.key = key;
        });
    }

    _renderEvolutionParams(cfg) {
        const container = this.container.querySelector(`#eaParams_${cfg.id}`);
        if (!container) return;

        const evo = cfg.evolution;
        const f = evolutionFieldConfig;

        container.innerHTML = `
            <div class="param-row">
                <label for="ea_populationSize_${cfg.id}">${f.populationSize.label}</label>
                <input
                    type="number"
                    id="ea_populationSize_${cfg.id}"
                    min="${f.populationSize.min}"
                    step="${f.populationSize.step}"
                    value="${evo.populationSize}"
                    data-config-id="${cfg.id}"
                    data-field="evolution"
                    data-key="populationSize"
                >
            </div>

            <div class="param-row">
                <label for="ea_maxGenerations_${cfg.id}">${f.maxGenerations.label}</label>
                <input
                    type="number"
                    id="ea_maxGenerations_${cfg.id}"
                    min="${f.maxGenerations.min}"
                    step="${f.maxGenerations.step}"
                    value="${evo.maxGenerations}"
                    data-config-id="${cfg.id}"
                    data-field="evolution"
                    data-key="maxGenerations"
                >
            </div>

            <div class="param-row">
                <label for="ea_elitismCount_${cfg.id}">${f.elitismCount.label}</label>
                <input
                    type="number"
                    id="ea_elitismCount_${cfg.id}"
                    min="${f.elitismCount.min}"
                    step="${f.elitismCount.step}"
                    value="${evo.elitismCount}"
                    data-config-id="${cfg.id}"
                    data-field="evolution"
                    data-key="elitismCount"
                >
            </div>
        `;
    }

    _reindexAndRenameConfigs() {
        this.configs.forEach((cfg, idx) => {
            cfg.name = `Config ${String.fromCharCode(65 + idx)}`;
        });
    }

    _bindGlobalEvents() {
        this.container.addEventListener('change', (e) => this._handleChange(e));
        this.container.addEventListener('click', (e) => this._handleClick(e));
        this._renderPointDistForm();
    }

    _handleClick(e) {
        const target = e.target;

        if (target.id === 'addConfigBtn') {
            if (this.configs.length < 5) {
                this._addNewConfig();
                this._renderAllConfigCards();
            } else {
                alert('Maximum 5 configs reached');
            }
            return;
        }

        if (target.id === 'runCompareBtn') {
            this._runComparison();
            return;
        }

        if (target.id === 'clearCompareBtn') {
            this._clearAll();
            return;
        }

        const removeBtn = target.closest('[data-remove-config-id]');
        if (removeBtn) {
            const configId = Number(removeBtn.dataset.removeConfigId);
            this._removeConfigById(configId);
        }
    }

    _handleChange(e) {
        const target = e.target;
        const id = target.id;

        switch (id) {
            case 'compPointDistType':
                this.global.pointDistribution.type = target.value;
                this._onPointDistChanged();
                return;

            case 'compNumRuns':
                this.global.experiment.numRuns = parseIntInput(
                    target,
                    experimentFieldConfig.numRuns.default,
                    experimentFieldConfig.numRuns
                );
                return;

            case 'compSeed':
                this.global.experiment.seed = parseIntInput(
                    target,
                    experimentFieldConfig.seed.default,
                    experimentFieldConfig.seed
                );
                this._generatePoints();
                this._drawPreview();
                return;

            case 'compThresholdFraction':
                this.global.thresholdFraction = parseFloatInput(
                    target,
                    metricFieldConfig.thresholdFraction.default,
                    metricFieldConfig.thresholdFraction
                );

                {
                    const metricTags = this.container.querySelector('.compare-metric-tags');
                    if (metricTags) {
                        metricTags.innerHTML = this._renderMetricGroupTags();
                    }
                }
                return;
        }

        if (id.startsWith('comp-pointdist-param-')) {
            const key = id.slice('comp-pointdist-param-'.length);
            const def = getPointDistributionDefinition(this.global.pointDistribution.type);

            if (def?.params[key]) {
                if (key === 'count' || Number.isInteger(def.params[key].step)) {
                    this.global.pointDistribution.params[key] = parseIntInput(
                        target,
                        def.params[key].default,
                        def.params[key]
                    );
                } else {
                    this.global.pointDistribution.params[key] = parseFloatInput(
                        target,
                        def.params[key].default,
                        def.params[key]
                    );
                }

                this._generatePoints();
                this._drawPreview();
            }
            return;
        }

        const configId = Number(target.dataset.configId);
        if (!configId) return;

        const cfg = this.configs.find(c => c.id === configId);
        if (!cfg) return;

        const field = target.dataset.field;
        const key = target.dataset.key;

        switch (field) {
            case 'representation-type':
                cfg.representation.type = target.value;
                this._refreshMutationUiForConfig(cfg);
                return;

            case 'representation-nVertices':
                cfg.representation.nVertices = parseIntInput(
                    target,
                    representationFieldConfig.nVertices.default,
                    representationFieldConfig.nVertices
                );
                return;

            case 'mutation-type':
                cfg.mutation.type = target.value;
                this._refreshMutationUiForConfig(cfg);
                return;

            case 'crossover-type': {
                cfg.crossover.type = target.value;
                const def = getCrossoverDefinition(cfg.crossover.type);
                cfg.crossover.params = paramsToDefaults(def?.params);
                this._populateConfigCardUI(cfg);
                return;
            }

            case 'selection-type': {
                cfg.selection.type = target.value;
                const def = getSelectionDefinition(cfg.selection.type);
                cfg.selection.params = paramsToDefaults(def?.params);
                this._populateConfigCardUI(cfg);
                return;
            }

            case 'mutation-param': {
                const def = getMutationDefinition(cfg.mutation.type, cfg.representation.type);
                if (def?.params[key]) {
                    if (Number.isInteger(def.params[key].step)) {
                        cfg.mutation.params[key] = parseIntInput(target, def.params[key].default, def.params[key]);
                    } else {
                        cfg.mutation.params[key] = parseFloatInput(target, def.params[key].default, def.params[key]);
                    }
                }
                return;
            }

            case 'crossover-param': {
                const def = getCrossoverDefinition(cfg.crossover.type);
                if (def?.params[key]) {
                    if (Number.isInteger(def.params[key].step)) {
                        cfg.crossover.params[key] = parseIntInput(target, def.params[key].default, def.params[key]);
                    } else {
                        cfg.crossover.params[key] = parseFloatInput(target, def.params[key].default, def.params[key]);
                    }
                }
                return;
            }

            case 'selection-param': {
                const def = getSelectionDefinition(cfg.selection.type);
                if (def?.params[key]) {
                    if (Number.isInteger(def.params[key].step)) {
                        cfg.selection.params[key] = parseIntInput(target, def.params[key].default, def.params[key]);
                    } else {
                        cfg.selection.params[key] = parseFloatInput(target, def.params[key].default, def.params[key]);
                    }
                }
                return;
            }

            case 'evolution':
                if (evolutionFieldConfig[key]) {
                    cfg.evolution[key] = parseIntInput(
                        target,
                        evolutionFieldConfig[key].default,
                        evolutionFieldConfig[key]
                    );
                }
                return;
        }
    }

    _renderPointDistForm() {
        const def = getPointDistributionDefinition(this.global.pointDistribution.type);
        renderParamInputs(
            this.dom.pointDistParams,
            def,
            this.global.pointDistribution.params,
            'comp-pointdist'
        );
    }

    _onPointDistChanged() {
        const def = getPointDistributionDefinition(this.global.pointDistribution.type);
        this.global.pointDistribution.params = paramsToDefaults(def?.params);
        this._renderPointDistForm();
        this._generatePoints();
        this._drawPreview();
    }

    _refreshMutationUiForConfig(cfg) {
        const def = getMutationDefinition(cfg.mutation.type, cfg.representation.type);
        cfg.mutation.params = paramsToDefaults(def?.params);
        this._populateConfigCardUI(cfg);
    }

    _generatePoints() {
        const rng = createRNG(this.global.experiment.seed);
        const safeParams = {
            ...this.global.pointDistribution.params,
            count: parseInt(this.global.pointDistribution.params.count, 10) || 100
        };

        this.points = PointSetGenerator.generate(
            this.global.pointDistribution.type,
            safeParams,
            rng
        );
    }

    _drawPreview() {
        const canvas = this.dom.previewCanvas;
        if (!canvas || !this.points) return;

        const ctx = canvas.getContext('2d');
        const w = canvas.width;
        const h = canvas.height;

        ctx.fillStyle = '#f8f9fa';
        ctx.fillRect(0, 0, w, h);

        const { squareX, squareY, squareSize } = drawCanvasBoundary(ctx, w, h);
        drawPoints(ctx, this.points, squareX, squareY, squareSize);
    }

    async _runComparison() {
        if (this.isRunning) return;
        if (this.configs.length < 2) {
            alert('Need at least 2 configurations to compare.');
            return;
        }

        this.isRunning = true;
        this.configResults = [];
        this.configSnapshots = [];

        const runBtn = this.container.querySelector('#runCompareBtn');
        const clearBtn = this.container.querySelector('#clearCompareBtn');
        const progressDiv = this.dom.progressSection;
        const resultsPanel = this.dom.resultsPanel;

        runBtn.disabled = true;
        clearBtn.disabled = true;
        progressDiv.style.display = 'block';
        resultsPanel.style.display = 'none';

        const totalConfigs = this.configs.length;
        const totalRunsPerConfig = this.global.experiment.numRuns;
        this.container.querySelector('#compTotalConfigs').innerText = totalConfigs;
        this.container.querySelector('#compTotalRuns').innerText = totalRunsPerConfig;
        this.container.querySelector('#compCurrentConfig').innerText = '0';
        this.container.querySelector('#compCurrentRun').innerText = '0';
        this.container.querySelector('#compProgressFill').style.width = '0%';
        this.container.querySelector('#compRunProgressFill').style.width = '0%';

        for (let i = 0; i < totalConfigs; i++) {
            this.container.querySelector('#compCurrentConfig').innerText = i + 1;
            this.container.querySelector('#compProgressFill').style.width = `${(i / totalConfigs) * 100}%`;
            this.container.querySelector('#compCurrentRun').innerText = '0';
            this.container.querySelector('#compRunProgressFill').style.width = '0%';

            const cfg = this.configs[i];
            this.configSnapshots.push(this._captureConfigSnapshot(cfg));

            const evolutionParams = {
                popSize: cfg.evolution.populationSize,
                genCount: cfg.evolution.maxGenerations,
                mutation: {
                    type: cfg.mutation.type,
                    params: cfg.mutation.params
                },
                crossover: {
                    type: cfg.crossover.type,
                    params: cfg.crossover.params
                },
                selection: {
                    type: cfg.selection.type,
                    params: cfg.selection.params
                },
                elitismCount: cfg.evolution.elitismCount,
                representation: cfg.representation.type,
                nVertices: cfg.representation.nVertices
            };

            const loggingOptions = {
                storePopulation: false,
                includeAvgFitness: false,
                diversity: 'per-generation',
                lineageTracking: false
            };

            const configSeed = this._getConfigBaseSeed(i);

            const rawResults = await this._runSingleConfigWithProgress(
                evolutionParams,
                loggingOptions,
                totalRunsPerConfig,
                configSeed
            );
            const processedResults = await this._computeMetricsForResults(rawResults);

            this.configResults.push({
                configIdx: i,
                configName: cfg.name,
                results: processedResults
            });
        }

        this.container.querySelector('#compProgressFill').style.width = '100%';
        this.isRunning = false;
        runBtn.disabled = false;
        clearBtn.disabled = false;
        progressDiv.style.display = 'none';
        resultsPanel.style.display = 'block';

        this._renderResultsTables();
    }

    _getConfigBaseSeed(configIdx) {
        const baseSeed = Number(this.global.experiment.seed);

        if (!Number.isFinite(baseSeed)) {
            return null;
        }

        return baseSeed + configIdx * 1000000;
    }

    _runSingleConfigWithProgress(evolutionParams, loggingOptions, totalRuns, seed) {
        return new Promise((resolve) => {
            const worker = new Worker('./js/workers/evolutionWorker.js', { type: 'module' });
            this.workers.push(worker);

            worker.onmessage = (e) => {
                const data = e.data;

                if (data.type === 'runProgress') {
                    const runCompleted = data.runCompleted;
                    this.container.querySelector('#compCurrentRun').innerText = runCompleted;
                    this.container.querySelector('#compRunProgressFill').style.width = `${(runCompleted / totalRuns) * 100}%`;
                } else if (data.type === 'complete') {
                    worker.terminate();
                    this.workers = this.workers.filter(w => w !== worker);
                    resolve(data.results || []);
                } else if (data.type === 'error') {
                    console.error('Worker error:', data.message);
                    worker.terminate();
                    this.workers = this.workers.filter(w => w !== worker);
                    resolve([]);
                }
            };

            worker.postMessage({
                evolutionParams,
                points: this.points,
                loggingOptions,
                numRuns: totalRuns,
                seed
            });
        });
    }

    _computeMetricsForResults(rawResults) {
        return new Promise((resolve) => {
            const worker = new Worker('./js/workers/metricsWorker.js', { type: 'module' });

            worker.onmessage = (e) => {
                const data = e.data;

                if (data.type === 'complete') {
                    worker.terminate();
                    resolve(data.results || []);
                } else if (data.type === 'error') {
                    console.error('Metrics worker error:', data.message);
                    worker.terminate();
                    resolve([]);
                }
            };

            worker.postMessage({
                results: rawResults,
                metricsConfig: {
                    maxPossibleCoverage: this.global.pointDistribution.params.count ?? 100,
                    coverageThreshold: this.global.thresholdFraction
                },
                outputConfig: {
                    metrics: METRIC_KEYS
                }
            });
        });
    } _captureConfigSnapshot(cfg) {
        const mutationDef = getMutationDefinition(cfg.mutation.type, cfg.representation.type);
        const crossoverDef = getCrossoverDefinition(cfg.crossover.type);

        return {
            name: cfg.name,
            representation: cfg.representation.type,
            nVertices: cfg.representation.nVertices,
            mutation: {
                type: cfg.mutation.type,
                label: mutationDef?.label ?? cfg.mutation.type,
                params: JSON.parse(JSON.stringify(cfg.mutation.params || {}))
            },
            crossover: {
                type: cfg.crossover.type,
                label: crossoverDef?.label ?? cfg.crossover.type,
                params: JSON.parse(JSON.stringify(cfg.crossover.params || {}))
            },
            selection: {
                type: cfg.selection.type,
                label: getSelectionDefinition(cfg.selection.type)?.label ?? cfg.selection.type,
                params: JSON.parse(JSON.stringify(cfg.selection.params || {}))
            },
            evolution: {
                populationSize: cfg.evolution.populationSize,
                maxGenerations: cfg.evolution.maxGenerations,
                elitismCount: cfg.evolution.elitismCount
            }
        };
    }

    _renderResultsTables() {
        this.statisticsResults = computeExperimentStatistics(this.configResults, {
            alpha: 0.05,
            thresholdFraction: this.global.thresholdFraction
        });
        this._renderStatisticalTests();
    }

    _renderStatisticalTests() {
        const container = this.container.querySelector('#compStatisticsContent');
        if (!container) return;

        if (!this.statisticsResults || !this.statisticsResults.metricResults?.length) {
            container.innerHTML = '<p>No statistical test results available.</p>';
            return;
        }

        const metricResults = this.statisticsResults.metricResults || [];
        const grouped = this._groupMetricResults(metricResults);

        container.innerHTML = `
            ${this._renderExperimentContext()}
            ${this._renderConfigsSummaryTable(this.configSnapshots)}
            ${this._renderMetricSection(
            'Coverage metrics',
            'Coverage outcomes, convergence threshold behaviour, and success rate.',
            grouped.coverage
        )}
            ${this._renderMetricSection(
            'Area metrics',
            'Area is interpreted only on successful full-coverage runs.',
            grouped.area
        )}
            ${this._renderMetricSection(
            'Diversity metrics',
            'Population diversity summaries across the run.',
            grouped.diversity
        )}
        `;
    }

    _groupMetricResults(metricResults) {
        const groups = {
            coverage: [],
            area: [],
            diversity: []
        };

        for (const metricResult of metricResults) {
            const group = METRIC_DEFINITIONS[metricResult.metric]?.group;
            if (group && groups[group]) {
                groups[group].push(metricResult);
            }
        }

        return groups;
    }

    _renderExperimentContext() {
        const pointSetDef =
            getPointDistributionDefinition(this.global.pointDistribution.type) || {};
        const pointSetLabel = pointSetDef?.label ?? this.global.pointDistribution.type;
        const pointParams = this.global.pointDistribution.params || {};

        const formatGlobalValue = (value) => this._escapeHtml(this._formatConfigValue(value));

        const pointParamEntries = Object.entries(pointSetDef?.params || {})
            .map(([key, def]) => ({
                key,
                label: def?.label ?? key,
                value: pointParams[key]
            }));

        return `
        <section class="stats-section compare-panel">
            <div class="stats-section-head">
                <div>
                    <h4>Experiment context</h4>
                    <div class="compare-subtitle">Shared setup used for all compared configurations</div>
                </div>
            </div>

            <div class="context-groups-grid">
                <div class="context-group-card">
                    <div class="context-group-title">Experiment</div>
                    <div class="context-group-rows">
                        <div class="context-row">
                            <span class="context-row-label">${this._escapeHtml(experimentFieldConfig.numRuns.label)}</span>
                            <span class="context-row-value">${formatGlobalValue(this.global.experiment.numRuns)}</span>
                        </div>
                        <div class="context-row">
                            <span class="context-row-label">${this._escapeHtml(experimentFieldConfig.seed.label)}</span>
                            <span class="context-row-value">${formatGlobalValue(this.global.experiment.seed)}</span>
                        </div>
                    </div>
                </div>

                <div class="context-group-card">
                    <div class="context-group-title">Point set</div>
                    <div class="context-group-rows">
                        <div class="context-row">
                            <span class="context-row-label">Point Set</span>
                            <span class="context-row-value">${this._escapeHtml(String(pointSetLabel))}</span>
                        </div>
                        ${pointParamEntries.map(entry => `
                            <div class="context-row">
                                <span class="context-row-label">${this._escapeHtml(entry.label)}</span>
                                <span class="context-row-value">${formatGlobalValue(entry.value)}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>

                <div class="context-group-card">
                    <div class="context-group-title">Metrics</div>
                    <div class="context-group-rows">
                        <div class="context-row">
                            <span class="context-row-label">Coverage Threshold</span>
                            <span class="context-row-value">${this._escapeHtml(`${(this.global.thresholdFraction * 100).toFixed(0)}%`)}</span>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    `;
    }

    _renderMetricSection(title, subtitle, metricResults) {
        if (!metricResults?.length) return '';

        return `
            <section class="stats-section compare-panel">
                <div class="stats-section-head">
                    <div>
                        <h4>${this._escapeHtml(title)}</h4>
                        <div class="compare-subtitle">${this._escapeHtml(subtitle)}</div>
                    </div>
                </div>

                ${this._buildMetricsSummaryTable(metricResults)}
                ${this._buildPairwiseTableForMetrics(metricResults)}
            </section>
        `;
    }

    _buildMetricsSummaryTable(metricResults) {
        const topHeader = `
        <tr>
            <th>Metric</th>
            ${this.configs.map(cfg => `<th>${this._escapeHtml(cfg.name)}</th>`).join('')}
            <th>Overall diff.</th>
        </tr>
    `;

        const rows = metricResults.map(metricResult => {
            const summaryCells = this.configs.map(cfg => {
                if (metricResult.metric === 'reachedFullCoverage') {
                    return `<td class="metric-summary">${this._escapeHtml(this._formatSuccessRate(cfg.name))}</td>`;
                }

                const group = this._findGroupSummary(metricResult, cfg.name);
                return `<td class="metric-summary">${this._escapeHtml(this._formatSummary(group))}</td>`;
            }).join('');

            const omnibus = metricResult.omnibus;
            let omnibusCell = `<td class="omnibus-cell omnibus-cell-empty">-</td>`;

            if (omnibus) {
                const isSig = !!omnibus.significant;
                const cls = isSig
                    ? 'omnibus-cell omnibus-cell-sig'
                    : 'omnibus-cell omnibus-cell-ns';

                omnibusCell = `
                <td class="${cls}">
                    <div class="omnibus-status">${isSig ? 'Significant' : 'Not significant'}</div>
                    <div class="omnibus-pvalue">p = ${this._escapeHtml(this._formatPValue(omnibus.p))}</div>
                </td>
            `;
            }

            return `
            <tr>
                <td class="metric-name">${this._escapeHtml(this._formatDisplayMetricName(metricResult.metric))}</td>
                ${summaryCells}
                ${omnibusCell}
            </tr>
        `;
        }).join('');

        return `
        <div class="stats-table-block">
            <div class="stats-table-title">Table A — descriptive summaries + omnibus test</div>
            <div class="stats-table-note">
                Continuous metrics are shown as median [Q1, Q3]. Success rate is shown as successful runs / total runs (%). The final column shows the omnibus significance result for 3+ configs.
            </div>
            <div class="plain-table-wrap">
                <table class="compare-stats-table">
                    <thead>${topHeader}</thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>
        </div>
    `;
    }

    _buildPairwiseTableForMetrics(metricResults) {
        const pairwiseMetrics = (metricResults || []).filter(
            (mr) => mr.metric !== 'reachedFullCoverage'
        );

        if (!pairwiseMetrics.length) return '';

        const pairLabels = [];
        for (let i = 0; i < this.configs.length; i++) {
            for (let j = i + 1; j < this.configs.length; j++) {
                pairLabels.push([
                    this.configs[i].name,
                    this.configs[j].name,
                    this._getConfigLetter(this.configs[i].name),
                    this._getConfigLetter(this.configs[j].name)
                ]);
            }
        }

        const headerCols = ['<th>Metric</th>']
            .concat(
                pairLabels.map(([, , aLetter, bLetter]) =>
                    `<th>${this._escapeHtml(aLetter)} vs ${this._escapeHtml(bLetter)}</th>`
                )
            )
            .join('');

        const rows = pairwiseMetrics.map(metricResult => {
            const pairwiseMap = new Map();

            for (const row of (metricResult.pairwise || [])) {
                pairwiseMap.set(`${row.configA}|||${row.configB}`, row);
                pairwiseMap.set(`${row.configB}|||${row.configA}`, row);
            }

            const cells = pairLabels.map(([aName, bName]) => {
                const row = pairwiseMap.get(`${aName}|||${bName}`);
                if (!row) return `<td class="pairwise-pcell pairwise-pcell-empty">-</td>`;

                const pAdj = row.pAdjusted ?? row.p;
                const isSig = Number.isFinite(pAdj)
                    ? pAdj <= (this.statisticsResults?.alpha ?? 0.05)
                    : false;

                const cls = isSig
                    ? 'pairwise-pcell pairwise-pcell-sig'
                    : 'pairwise-pcell pairwise-pcell-ns';

                return `
                <td class="${cls}">
                    <div class="pairwise-badge">${isSig ? 'Significant' : 'Not significant'}</div>
                    <div class="pairwise-pvalue">p = ${this._escapeHtml(this._formatPValue(pAdj))}</div>
                </td>
            `;
            }).join('');

            return `
            <tr>
                <td class="metric-name">${this._escapeHtml(this._formatDisplayMetricName(metricResult.metric))}</td>
                ${cells}
            </tr>
        `;
        }).join('');

        return `
        <div class="stats-table-block">
            <div class="stats-table-title">Table B — corrected pairwise comparisons</div>
            <div class="stats-table-note">
                Bonferroni-corrected pairwise p-values for comparable continuous metrics only. Compare each corrected p-value directly with 0.05.
            </div>
            <div class="plain-table-wrap">
                <table class="compare-stats-table compare-pairwise-table">
                    <thead><tr>${headerCols}</tr></thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>
        </div>
    `;
    }

    _formatPValue(value) {
        if (value == null || Number.isNaN(value) || !Number.isFinite(value)) return '-';
        return Number(value).toExponential(3);
    }

    _formatDisplayMetricName(metric) {
        const def = METRIC_DEFINITIONS[metric];
        if (!def) return metric || '-';

        if (def.usesThresholdFraction) {
            return `${def.label} (${(this.global.thresholdFraction * 100).toFixed(0)}%)`;
        }

        return def.label;
    }

    _formatMetricValue(value) {
        if (value == null || Number.isNaN(value) || !Number.isFinite(value)) return '-';
        if (Number.isInteger(value)) return String(value);
        const abs = Math.abs(value);
        if (abs > 0 && abs < 0.0001) return Number(value).toExponential(3);
        return Number(value).toFixed(4);
    }

    _formatSummary(group) {
        if (!group) return '-';
        return `${this._formatMetricValue(group.median)} [${this._formatMetricValue(group.q1)}, ${this._formatMetricValue(group.q3)}]`;
    }

    _findGroupSummary(metricResult, configName) {
        return metricResult.groupSummaries?.find(group => group.configName === configName) || null;
    }

    _escapeHtml(value) {
        return String(value ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    _getConfigLetter(configName) {
        const match = String(configName || '').match(/Config\\s+([A-Z])/i);
        return match ? match[1].toUpperCase() : String(configName || '').trim();
    }

    _formatConfigValue(value) {
        if (value == null) return '-';
        if (typeof value === 'number') {
            if (Number.isInteger(value)) return String(value);
            if (Math.abs(value) > 0 && Math.abs(value) < 0.0001) return Number(value).toExponential(3);
            return Number(value).toFixed(4);
        }
        if (typeof value === 'boolean') return value ? 'true' : 'false';
        return String(value);
    }

    _getSuccessRateSummary(configName) {
        const configResult = (this.configResults || []).find(cr => cr.configName === configName);
        const runs = configResult?.results || [];
        let successCount = 0;

        for (const run of runs) {
            if (run.metrics?.reachedFullCoverage === 1) successCount++;
        }

        const total = runs.length;
        return {
            successCount,
            total,
            fraction: total > 0 ? successCount / total : NaN
        };
    }

    _formatSuccessRate(configName) {
        const { successCount, total, fraction } = this._getSuccessRateSummary(configName);
        if (!total) return '-';
        return `${successCount}/${total} (${(fraction * 100).toFixed(1)}%)`;
    }

    _renderConfigsSummaryTable(configsToShow = []) {
        if (!configsToShow.length) return '';

        const getEaValue = (snapshot, key, fallback = '-') => {
            if (snapshot?.evolution && snapshot.evolution[key] !== undefined) {
                return snapshot.evolution[key];
            }

            const fromEntries = (snapshot?.eaEntries || []).find(entry => entry.key === key);
            return fromEntries?.value ?? fallback;
        };

        const rows = [
            {
                label: 'Representation',
                values: configsToShow.map(s => {
                    const label =
                        representationFieldConfig.type.options.find(opt => opt.value === s.representation)?.label ??
                        s.representation;
                    return this._formatConfigValue(label);
                })
            },
            {
                label: 'Vertices',
                values: configsToShow.map(s => this._formatConfigValue(s.nVertices))
            },
            {
                label: 'Mutation',
                values: configsToShow.map(s => {
                    const params = Object.entries(s.mutation?.params || {})
                        .map(([k, v]) => `${k}=${this._formatConfigValue(v)}`)
                        .join(', ');
                    return params ? `${s.mutation?.label ?? '-'} (${params})` : (s.mutation?.label ?? '-');
                })
            },
            {
                label: 'Crossover',
                values: configsToShow.map(s => {
                    const params = Object.entries(s.crossover?.params || {})
                        .map(([k, v]) => `${k}=${this._formatConfigValue(v)}`)
                        .join(', ');
                    return params ? `${s.crossover?.label ?? '-'} (${params})` : (s.crossover?.label ?? '-');
                })
            },
            {
                label: 'Selection',
                values: configsToShow.map(s => {
                    const params = Object.entries(s.selection?.params || {})
                        .map(([k, v]) => `${k}=${this._formatConfigValue(v)}`)
                        .join(', ');
                    return params ? `${s.selection?.label ?? '-'} (${params})` : (s.selection?.label ?? '-');
                })
            },
            {
                label: 'EA parameters',
                values: configsToShow.map(s =>
                    [
                        `${evolutionFieldConfig.populationSize.label}=${this._formatConfigValue(getEaValue(s, 'populationSize'))}`,
                        `${evolutionFieldConfig.maxGenerations.label}=${this._formatConfigValue(getEaValue(s, 'maxGenerations'))}`,
                        `${evolutionFieldConfig.elitismCount.label}=${this._formatConfigValue(getEaValue(s, 'elitismCount'))}`
                    ].join(', ')
                )
            }
        ];

        return `
        <section class="stats-section compare-panel">
            <div class="stats-section-head">
                <div>
                    <h4>Compared configurations</h4>
                    <div class="compare-subtitle">Table 1 — exact settings used for each configuration</div>
                </div>
            </div>

            <div class="plain-table-wrap">
                <table class="compare-stats-table compare-config-summary-table">
                    <thead>
                        <tr>
                            <th>Setting</th>
                            ${configsToShow.map(s => `<th>${this._escapeHtml(s.name)}</th>`).join('')}
                        </tr>
                    </thead>
                    <tbody>
                        ${rows.map(row => `
                            <tr>
                                <td class="metric-name">${this._escapeHtml(row.label)}</td>
                                ${row.values.map(v => `<td>${this._escapeHtml(v)}</td>`).join('')}
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </section>
    `;
    }

    _clearAll() {
        if (this.isRunning) {
            if (this.workers.length) this.workers.forEach(w => w.terminate());
            this.isRunning = false;
        }

        this.configResults = [];
        this.statisticsResults = null;
        this.configSnapshots = [];
        this.workers = [];

        const progressDiv = this.dom.progressSection;
        const resultsPanel = this.dom.resultsPanel;
        if (progressDiv) progressDiv.style.display = 'none';
        if (resultsPanel) resultsPanel.style.display = 'none';

        const runBtn = this.container.querySelector('#runCompareBtn');
        const clearBtn = this.container.querySelector('#clearCompareBtn');
        if (runBtn) runBtn.disabled = false;
        if (clearBtn) clearBtn.disabled = false;

        const pointDistType = POINT_DISTRIBUTION_TYPES.UNIFORM;
        const pointDistDef = getPointDistributionDefinition(pointDistType);

        this.global = {
            pointDistribution: {
                type: pointDistType,
                params: paramsToDefaults(pointDistDef?.params)
            },
            experiment: {
                numRuns: DEFAULT_EXPERIMENT_CONFIG.numRuns,
                seed: DEFAULT_EXPERIMENT_CONFIG.seed
            },
            thresholdFraction: DEFAULT_METRIC_CONFIG.thresholdFraction
        };

        this.configs = [];
        this.nextConfigId = 1;

        const pointDistSelect = this.container.querySelector('#compPointDistType');
        const numRunsInput = this.container.querySelector('#compNumRuns');
        const seedInput = this.container.querySelector('#compSeed');
        const thresholdInput = this.container.querySelector('#compThresholdFraction');

        if (pointDistSelect) pointDistSelect.value = this.global.pointDistribution.type;
        if (numRunsInput) numRunsInput.value = this.global.experiment.numRuns;
        if (seedInput) seedInput.value = this.global.experiment.seed;
        if (thresholdInput) thresholdInput.value = this.global.thresholdFraction;

        this._renderPointDistForm();
        this._addNewConfig();
        this._addNewConfig();
        this._renderAllConfigCards();
        this._generatePoints();
        this._drawPreview();
    }

    destroy() {
        if (this.workers.length) this.workers.forEach(w => w.terminate());
        this.container.innerHTML = '';
    }
}