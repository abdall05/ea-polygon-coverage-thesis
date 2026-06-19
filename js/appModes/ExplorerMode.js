import { PointSetGenerator } from '../model/points/PointSetGenerator.js';
import {
    drawStandardScene,
    drawFittedScene
} from '../rendering/canvas.js';
import {
    drawCoverageGraph,
    drawAreaGraph,
    drawDiversityGraph,
    drawExpandedGraph,
    purgePlot
} from '../rendering/charts.js';

import {
    representationFieldConfig,
    DEFAULT_REPRESENTATION_CONFIG
} from '../model/individuals/individualConfig.js';

import {
    getMutationDefinition,
    getMutationTypes,
    DEFAULT_MUTATION_TYPE
} from '../model/mutations/mutationConfig.js';

import {
    getCrossoverDefinition,
    getCrossoverTypes,
    DEFAULT_CROSSOVER_TYPE
} from '../model/crossovers/crossoverConfig.js';

import {
    getSelectionDefinition,
    getSelectionTypes,
    DEFAULT_SELECTION_TYPE
} from '../model/selections/selectionConfig.js';

import {
    getPointDistributionDefinition,
    getPointDistributionTypes,
    POINT_DISTRIBUTION_TYPES
} from '../model/points/pointDistributionConfig.js';

import {
    evolutionFieldConfig,
    DEFAULT_EVOLUTION_CONFIG
} from '../model/engine/engineConfig.js';

import {
    paramsToDefaults,
    parseIntInput,
    parseFloatInput,
    renderOptions,
    renderParamInputs
} from '../utils/configUiHelpers.js';

/* ────────────────────────────────────────────
   Default state factory
   ──────────────────────────────────────────── */
const createDefaultState = () => {
    const repType = DEFAULT_REPRESENTATION_CONFIG.type;
    const mutationDef = getMutationDefinition(DEFAULT_MUTATION_TYPE, repType);
    const crossoverDef = getCrossoverDefinition(DEFAULT_CROSSOVER_TYPE);
    const selectionDef = getSelectionDefinition(DEFAULT_SELECTION_TYPE);
    const pointDistDef = getPointDistributionDefinition(POINT_DISTRIBUTION_TYPES.UNIFORM);

    return {
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
        pointDistribution: {
            type: POINT_DISTRIBUTION_TYPES.UNIFORM,
            params: paramsToDefaults(pointDistDef?.params)
        },
        evolution: {
            populationSize: DEFAULT_EVOLUTION_CONFIG.populationSize,
            maxGenerations: DEFAULT_EVOLUTION_CONFIG.maxGenerations,
            elitismCount: DEFAULT_EVOLUTION_CONFIG.elitismCount
        },
        points: null,
        history: null,
        currentGen: 0,
        currentRank: 0,
        runPoints: null,
        isRunning: false,
        worker: null
    };
};

/* ────────────────────────────────────────────
   ExplorerMode
   ──────────────────────────────────────────── */
export class ExplorerMode {
    constructor(container) {
        this.container = container;
        this.state = createDefaultState();
        this._dom = {};
        this._lastRepType = this.state.representation.type;
        this._lastMutationType = this.state.mutation.type;
        this._lastCrossoverType = this.state.crossover.type;
        this._lastSelectionType = this.state.selection.type;
        this._lastPointDistType = this.state.pointDistribution.type;
        this._lastFocusedElement = null;
        this._lineageKeyHandler = null;
    }

    async start() {
        this._renderBase();
        this._cacheDomReferences();
        this._bindDelegatedEvents();
        this._renderAllDynamicForms();
        this._syncUIControls();
        this._updatePoints(true);
        this._drawPreview();
    }

    /* ---------- Base UI (renders once) ---------- */
    _renderBase() {
        const repCfg = representationFieldConfig;

        const mutationOptions = getMutationTypes().map(type => {
            const def = getMutationDefinition(type, this.state.representation.type);
            return {
                value: type,
                label: def?.label ?? type
            };
        });

        const crossoverOptions = getCrossoverTypes().map(type => {
            const def = getCrossoverDefinition(type);
            return {
                value: type,
                label: def?.label ?? type
            };
        });

        const selectionOptions = getSelectionTypes().map(type => {
            const def = getSelectionDefinition(type);
            return {
                value: type,
                label: def?.label ?? type
            };
        });

        this.container.innerHTML = `
<div class="explorer-layout">
  <section id="progressSection" class="progress-section" style="display:none;">
    <div class="gen-status">
      Generation <span id="currentGen">0</span> of <span id="totalGens">${this.state.evolution.maxGenerations}</span>
    </div>
    <div class="progress-bar">
      <div id="progressFill" class="progress-fill" style="width:0%"></div>
    </div>
  </section>

  <aside class="config-panel" aria-label="Configuration">
    <section class="config-section">
      <h3>Point Set</h3>
      <div class="param-row">
        <label for="im-pointDist-type">Distribution</label>
        <select id="im-pointDist-type">
          ${renderOptions(getPointDistributionTypes(), this.state.pointDistribution.type)}
        </select>
      </div>
      <div id="im-pointDist-params"></div>

      <div class="preview-container">
        <div class="preview-label">Point Set Preview</div>
        <canvas id="previewCanvas" width="400" height="400" class="preview-canvas"></canvas>
        <div class="preview-actions">
          <button id="refreshPointsBtn" class="refresh-btn" type="button">Refresh Points</button>
        </div>
      </div>
    </section>

    <section class="config-section">
      <h3>Representation</h3>
      <div class="param-row">
        <label for="im-rep-type">${repCfg.type.label}</label>
        <select id="im-rep-type">
          ${renderOptions(repCfg.type.options, this.state.representation.type)}
        </select>
      </div>
      <div class="param-row">
        <label for="im-rep-nVertices">${repCfg.nVertices.label}</label>
        <input
          id="im-rep-nVertices"
          type="number"
          min="${repCfg.nVertices.min}"
          max="${repCfg.nVertices.max}"
          step="${repCfg.nVertices.step}"
          value="${this.state.representation.nVertices}"
        >
      </div>
    </section>

    <section class="config-section">
      <h3>Mutation</h3>
      <div class="param-row">
        <label for="im-mutation-type">Type</label>
        <select id="im-mutation-type">
          ${renderOptions(mutationOptions, this.state.mutation.type)}
        </select>
      </div>
      <div id="im-mutation-params"></div>
    </section>

    <section class="config-section">
      <h3>Crossover</h3>
      <div class="param-row">
        <label for="im-crossover-type">Type</label>
        <select id="im-crossover-type">
          ${renderOptions(crossoverOptions, this.state.crossover.type)}
        </select>
      </div>
      <div id="im-crossover-params"></div>
    </section>

    <section class="config-section">
      <h3>Selection</h3>
      <div class="param-row">
        <label for="im-selection-type">Type</label>
        <select id="im-selection-type">
          ${renderOptions(selectionOptions, this.state.selection.type)}
        </select>
      </div>
      <div id="im-selection-params"></div>
    </section>

    <section id="im-evolution-params" class="config-section"></section>

    <div class="action-buttons">
      <button id="runBtn" class="primary" type="button">Run Evolution</button>
      <button id="clearBtn" class="secondary" type="button">Reset View</button>
    </div>
  </aside>

  <section class="results-panel" aria-label="Explorer results">
    <div class="results-top-row">
      <section id="mainCanvasContainer" class="canvas-column" style="display:none;">
        <h3 class="section-title">Current Solution</h3>
        <canvas id="mainCanvas" width="550" height="550"></canvas>
      </section>

      <section id="populationExplorerContainer" class="explorer-column" style="display:none;">
        <div class="mini-gallery">
          <h3 class="section-title">Population Explorer</h3>

          <div id="browserView">
            <div class="browser-summary">
              <div class="browser-rank">
                Individual <span id="individualRank">1</span> / <span id="populationCount">${this.state.evolution.populationSize}</span>
              </div>
              <div id="browserStats"></div>
            </div>

            <div class="gen-controls population-controls">
              <div class="gen-row">
                <span class="gen-label">Population Rank</span>
                <span id="rankDisplay">Best</span>
              </div>
              <div class="gen-row">
                <input
                  type="range"
                  id="populationSlider"
                  min="0"
                  max="${this.state.evolution.populationSize - 1}"
                  value="0"
                  step="1"
                  disabled
                >
              </div>
              <div class="range-legend">
                <span>Best</span>
                <span>Worst</span>
              </div>
            </div>
          </div>

          <div class="diversity-metric">
            <div class="diversity-label">Population Diversity</div>
            <div class="diversity-value" id="diversityValue">0.000</div>
          </div>
        </div>
      </section>
    </div>

    <section id="generationSliderContainer" class="slider-row" style="display:none;">
      <h3 class="section-title">Generation Navigation</h3>
      <div class="gen-controls">
        <div class="gen-row">
          <span class="gen-label">Generation</span>
          <span id="genDisplay">0 / ${this.state.evolution.maxGenerations}</span>
        </div>
        <div class="gen-row">
          <input
            type="range"
            id="genSlider"
            min="0"
            max="${this.state.evolution.maxGenerations}"
            value="0"
            step="1"
            disabled
          >
        </div>
      </div>
    </section>

    <section id="graphsContainer" class="graphs-section" style="display:none;">
      <h3 class="section-title">Convergence Graphs</h3>
      <div class="graph-row explorer-graph-row">
        <div class="graph-item">
          <div class="graph-head">
            <div class="graph-label">Coverage over Generations</div>
            <button class="button small expand-graph-btn" data-graph="coverage" type="button">Expand</button>
          </div>
          <div id="coverageGraph" style="width:100%;height:280px;"></div>
        </div>

        <div class="graph-item">
          <div class="graph-head">
            <div class="graph-label">Area over Generations</div>
            <button class="button small expand-graph-btn" data-graph="area" type="button">Expand</button>
          </div>
          <div id="areaGraph" style="width:100%;height:280px;"></div>
        </div>

        <div class="graph-item">
          <div class="graph-head">
            <div class="graph-label">Diversity over Generations</div>
            <button class="button small expand-graph-btn" data-graph="diversity" type="button">Expand</button>
          </div>
          <div id="diversityGraph" style="width:100%;height:280px;"></div>
        </div>
      </div>
    </section>

    <div id="emptyHelper" class="empty-helper">
      Configure the evolutionary settings and run the algorithm to inspect solutions, generations, and convergence behaviour.
    </div>
  </section>

  ${this._createModal()}
</div>`;
    }

    _refreshMutationUi() {
        this._rebuildMutationDefaults();

        const mutationTypeSelect = this.container.querySelector('#im-mutation-type');
        if (mutationTypeSelect) {
            const mutationOptions = getMutationTypes().map(type => {
                const def = getMutationDefinition(type, this.state.representation.type);
                return {
                    value: type,
                    label: def?.label ?? type
                };
            });

            mutationTypeSelect.innerHTML = renderOptions(mutationOptions, this.state.mutation.type);
            mutationTypeSelect.value = this.state.mutation.type;
        }

        this._renderMutationForm();
    }

    _createModal() {
        return `
<div id="graphModal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,0.65);z-index:9999;align-items:center;justify-content:center;padding:24px;">
  <div style="background:white;width:min(1400px,96vw);height:min(90vh,900px);border-radius:12px;padding:16px;display:flex;flex-direction:column;box-shadow:0 20px 60px rgba(0,0,0,0.25);">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
      <h3 id="graphModalTitle" style="margin:0;">Expanded Graph</h3>
      <button id="closeGraphModal" class="button">Close</button>
    </div>
    <div id="graphModalPlot" style="width:100%;height:100%;min-height:500px;"></div>
  </div>
</div>
<div id="lineageModal" class="lineage-modal" aria-hidden="true">
  <div class="lineage-dialog" role="dialog" aria-modal="true" aria-labelledby="lineageModalTitle" aria-describedby="lineageModalSubtitle">
    <div class="lineage-header">
      <div class="lineage-header-main">
        <h3 id="lineageModalTitle" class="lineage-title">Individual Lineage</h3>
        <div id="lineageModalSubtitle" class="lineage-subtitle"></div>
      </div>
      <button id="closeLineageModal" class="button lineage-close" type="button" aria-label="Close lineage dialog">Close</button>
    </div>
    <div id="lineageModalBody" class="lineage-body"></div>
  </div>
</div>`;
    }

    /* ---------- DOM references ---------- */
    _cacheDomReferences() {
        this._dom.pointDistParams = this.container.querySelector('#im-pointDist-params');
        this._dom.mutationParams = this.container.querySelector('#im-mutation-params');
        this._dom.crossoverParams = this.container.querySelector('#im-crossover-params');
        this._dom.selectionParams = this.container.querySelector('#im-selection-params');
        this._dom.evolutionParams = this.container.querySelector('#im-evolution-params');
        this._dom.previewCanvas = document.getElementById('previewCanvas');
    }

    /* ---------- Event delegation ---------- */
    _bindDelegatedEvents() {
        this.container.addEventListener('change', (e) => this._handleChange(e));
        this.container.addEventListener('click', (e) => this._handleClick(e));
    }

    _handleChange(e) {
        const id = e.target.id;

        switch (id) {
            case 'im-pointDist-type':
                this.state.pointDistribution.type = e.target.value;
                this._onPointDistChanged();
                break;

            case 'im-rep-type':
                this.state.representation.type = e.target.value;
                this._onRepChanged();
                break;

            case 'im-rep-nVertices':
                this.state.representation.nVertices = parseIntInput(
                    e.target,
                    representationFieldConfig.nVertices.default,
                    representationFieldConfig.nVertices
                );
                break;

            case 'im-mutation-type':
                this.state.mutation.type = e.target.value;
                this._onMutationChanged();
                break;

            case 'im-crossover-type':
                this.state.crossover.type = e.target.value;
                this._onCrossoverChanged();
                break;

            case 'im-selection-type':
                this.state.selection.type = e.target.value;
                this._onSelectionChanged();
                break;

            default:
                if (id.startsWith('im-mut-param-')) {
                    const key = id.slice('im-mut-param-'.length);
                    const def = getMutationDefinition(
                        this.state.mutation.type,
                        this.state.representation.type
                    );

                    if (def?.params[key]) {
                        this.state.mutation.params[key] = parseFloatInput(
                            e.target,
                            def.params[key].default,
                            def.params[key]
                        );
                    }
                } else if (id.startsWith('im-cross-param-')) {
                    const key = id.slice('im-cross-param-'.length);
                    const def = getCrossoverDefinition(this.state.crossover.type);

                    if (def?.params[key]) {
                        this.state.crossover.params[key] = parseFloatInput(
                            e.target,
                            def.params[key].default,
                            def.params[key]
                        );
                    }
                } else if (id.startsWith('im-sel-param-')) {
                    const key = id.slice('im-sel-param-'.length);
                    const def = getSelectionDefinition(this.state.selection.type);

                    if (def?.params[key]) {
                        this.state.selection.params[key] = parseFloatInput(
                            e.target,
                            def.params[key].default,
                            def.params[key]
                        );
                    }
                } else if (id.startsWith('im-pointdist-param-')) {
                    const key = id.slice('im-pointdist-param-'.length);
                    const def = getPointDistributionDefinition(this.state.pointDistribution.type);

                    if (def?.params[key]) {
                        if (key === 'count') {
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
                } else if (id.startsWith('im-evo-')) {
                    const key = id.slice('im-evo-'.length);
                    const cfg = evolutionFieldConfig[key];

                    if (cfg) {
                        this.state.evolution[key] = parseIntInput(
                            e.target,
                            cfg.default,
                            cfg
                        );

                        if (key === 'populationSize' || key === 'maxGenerations') {
                            this._syncGenAndPopSliders();
                        }
                    }
                }
                break;
        }
    }

    _handleClick(e) {
        const id = e.target.id;

        switch (id) {
            case 'refreshPointsBtn':
                this._updatePoints(true);
                this._drawPreview();
                break;
            case 'runBtn':
                this._runEvolution();
                break;
            case 'clearBtn':
                this._clear();
                break;
            case 'closeGraphModal':
                this._closeGraphModal();
                break;
            case 'closeLineageModal':
                this._closeLineageModal();
                break;
            default:
                if (e.target.classList.contains('expand-graph-btn')) {
                    this._openExplorerGraphModal(e.target.dataset.graph);
                }
                break;
        }

        if (e.target.id === 'graphModal') this._closeGraphModal();
        if (e.target.classList.contains('lineage-modal')) this._closeLineageModal();
    }

    /* ---------- Type-change handlers ---------- */
    _onRepChanged() {
        if (this.state.representation.type !== this._lastRepType) {
            this._lastRepType = this.state.representation.type;
            this._refreshMutationUi();
        }
    }

    _onMutationChanged() {
        if (this.state.mutation.type !== this._lastMutationType) {
            this._lastMutationType = this.state.mutation.type;
            this._refreshMutationUi();
        }
    }

    _rebuildMutationDefaults() {
        const def = getMutationDefinition(
            this.state.mutation.type,
            this.state.representation.type
        );

        this.state.mutation.params = paramsToDefaults(def?.params);
    }

    _onCrossoverChanged() {
        if (this.state.crossover.type !== this._lastCrossoverType) {
            this._lastCrossoverType = this.state.crossover.type;
            const def = getCrossoverDefinition(this.state.crossover.type);
            this.state.crossover.params = paramsToDefaults(def?.params);
            this._renderCrossoverForm();
        }
    }

    _onSelectionChanged() {
        if (this.state.selection.type !== this._lastSelectionType) {
            this._lastSelectionType = this.state.selection.type;
            const def = getSelectionDefinition(this.state.selection.type);
            this.state.selection.params = paramsToDefaults(def?.params);
            this._renderSelectionForm();
        }
    }

    _onPointDistChanged() {
        if (this.state.pointDistribution.type !== this._lastPointDistType) {
            this._lastPointDistType = this.state.pointDistribution.type;
            const def = getPointDistributionDefinition(this.state.pointDistribution.type);
            this.state.pointDistribution.params = paramsToDefaults(def?.params);
            this._renderPointDistForm();
            this._updatePoints(true);
            this._drawPreview();
        }
    }

    /* ---------- Dynamic form renderers ---------- */
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
            this._dom.pointDistParams,
            def,
            this.state.pointDistribution.params,
            'im-pointdist'
        );
    }

    _renderMutationForm() {
        const def = getMutationDefinition(
            this.state.mutation.type,
            this.state.representation.type
        );

        renderParamInputs(
            this._dom.mutationParams,
            def,
            this.state.mutation.params,
            'im-mut'
        );
    }

    _renderCrossoverForm() {
        const def = getCrossoverDefinition(this.state.crossover.type);
        renderParamInputs(
            this._dom.crossoverParams,
            def,
            this.state.crossover.params,
            'im-cross'
        );
    }

    _renderSelectionForm() {
        const def = getSelectionDefinition(this.state.selection.type);
        renderParamInputs(
            this._dom.selectionParams,
            def,
            this.state.selection.params,
            'im-sel'
        );
    }

    _renderEvolutionForm() {
        const container = this._dom.evolutionParams;
        if (!container) return;

        const cfg = evolutionFieldConfig;
        const state = this.state.evolution;

        container.innerHTML = `
      <h3>Evolution</h3>
      <div class="param-row">
        <label for="im-evo-populationSize">${cfg.populationSize.label}:</label>
        <input
          id="im-evo-populationSize"
          type="number"
          min="${cfg.populationSize.min}"
          ${cfg.populationSize.max !== undefined ? `max="${cfg.populationSize.max}"` : ''}
          step="${cfg.populationSize.step}"
          value="${state.populationSize}"
        >
      </div>
      <div class="param-row">
        <label for="im-evo-maxGenerations">${cfg.maxGenerations.label}:</label>
        <input
          id="im-evo-maxGenerations"
          type="number"
          min="${cfg.maxGenerations.min}"
          ${cfg.maxGenerations.max !== undefined ? `max="${cfg.maxGenerations.max}"` : ''}
          step="${cfg.maxGenerations.step}"
          value="${state.maxGenerations}"
        >
      </div>
      <div class="param-row">
        <label for="im-evo-elitismCount">${cfg.elitismCount.label}:</label>
        <input
          id="im-evo-elitismCount"
          type="number"
          min="${cfg.elitismCount.min}"
          ${cfg.elitismCount.max !== undefined ? `max="${cfg.elitismCount.max}"` : ''}
          step="${cfg.elitismCount.step}"
          value="${state.elitismCount}"
        >
      </div>`;
    }

    /* ---------- UI sync ---------- */
    _syncUIControls() {
        const pointDistSelect = this.container.querySelector('#im-pointDist-type');
        const repSelect = this.container.querySelector('#im-rep-type');
        const mutationSelect = this.container.querySelector('#im-mutation-type');
        const crossoverSelect = this.container.querySelector('#im-crossover-type');
        const selectionSelect = this.container.querySelector('#im-selection-type');

        if (pointDistSelect) pointDistSelect.value = this.state.pointDistribution.type;
        if (repSelect) repSelect.value = this.state.representation.type;
        if (mutationSelect) mutationSelect.value = this.state.mutation.type;
        if (crossoverSelect) crossoverSelect.value = this.state.crossover.type;
        if (selectionSelect) selectionSelect.value = this.state.selection.type;

        this._syncGenAndPopSliders();
    }

    _syncGenAndPopSliders() {
        const totalGens = this.state.evolution.maxGenerations;
        document.getElementById('totalGens').textContent = totalGens;

        const genDisplay = document.getElementById('genDisplay');
        if (genDisplay) genDisplay.textContent = `${this.state.currentGen} / ${totalGens}`;

        const genSlider = document.getElementById('genSlider');
        if (genSlider) {
            genSlider.max = totalGens;
            genSlider.value = Math.min(Number(genSlider.value), totalGens);
        }

        const popSize = this.state.evolution.populationSize;
        document.getElementById('populationCount').textContent = popSize;

        const popSlider = document.getElementById('populationSlider');
        if (popSlider) {
            popSlider.max = Math.max(0, popSize - 1);
            popSlider.value = Math.min(Number(popSlider.value), Math.max(0, popSize - 1));
        }
    }

    /* ---------- Points generation ---------- */
    _updatePoints(regenerate = true) {
        if (!regenerate) return;

        const { type, params } = this.state.pointDistribution;
        const safeCount = parseInt(params.count, 10) || 100;
        const safeParams = { ...params, count: safeCount };

        this.state.points = PointSetGenerator.generate(type, safeParams, Math);
        this._drawPreview();
    }

    _drawPreview() {
        const canvas = this._dom.previewCanvas;
        if (!canvas || !this.state.points) return;

        const ctx = canvas.getContext('2d');
        drawStandardScene(ctx, canvas, this.state.points);
    }
    /* ---------- Evolution worker logic ---------- */
    _runEvolution() {
        if (this.state.isRunning) return;

        if (this.state.worker) {
            this.state.worker.terminate();
            this.state.worker = null;
        }

        this._clear();
        this.state.isRunning = true;
        this.state.runPoints = this.state.points.slice();
        this.state.currentGen = 0;
        this.state.currentRank = 0;
        this.state.history = [];

        document.getElementById('progressSection').style.display = 'block';
        document.getElementById('emptyHelper').style.display = 'none';
        document.getElementById('runBtn').disabled = true;
        document.getElementById('clearBtn').disabled = false;



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

        const loggingOptions = {
            storePopulation: true,
            includeAvgFitness: true,
            diversity: 'per-generation',
            lineageTracking: true
        };

        const worker = new Worker('./js/workers/evolutionWorker.js', { type: 'module' });
        this.state.worker = worker;
        worker.onmessage = (e) => this._handleWorkerMessage(e);

        worker.postMessage({
            evolutionParams,
            points: this.state.points,
            loggingOptions,
            updateInterval: 10,
            numRuns: 1,
            seed: undefined
        });
    }

    _handleWorkerMessage(e) {
        const data = e.data;

        if (data.type === 'progress') {
            const gen = Number(data.generation) || 0;
            document.getElementById('currentGen').innerText = gen;

            const percent = Math.min(
                100,
                (gen / this.state.evolution.maxGenerations) * 100
            );

            document.getElementById('progressFill').style.width = `${percent}%`;
            return;
        }

        if (data.type === 'complete') {
            this.state.history = Array.isArray(data.history) ? data.history : [];
            this._showResults();
            this._finishWorkerRun();
            return;
        }

        if (data.type === 'error') {
            console.error('Evolution worker error:', data.message);
            this._finishWorkerRun();
        }
    }

    _finishWorkerRun() {
        if (this.state.worker) {
            this.state.worker.terminate();
            this.state.worker = null;
        }

        this.state.isRunning = false;
        document.getElementById('runBtn').disabled = false;
        document.getElementById('clearBtn').disabled = false;
        document.getElementById('progressSection').style.display = 'none';
    }

    /* ---------- Results rendering ---------- */
    _showResults() {
        const history = this.state.history;
        if (!history || history.length === 0) return;

        document.getElementById('mainCanvasContainer').style.display = 'block';
        document.getElementById('populationExplorerContainer').style.display = 'block';
        document.getElementById('generationSliderContainer').style.display = 'block';
        document.getElementById('graphsContainer').style.display = 'block';
        document.getElementById('emptyHelper').style.display = 'none';

        const genSlider = document.getElementById('genSlider');
        genSlider.max = history.length - 1;
        genSlider.value = 0;
        genSlider.disabled = false;
        genSlider.oninput = () => {
            this.state.currentGen = parseInt(genSlider.value, 10);
            this._updateGenDisplay();
            this._updateFromGeneration();
        };

        const popSlider = document.getElementById('populationSlider');
        popSlider.max = this.state.evolution.populationSize - 1;
        popSlider.value = 0;
        popSlider.disabled = false;
        popSlider.oninput = () => {
            this.state.currentRank = parseInt(popSlider.value, 10);
            document.getElementById('rankDisplay').innerText =
                this.state.currentRank === 0
                    ? 'Best'
                    : (
                        this.state.currentRank === this.state.evolution.populationSize - 1
                            ? 'Worst'
                            : `Rank ${this.state.currentRank + 1}`
                    );

            this._updateFromRank();
        };

        this.state.currentGen = 0;
        this.state.currentRank = 0;
        document.getElementById('rankDisplay').innerText = 'Best';

        this._updateFromGeneration();
        this._updateFromRank();

        drawCoverageGraph(
            'coverageGraph',
            history,
            this.state.pointDistribution.params.count ?? 100
        );
        drawAreaGraph('areaGraph', history);
        drawDiversityGraph('diversityGraph', history);

        document.querySelectorAll('.expand-graph-btn').forEach(btn => {
            btn.onclick = () => this._openExplorerGraphModal(btn.dataset.graph);
        });
    }

    _updateGenDisplay() {
        const gen = this.state.history[this.state.currentGen]?.generation ?? this.state.currentGen;
        document.getElementById('genDisplay').textContent =
            `${gen} / ${this.state.evolution.maxGenerations}`;
    }

    _updateFromGeneration() {
        const genData = this.state.history[this.state.currentGen];
        document.getElementById('diversityValue').textContent =
            Number(genData?.diversity ?? 0).toFixed(4);

        this._updateGenDisplay();
        this._drawMainCanvas();
    }

    _updateFromRank() {
        this._drawMainCanvas();
    }

    _drawMainCanvas() {
        const canvas = document.getElementById('mainCanvas');
        if (!canvas) return;

        const genData = this.state.history?.[this.state.currentGen];
        if (!genData?.sortedPopulation) return;

        const individual = genData.sortedPopulation[this.state.currentRank];
        if (!individual) return;

        const ctx = canvas.getContext('2d');
        drawStandardScene(
            ctx,
            canvas,
            this.state.runPoints || this.state.points,
            individual.shape
        );

        document.getElementById('individualRank').textContent = this.state.currentRank + 1;

        const browserStats = document.getElementById('browserStats');
        browserStats.innerHTML = `
      <div style="line-height:1.5;">
        Coverage: ${individual.fitness.coverage} / ${this.state.pointDistribution.params.count ?? 100}<br>
        Area: ${individual.fitness.area.toFixed(4)}<br>
        Rank: ${this.state.currentRank + 1} / ${this.state.evolution.populationSize}<br>
        Lineage: ${individual.lineage?.state ?? 'unknown'}
      </div>
      <div style="margin-top:12px;">
        <button id="showLineageBtn" class="button small">Show lineage</button>
      </div>`;

        const showBtn = document.getElementById('showLineageBtn');
        if (showBtn) {
            showBtn.onclick = () => this._openLineageModal(individual);
        }
    }

    /* ---------- Graph modal ---------- */
    _openExplorerGraphModal(graphKey) {
        const modal = document.getElementById('graphModal');
        const titleEl = document.getElementById('graphModalTitle');
        const titles = {
            coverage: 'Coverage Convergence',
            area: 'Area Convergence',
            diversity: 'Population Diversity'
        };

        if (titleEl) titleEl.textContent = titles[graphKey] || 'Expanded Graph';
        if (modal) modal.style.display = 'flex';

        setTimeout(() => this._drawExpandedGraph(graphKey), 0);
    }

    _closeGraphModal() {
        const modal = document.getElementById('graphModal');
        const plot = document.getElementById('graphModalPlot');

        if (plot) purgePlot(plot);
        if (modal) modal.style.display = 'none';
    }

    _drawExpandedGraph(graphKey) {
        const plotDiv = document.getElementById('graphModalPlot');
        if (!plotDiv || !this.state.history) return;

        drawExpandedGraph(
            plotDiv,
            graphKey,
            this.state.history,
            this.state.pointDistribution.params.count ?? 100
        );
    }

    /* ---------- Lineage modal ---------- */
    _resolveLineageRef(ref) {
        if (!ref) return null;

        const generation = Number(ref.generation);
        const rank = Number(ref.rank);

        if (!Number.isInteger(generation) || !Number.isInteger(rank)) return null;

        const genEntry = this.state.history?.[generation];
        const population = genEntry?.sortedPopulation;

        if (!Array.isArray(population)) return null;

        return population[rank] ?? null;
    }

    _buildArrow() {
        return `
<div class="lineage-arrow" aria-hidden="true">
  <div class="lineage-arrow-line"></div>
  <div class="lineage-arrow-head"></div>
</div>`;
    }

    _buildLineageModalContent(individual) {
        const lineage = individual?.lineage ?? {};
        const state = lineage?.state ?? 'unknown';
        const parentRefs = Array.isArray(lineage.parents) ? lineage.parents : [];
        const parent1 = this._resolveLineageRef(parentRefs[0] ?? null);
        const parent2 = this._resolveLineageRef(parentRefs[1] ?? null);
        const afterCrossoverStage = lineage?.stages?.afterCrossover ?? null;
        const afterMutationStage = lineage?.stages?.afterMutation ?? null;

        if (state === 'initial') {
            return `
<div class="lineage-flow">
  ${this._buildLineageNodeCard({
                title: 'Initial Individual',
                canvasId: 'lineage-final',
                nodeData: individual,
                reference: null,
                headerClass: 'repair',
                subtitle: 'Created during initialization'
            })}
</div>`;
        }

        if (state === 'elite') {
            return `
<div class="lineage-flow">
  ${this._buildLineageNodeCard({
                title: 'Elite Source',
                canvasId: 'lineage-parent-1',
                nodeData: parent1,
                reference: parentRefs[0] ?? null,
                headerClass: 'parents-1',
                subtitle: 'Copied by elitism'
            })}
  ${this._buildArrow()}
  <div class="lineage-stage-badge repair">Elite copy</div>
  ${this._buildLineageNodeCard({
                title: 'Elite Child',
                canvasId: 'lineage-final',
                nodeData: individual,
                reference: null,
                headerClass: 'repair',
                subtitle: 'Copied directly into the next generation'
            })}
</div>`;
        }

        return `
<div class="lineage-flow">
  <div class="lineage-stage-badge parents">Parents</div>
  <div class="lineage-parents">
    ${this._buildLineageNodeCard({
            title: 'Parent 1',
            canvasId: 'lineage-parent-1',
            nodeData: parent1,
            reference: parentRefs[0] ?? null,
            headerClass: 'parents-1',
            subtitle: 'Selected parent'
        })}
    ${this._buildLineageNodeCard({
            title: 'Parent 2',
            canvasId: 'lineage-parent-2',
            nodeData: parent2,
            reference: parentRefs[1] ?? null,
            headerClass: 'parents-2',
            subtitle: 'Selected parent'
        })}
  </div>
  ${this._buildArrow()}
  <div class="lineage-stage">
    <div class="lineage-stage-badge crossover">Crossover</div>
    ${this._buildLineageShapeCard({
            title: 'After Crossover',
            canvasId: 'lineage-crossover',
            stageData: afterCrossoverStage,
            headerClass: 'crossover',
            subtitle: afterCrossoverStage?.shape ? 'Polygon after recombination' : 'No crossover stage stored'
        })}
  </div>
  ${this._buildArrow()}
  <div class="lineage-stage">
    <div class="lineage-stage-badge mutation">Mutation</div>
    ${this._buildLineageShapeCard({
            title: 'After Mutation',
            canvasId: 'lineage-mutation',
            stageData: afterMutationStage,
            headerClass: 'mutation',
            subtitle: afterMutationStage?.shape ? 'Polygon after random changes' : 'No mutation stage stored'
        })}
  </div>
  ${this._buildArrow()}
  <div class="lineage-stage">
    <div class="lineage-stage-badge repair">Repair</div>
    ${this._buildLineageNodeCard({
            title: 'Final Child',
            canvasId: 'lineage-final',
            nodeData: individual,
            reference: null,
            headerClass: 'repair',
            subtitle: 'Final repaired individual stored in the population'
        })}
  </div>
</div>`;
    }

    _buildLineageNodeCard({
        title,
        canvasId,
        nodeData,
        reference,
        headerClass = 'repair',
        subtitle = ''
    }) {
        const shape = nodeData?.shape ?? null;
        const fitness = nodeData?.fitness ?? null;
        const hasData = !!shape;

        return `
<section class="lineage-card">
  <div class="lineage-card-header ${headerClass}">${title}</div>
  <div class="lineage-card-body">
    <canvas id="${canvasId}" class="lineage-canvas" width="340" height="300"></canvas>
    <div class="lineage-meta">
      ${reference ? `<div class="lineage-ref">Reference: generation ${reference.generation}, rank ${reference.rank + 1}</div>` : ''}
      ${subtitle ? `<div>${subtitle}</div>` : ''}
      ${hasData
                ? `<div><strong>Coverage:</strong> ${fitness?.coverage ?? '—'} / ${this.state.pointDistribution.params.count ?? 100}</div>
                 <div><strong>Area:</strong> ${Number.isFinite(fitness?.area) ? fitness.area.toFixed(4) : '—'}</div>`
                : `<div class="lineage-empty">No data available</div>`
            }
    </div>
  </div>
</section>`;
    }

    _buildLineageShapeCard({
        title,
        canvasId,
        stageData,
        headerClass = 'crossover',
        subtitle = ''
    }) {
        const shape = stageData?.shape ?? null;
        const fitness = stageData?.fitness ?? null;
        const hasShape = !!shape;

        return `
<section class="lineage-card">
  <div class="lineage-card-header ${headerClass}">${title}</div>
  <div class="lineage-card-body">
    <canvas id="${canvasId}" class="lineage-canvas" width="340" height="300"></canvas>
    <div class="lineage-meta">
      ${subtitle ? `<div>${subtitle}</div>` : ''}
      ${hasShape
                ? `<div><strong>Coverage:</strong> ${fitness?.coverage ?? '—'} / ${this.state.pointDistribution.params.count ?? 100}</div>
                 <div><strong>Area:</strong> ${Number.isFinite(fitness?.area) ? fitness.area.toFixed(4) : '—'}</div>`
                : `<div class="lineage-empty">No stage data available</div>`
            }
    </div>
  </div>
</section>`;
    }

    _renderLineageCanvases(individual) {
        const lineage = individual?.lineage ?? {};
        const parentRefs = Array.isArray(lineage.parents) ? lineage.parents : [];
        const parent1 = this._resolveLineageRef(parentRefs[0] ?? null);
        const parent2 = this._resolveLineageRef(parentRefs[1] ?? null);
        const stages = lineage?.stages ?? {};

        const nodes = [
            { id: 'lineage-parent-1', shape: parent1?.shape ?? null },
            { id: 'lineage-parent-2', shape: parent2?.shape ?? null },
            { id: 'lineage-crossover', shape: stages.afterCrossover?.shape ?? null },
            { id: 'lineage-mutation', shape: stages.afterMutation?.shape ?? null },
            { id: 'lineage-final', shape: individual?.shape ?? null }
        ];

        nodes.forEach(node => this._drawLineagePreview(node.id, node.shape));
    }

    _drawLineagePreview(canvasId, shape) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        drawFittedScene(
            ctx,
            canvas,
            this.state.runPoints || this.state.points,
            shape
        );
    }
    _openLineageModal(individual) {
        const modal = document.getElementById('lineageModal');
        const titleEl = document.getElementById('lineageModalTitle');
        const subtitleEl = document.getElementById('lineageModalSubtitle');
        const body = document.getElementById('lineageModalBody');

        if (!modal || !body) return;

        this._lastFocusedElement = document.activeElement;

        const lineage = individual?.lineage ?? null;
        const state = lineage?.state ?? 'unknown';

        if (titleEl) titleEl.textContent = 'Individual Lineage';
        if (subtitleEl) {
            subtitleEl.textContent =
                `Generation ${this.state.currentGen} • Rank ${this.state.currentRank + 1} • State: ${state}`;
        }

        body.innerHTML = this._buildLineageModalContent(individual);
        modal.classList.add('is-open');
        modal.setAttribute('aria-hidden', 'false');

        document.getElementById('closeLineageModal').focus();

        this._lineageKeyHandler = (e) => {
            if (e.key === 'Escape') this._closeLineageModal();
        };

        document.addEventListener('keydown', this._lineageKeyHandler);
        setTimeout(() => this._renderLineageCanvases(individual), 0);
    }

    _closeLineageModal() {
        const modal = document.getElementById('lineageModal');
        const body = document.getElementById('lineageModalBody');

        if (body) body.innerHTML = '';

        if (modal) {
            modal.classList.remove('is-open');
            modal.setAttribute('aria-hidden', 'true');
        }

        if (this._lineageKeyHandler) {
            document.removeEventListener('keydown', this._lineageKeyHandler);
            this._lineageKeyHandler = null;
        }

        if (this._lastFocusedElement?.focus) {
            this._lastFocusedElement.focus();
        }
    }

    /* ---------- Clear / destroy ---------- */
    _clear() {
        if (this.state.worker) {
            this.state.worker.terminate();
            this.state.worker = null;
        }

        this.state.isRunning = false;
        this.state.runPoints = null;
        this.state.history = null;
        this.state.currentGen = 0;
        this.state.currentRank = 0;

        document.getElementById('mainCanvasContainer').style.display = 'none';
        document.getElementById('populationExplorerContainer').style.display = 'none';
        document.getElementById('generationSliderContainer').style.display = 'none';
        document.getElementById('graphsContainer').style.display = 'none';
        document.getElementById('emptyHelper').style.display = 'block';
        document.getElementById('progressSection').style.display = 'none';
        document.getElementById('runBtn').disabled = false;
        document.getElementById('clearBtn').disabled = false;
        document.getElementById('currentGen').textContent = '0';
        document.getElementById('progressFill').style.width = '0%';

        const genSlider = document.getElementById('genSlider');
        if (genSlider) {
            genSlider.value = 0;
            genSlider.disabled = true;
        }

        const popSlider = document.getElementById('populationSlider');
        if (popSlider) {
            popSlider.value = 0;
            popSlider.disabled = true;
        }

        document.getElementById('rankDisplay').innerText = 'Best';
        document.getElementById('browserStats').innerHTML = '';
        document.getElementById('diversityValue').innerText = '0.000';
        document.getElementById('individualRank').innerText = '1';

        this._closeGraphModal();
        this._closeLineageModal();
        this._syncGenAndPopSliders();
    }

    destroy() {
        if (this.state.worker) this.state.worker.terminate();
        this.container.innerHTML = '';
    }
}