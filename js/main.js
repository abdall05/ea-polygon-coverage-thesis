// interactive.js
import { CartesianPolygonIndividual } from './model/individuals/CartesianPolygonIndividual.js';
import { PolarPolygonIndividual } from './model/individuals/PolarPolygonIndividual.js';
import { MutationFactory } from './model/mutations/MutationFactory.js';
import { CrossoverFactory } from './model/crossovers/CrossoverFactory.js';
import { FitnessEvaluator } from './model/FitnessEvaluator.js';
import { TournamentSelection } from './model/selections/TournamentSelection.js';
import { EvolutionEngine } from './model/EvolutionEngine.js';

// ===== RNG FACTORY =====
function createRNG(seed) {
    return {
        seed,
        random() {
            seed = (seed * 9301 + 49297) % 233280;
            return seed / 233280;
        }
    };
}

// ===== MODEL =====
const Model = {
    // Randomness - now only for experiments!
    experimentSeed: 42,

    // Point Set
    pointSet: 'uniform',
    pointCount: 100,

    // Representation
    representation: 'cartesian',

    // Mutation
    mutation: {
        type: 'GaussianMutation',
        params: {
            GaussianMutation: { mutationRate: 0.1, stepSize: 0.1 },
            CauchyMutation: { mutationRate: 0.1, stepSize: 0.05 }
        }
    },

    // Crossover
    crossover: {
        type: 'none',
        params: {
            none: {},
            UniformCrossover: { rate: 0.8, swapRate: 0.5 }
        }
    },

    // EA Parameters
    popSize: 100,
    genCount: 150,
    tournamentSize: 2,
    elitismCount: 2,
    nVertices: 7,

    // Experiment
    experiment: {
        type: 'general',
        numRuns: 30
    },

    // RNGs - ONLY for experiments!
    experimentRNGs: {
        points: null,
        mutation: null,
        crossover: null,
        selection: null,
        initialization: null
    },

    // Initialize experiment RNGs (only called when running experiments)
    initExperimentRNGs(runIndex = 0) {
        const baseSeed = this.experimentSeed + runIndex * 10000;

        this.experimentRNGs.points = createRNG(this.experimentSeed + 1000);
        this.experimentRNGs.mutation = createRNG(baseSeed + 2000);
        this.experimentRNGs.crossover = createRNG(baseSeed + 3000);
        this.experimentRNGs.selection = createRNG(baseSeed + 4000);
        this.experimentRNGs.initialization = createRNG(baseSeed + 5000);
    }
    ,

    // Update method
    update(path, value) {
        const parts = path.split('.');
        let current = this;
        for (let i = 0; i < parts.length - 1; i++) {
            current = current[parts[i]];
        }
        current[parts[parts.length - 1]] = value;

        console.log(`Updated ${path}:`, value);
    }
};

// ===== STATE =====
let points = null;  // Start with null, no points initially
let evolutionEngine = null;
let evolutionResult = null;
let experimentResults = [];
let isExperimentRunning = false;
let currentGen = 0;
let bestSolution = null;
let isInteractiveRunning = false;  // Track if evolution is running
let selectedRepresentative = "best";

// ===== UI CONTROLLER =====
const UI = {
    // Initialize all event listeners
    init() {
        this.bindPointSet();
        this.bindRepresentation();
        this.bindMutation();
        this.bindCrossover();
        this.bindEAParameters();
        this.bindExperiment();
        this.bindButtons();

        // DO NOT generate points initially - show empty canvas with message
        this.showInitialView();
    },

    // Disable/enable all settings controls
    setSettingsEnabled(enabled) {
        const controls = [
            '#pointSet', '#pointCount', '#generatePointsBtn',
            'input[name="rep"]', '#mutationType', '#mutationRate', '#stepSize',
            '#crossoverType', '#crossoverRate', '#geneSwapRate',
            '#popSize', '#genCount', '#tournamentSize', '#elitismCount', '#nVertices',
            '#experimentType', '#numRuns', '#experimentSeed'
        ];

        controls.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            elements.forEach(el => {
                if (enabled) {
                    el.removeAttribute('disabled');
                } else {
                    el.setAttribute('disabled', 'disabled');
                }
            });
        });

        // Special handling for radio buttons (they need to be disabled differently)
        const radioLabels = document.querySelectorAll('.radio-group label');
        radioLabels.forEach(label => {
            if (enabled) {
                label.style.opacity = '1';
                label.style.cursor = 'pointer';
            } else {
                label.style.opacity = '0.5';
                label.style.cursor = 'not-allowed';
            }
        });
    },
    showInitialView() {
        const container = document.getElementById('resultsContainer');
        container.innerHTML = this.createInitialView();

        setTimeout(() => {
            this.drawCurrentCanvas();
        }, 0);
    },

    createInitialView() {
        const hasPoints = points !== null && points.length > 0;

        return `
        <div class="initial-view">
            <div class="visualization-area">
                <div class="canvas-container">
                    <canvas id="mainCanvas" width="700" height="700"></canvas>
                </div>
            </div>

            <div class="stats-container">
                <div class="stats-grid">
                    <div class="stat-card">
                        <div class="stat-label">Points</div>
                        <div class="stat-value" id="pointCount">${hasPoints ? points.length : Model.pointCount}</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-label">Distribution</div>
                        <div class="stat-value" id="distribution">${Model.pointSet}</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-label">Vertices</div>
                        <div class="stat-value" id="vertices">${Model.nVertices}</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-label">Status</div>
                        <div class="stat-value" id="status" style="color: ${hasPoints ? '#27ae60' : '#7f8c8d'}">
                            ${hasPoints ? 'Points Ready' : 'Idle'}
                        </div>
                    </div>
                </div>

                <div class="action-row" style="margin-top: 20px; text-align: center;">
                    <p style="color: #7f8c8d;">
                        Configure settings, then choose Interactive or Experiment mode.
                    </p>
                </div>
            </div>
        </div>
    `;
    },
    bindPointSet() {
        const select = document.getElementById('pointSet');
        const countInput = document.getElementById('pointCount');
        const generateBtn = document.getElementById('generatePointsBtn');

        if (select) {
            select.value = Model.pointSet;
            select.addEventListener('change', (e) => {
                Model.update('pointSet', e.target.value);
                // Don't auto-generate, just update model
            });
        }

        if (countInput) {
            countInput.value = Model.pointCount;
            countInput.addEventListener('input', (e) => {
                const newCount = parseInt(e.target.value) || 100;
                Model.update('pointCount', newCount);
                // Don't auto-generate, just update model
            });
        }

        if (generateBtn) {
            generateBtn.addEventListener('click', () => {
                this.generatePoints();  // Now assigns to global points
                this.drawCurrentCanvas();

                // Update stats display
                const pointCountEl = document.getElementById('pointCount');
                if (pointCountEl && points) pointCountEl.textContent = points.length;

                const statusEl = document.getElementById('status');
                if (statusEl && points) {
                    statusEl.textContent = `${points.length} Points Generated`;
                    statusEl.style.color = '#27ae60';
                }

                const actionRow = document.querySelector('.action-row p');
                if (actionRow) {
                    actionRow.innerHTML = '✓ Points ready. Click RUN INTERACTIVE to start evolution';
                    actionRow.style.color = '#27ae60';
                }
            });
        }
    },

    bindRepresentation() {
        const radios = document.querySelectorAll('input[name="rep"]');
        radios.forEach(radio => {
            if (radio.value === Model.representation) {
                radio.checked = true;
            }
            radio.addEventListener('change', (e) => {
                if (e.target.checked) {
                    Model.update('representation', e.target.value);
                }
            });
        });
    },

    bindMutation() {
        const select = document.getElementById('mutationType');
        if (select) {
            select.value = Model.mutation.type;
            select.addEventListener('change', (e) => {
                Model.update('mutation.type', e.target.value);
                this.updateMutationParamsUI();
            });
        }

        this.updateMutationParamsUI();
    },

    updateMutationParamsUI() {
        const container = document.getElementById('mutationParams');
        if (!container) return;

        const type = Model.mutation.type;
        const params = Model.mutation.params[type];

        let html = '';
        if (type === 'GaussianMutation' || type === 'CauchyMutation') {
            html = `
            <div class="param-row">
                <label>Rate:</label>
                <input type="number" id="mutationRate" min="0" max="1" step="0.01" value="${params.mutationRate}">
            </div>
            <div class="param-row">
                <label>Step Size:</label>
                <input type="number" id="stepSize" min="0" max="1" step="0.01" value="${params.stepSize}">
            </div>
        `;
        }

        container.innerHTML = html;
        this.bindMutationParams();
    },

    bindMutationParams() {
        const type = Model.mutation.type;

        if (type === 'GaussianMutation' || type === 'CauchyMutation') {
            document.getElementById('mutationRate')?.addEventListener('input', (e) => {
                Model.mutation.params[type].mutationRate = parseFloat(e.target.value) || 0.1;
            });

            document.getElementById('stepSize')?.addEventListener('input', (e) => {
                Model.mutation.params[type].stepSize = parseFloat(e.target.value) || 0.1;
            });
        }
    },

    bindCrossover() {
        const select = document.getElementById('crossoverType');
        if (select) {
            select.value = Model.crossover.type;
            select.addEventListener('change', (e) => {
                Model.update('crossover.type', e.target.value);
                this.updateCrossoverParamsUI();
            });
        }

        this.updateCrossoverParamsUI();
    },

    updateCrossoverParamsUI() {
        const container = document.getElementById('crossoverParams');
        if (!container) return;

        const type = Model.crossover.type;
        const params = Model.crossover.params[type];

        let html = '';
        if (type === 'UniformCrossover') {
            html = `
                <div class="param-row">
                    <label>Rate:</label>
                    <input type="number" id="crossoverRate" min="0" max="1" step="0.01" value="${params.rate}">
                </div>
                <div class="param-row">
                    <label>Swap Rate:</label>
                    <input type="number" id="geneSwapRate" min="0" max="1" step="0.01" value="${params.swapRate}">
                </div>
            `;
        } else {
            html = '';
        }

        container.innerHTML = html;
        this.bindCrossoverParams();
    },

    bindCrossoverParams() {
        const type = Model.crossover.type;

        if (type === 'UniformCrossover') {
            document.getElementById('crossoverRate')?.addEventListener('input', (e) => {
                Model.crossover.params.UniformCrossover.rate = parseFloat(e.target.value) || 0.8;
            });
            document.getElementById('geneSwapRate')?.addEventListener('input', (e) => {
                Model.crossover.params.UniformCrossover.swapRate = parseFloat(e.target.value) || 0.5;
            });
        }
    },

    bindEAParameters() {
        const popSize = document.getElementById('popSize');
        const genCount = document.getElementById('genCount');
        const tournamentSize = document.getElementById('tournamentSize');
        const elitismCount = document.getElementById('elitismCount');
        const nVertices = document.getElementById('nVertices');

        if (popSize) popSize.value = Model.popSize;
        if (genCount) genCount.value = Model.genCount;
        if (tournamentSize) tournamentSize.value = Model.tournamentSize;
        if (elitismCount) elitismCount.value = Model.elitismCount;
        if (nVertices) nVertices.value = Model.nVertices;

        popSize?.addEventListener('input', (e) => {
            Model.update('popSize', parseInt(e.target.value) || 100);
        });

        genCount?.addEventListener('input', (e) => {
            Model.update('genCount', parseInt(e.target.value) || 150);
        });

        tournamentSize?.addEventListener('input', (e) => {
            Model.update('tournamentSize', parseInt(e.target.value) || 2);
        });

        elitismCount?.addEventListener('input', (e) => {
            Model.update('elitismCount', parseInt(e.target.value) || 2);
        });

        nVertices?.addEventListener('input', (e) => {
            Model.update('nVertices', parseInt(e.target.value) || 7);
            const verticesEl = document.getElementById('vertices');
            if (verticesEl) verticesEl.textContent = Model.nVertices;
        });
    },

    bindExperiment() {
        const typeSelect = document.getElementById('experimentType');
        const numRuns = document.getElementById('numRuns');
        const seedInput = document.getElementById('experimentSeed');

        if (typeSelect) typeSelect.value = Model.experiment.type;
        if (numRuns) numRuns.value = Model.experiment.numRuns;
        if (seedInput) seedInput.value = Model.experimentSeed;

        typeSelect?.addEventListener('change', (e) => {
            Model.update('experiment.type', e.target.value);
            this.updateComparisonOptions();
        });

        numRuns?.addEventListener('input', (e) => {
            Model.update('experiment.numRuns', parseInt(e.target.value) || 30);
        });

        seedInput?.addEventListener('input', (e) => {
            Model.update('experimentSeed', parseInt(e.target.value) || 42);
        });
    },

    updateComparisonOptions() {
        const container = document.getElementById('comparisonOptions');
        if (!container) return;

        const type = Model.experiment.type;

        let html = '';
        if (type === 'repComparison') {
            html = `
                <div class="param-row">
                    <label>Compare:</label>
                    <select id="repCompareSelect" class="full-width">
                        <option value="both">Cartesian vs Polar</option>
                    </select>
                </div>
            `;
        } else if (type === 'mutationComparison') {
            html = `
        <div class="param-row">
            <label>Compare:</label>
            <select id="mutationCompareSelect" class="full-width">
                <option value="all">Gaussian vs Cauchy</option>
            </select>
        </div>
    `;
        } else if (type === 'crossoverComparison') {
            html = `
                <div class="param-row">
                    <label>Compare:</label>
                    <select id="crossoverCompareSelect" class="full-width">
                        <option value="all">None vs Uniform</option>
                    </select>
                </div>
            `;
        } else {
            html = '<div class="param-row"><small>No comparison options</small></div>';
        }

        container.innerHTML = html;
    },

    bindButtons() {
        const runBtn = document.getElementById('runInteractiveBtn');
        const experimentBtn = document.getElementById('runExperimentBtn');
        const clearBtn = document.getElementById('clearBtn');
        const clearExperimentBtn = document.getElementById('clearExperimentBtn');

        runBtn?.addEventListener('click', () => this.startInteractive());
        experimentBtn?.addEventListener('click', () => this.startExperiment());
        clearBtn?.addEventListener('click', () => this.clearEvolution());
        clearExperimentBtn?.addEventListener('click', () => this.clearEvolution());
    },

    // ===== CORE FUNCTIONS =====
    generatePoints(rng = null) {
        const R = rng || Math;
        const newPoints = [];  // Use different name to avoid confusion

        // Reset cluster centers for each fresh generation
        this._clusterCenters = null;

        for (let i = 0; i < Model.pointCount; i++) {
            let x, y;

            switch (Model.pointSet) {
                case 'uniform':
                    x = R.random();
                    y = R.random();
                    break;

                case 'clustered':
                    // Random number of clusters between 2 and 8
                    if (!this._clusterCenters) {
                        const numClusters = Math.floor(R.random() * 7) + 2; // 2 to 8 clusters
                        this._clusterCenters = [];
                        for (let c = 0; c < numClusters; c++) {
                            this._clusterCenters.push({
                                x: 0.1 + R.random() * 0.8,
                                y: 0.1 + R.random() * 0.8,
                                spread: 0.05 + R.random() * 0.12
                            });
                        }
                        console.log(`Generated ${numClusters} random clusters`);
                    }

                    const clusterIdx = Math.floor(R.random() * this._clusterCenters.length);
                    const center = this._clusterCenters[clusterIdx];
                    const spread = center.spread;

                    x = center.x + (R.random() - 0.5) * spread * 2;
                    y = center.y + (R.random() - 0.5) * spread * 2;
                    break;

                case 'mixed':
                    if (R.random() < 0.5) {
                        x = R.random();
                        y = R.random();
                    } else {
                        if (!this._clusterCenters) {
                            const numClusters = Math.floor(R.random() * 5) + 2;
                            this._clusterCenters = [];
                            for (let c = 0; c < numClusters; c++) {
                                this._clusterCenters.push({
                                    x: 0.15 + R.random() * 0.7,
                                    y: 0.15 + R.random() * 0.7,
                                    spread: 0.05 + R.random() * 0.1
                                });
                            }
                            console.log(`Generated ${numClusters} random clusters for mixed mode`);
                        }

                        const clusterIdx = Math.floor(R.random() * this._clusterCenters.length);
                        const center = this._clusterCenters[clusterIdx];
                        x = center.x + (R.random() - 0.5) * center.spread * 2;
                        y = center.y + (R.random() - 0.5) * center.spread * 2;
                    }
                    break;
            }

            x = Math.min(0.999, Math.max(0.001, x));
            y = Math.min(0.999, Math.max(0.001, y));

            newPoints.push({ x, y });
        }

        // ← CRITICAL: Assign to the GLOBAL points variable
        points = newPoints;

        console.log(`Generated ${points.length} points (${Model.pointSet} distribution)`);
        return points;
    },
    drawCurrentCanvas() {
        const canvas = document.getElementById('mainCanvas');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;

        ctx.fillStyle = '#f8f8f8';
        ctx.fillRect(0, 0, width, height);

        const margin = 50;
        const squareSize = Math.min(width, height) - 2 * margin;
        const squareX = (width - squareSize) / 2;
        const squareY = (height - squareSize) / 2;

        ctx.strokeStyle = '#333';
        ctx.lineWidth = 2;
        ctx.strokeRect(squareX, squareY, squareSize, squareSize);

        ctx.fillStyle = '#666';
        ctx.font = '12px Arial';
        ctx.fillText('(0,0)', squareX - 5, squareY - 5);
        ctx.fillText('(1,0)', squareX + squareSize - 25, squareY - 5);
        ctx.fillText('(0,1)', squareX - 5, squareY + squareSize + 15);
        ctx.fillText('(1,1)', squareX + squareSize - 25, squareY + squareSize + 15);

        // Draw points if they exist
        if (points && points.length > 0) {
            ctx.fillStyle = '#2196F3';
            points.forEach(point => {
                const x = squareX + (point.x * squareSize);
                const y = squareY + (point.y * squareSize);

                ctx.beginPath();
                ctx.arc(x, y, 3, 0, 2 * Math.PI);
                ctx.fill();

                ctx.strokeStyle = 'white';
                ctx.lineWidth = 1;
                ctx.stroke();
            });

            // Draw polygon only if we have points and best solution
            if (bestSolution) {
                this.drawPolygon(ctx, bestSolution, squareX, squareY, squareSize);
            }
        } else {
            // Show message that no points exist
            ctx.fillStyle = '#999';
            ctx.font = '14px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('No points generated. Click GENERATE POINTS to start.', width / 2, height / 2);
            ctx.textAlign = 'left';
        }
    },
    prepareResponsiveCanvas(canvasId, height = 220) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return null;

        const dpr = window.devicePixelRatio || 1;
        const displayWidth = Math.max(700, Math.floor(canvas.parentElement.clientWidth || 700));

        canvas.style.width = '100%';
        canvas.style.height = `${height}px`;
        canvas.width = Math.floor(displayWidth * dpr);
        canvas.height = Math.floor(height * dpr);

        const ctx = canvas.getContext('2d');
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.scale(dpr, dpr);

        return {
            canvas,
            ctx,
            width: displayWidth,
            height
        };
    },

    drawPolygon(ctx, polygon, offsetX, offsetY, scale) {
        if (!polygon || polygon.length < 3) return;

        ctx.beginPath();
        ctx.moveTo(offsetX + polygon[0].x * scale, offsetY + polygon[0].y * scale);

        for (let i = 1; i < polygon.length; i++) {
            ctx.lineTo(offsetX + polygon[i].x * scale, offsetY + polygon[i].y * scale);
        }

        ctx.closePath();
        ctx.strokeStyle = '#e74c3c';
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.fillStyle = 'rgba(231, 76, 60, 0.1)';
        ctx.fill();
    },

    // ===== INTERACTIVE MODE =====
    startInteractive() {
        // Check if points have been generated
        if (!points || points.length === 0) {
            alert('Please generate points first by clicking GENERATE POINTS!');
            return;
        }

        // Disable all settings
        this.setSettingsEnabled(false);
        isInteractiveRunning = true;

        // Disable RUN button, enable CLEAR button
        document.getElementById('runInteractiveBtn').disabled = true;
        document.getElementById('clearBtn').disabled = false;

        const container = document.getElementById('resultsContainer');
        container.innerHTML = this.createInteractiveView();

        setTimeout(() => {
            this.drawCurrentCanvas();
            this.initGenerationControls();
            this.bindRepresentativeControls();
        }, 0);
    },
    resetExperimentButton() {
        const experimentBtn = document.getElementById('runExperimentBtn');
        if (experimentBtn) {
            experimentBtn.disabled = false;
            experimentBtn.textContent = 'RUN EXPERIMENT';
        }
    },

    clearEvolution() {
        isExperimentRunning = false;
        isInteractiveRunning = false;
        selectedRepresentative = "best";


        evolutionEngine = null;
        evolutionResult = null;
        currentGen = 0;
        bestSolution = null;
        experimentResults = [];
        points = null;

        this.setSettingsEnabled(true);
        this.resetExperimentButton();

        const runInteractiveBtn = document.getElementById('runInteractiveBtn');
        const clearBtn = document.getElementById('clearBtn');

        if (runInteractiveBtn) runInteractiveBtn.disabled = false;
        if (clearBtn) clearBtn.disabled = true;

        const container = document.getElementById('resultsContainer');
        container.innerHTML = this.createInitialView();

        setTimeout(() => {
            this.drawCurrentCanvas();
        }, 0);
    },

    createInteractiveView() {
        return `
    <div class="interactive-view">
      <div class="visualization-area">
        <div class="canvas-container">
          <canvas id="mainCanvas" width="700" height="700"></canvas>
        </div>

        <div class="mini-gallery" style="margin-top: 16px;">
          <h4 style="margin: 0 0 10px 0; color: #2c3e50; font-size: 16px;">
            Population Representatives
          </h4>

          <div class="mini-canvas-row" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px;">
            <div class="mini-card" data-rep="best" style="border: 2px solid #3498db; border-radius: 8px; padding: 8px; background: white; cursor: pointer;">
              <div style="font-size: 13px; font-weight: bold; color: #2c3e50; margin-bottom: 6px;">Best</div>
              <canvas id="miniCanvasBest" width="200" height="200" style="width: 100%; height: 180px; background: #f8f8f8; border-radius: 4px;"></canvas>
              <div id="miniBestStats" style="margin-top: 6px; font-size: 12px; color: #555;"></div>
            </div>

            <div class="mini-card" data-rep="median" style="border: 2px solid #ddd; border-radius: 8px; padding: 8px; background: white; cursor: pointer;">
              <div style="font-size: 13px; font-weight: bold; color: #2c3e50; margin-bottom: 6px;">Median</div>
              <canvas id="miniCanvasMedian" width="200" height="200" style="width: 100%; height: 180px; background: #f8f8f8; border-radius: 4px;"></canvas>
              <div id="miniMedianStats" style="margin-top: 6px; font-size: 12px; color: #555;"></div>
            </div>

            <div class="mini-card" data-rep="worst" style="border: 2px solid #ddd; border-radius: 8px; padding: 8px; background: white; cursor: pointer;">
              <div style="font-size: 13px; font-weight: bold; color: #2c3e50; margin-bottom: 6px;">Worst</div>
              <canvas id="miniCanvasWorst" width="200" height="200" style="width: 100%; height: 180px; background: #f8f8f8; border-radius: 4px;"></canvas>
              <div id="miniWorstStats" style="margin-top: 6px; font-size: 12px; color: #555;"></div>
            </div>
          </div>
        </div>
      </div>

      <div class="gen-controls">
        <div class="gen-row">
          <span class="gen-label">Generation</span>
          <span id="genDisplay" style="font-weight: bold; min-width: 60px;">0 / ${Model.genCount}</span>
        </div>

        <div class="gen-row">
          <input type="range" id="genSlider" min="0" max="${Model.genCount}" value="0" step="1" style="flex: 1; height: 8px;" disabled>
        </div>
      </div>

      <div class="stats-container">
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-label">Best Coverage</div>
            <div class="stat-value" id="bestCoverage">0/${Model.pointCount}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Avg Coverage</div>
            <div class="stat-value" id="avgCoverage">0.0</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Best Area</div>
            <div class="stat-value" id="bestArea">0.00</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Diversity</div>
            <div class="stat-value" id="diversity">0.00</div>
          </div>
        </div>

        <div class="graph-container">
          <h4 style="margin: 0 0 12px 0; color: #2c3e50; font-size: 16px;">Convergence Graphs</h4>
          <div class="graph-row">
            <div class="graph-item">
              <div class="graph-label">Coverage over Generations</div>
              <canvas id="coverageGraph" width="550" height="180"></canvas>
            </div>
            <div class="graph-item">
              <div class="graph-label">Best Area over Generations</div>
              <canvas id="areaGraph" width="550" height="180"></canvas>
            </div>
            <div class="graph-item">
              <div class="graph-label">Population Diversity</div>
              <canvas id="diversityGraph" width="550" height="180"></canvas>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
    },
    bindRepresentativeControls() {
        const cards = document.querySelectorAll(".mini-card");
        cards.forEach(card => {
            card.addEventListener("click", () => {
                selectedRepresentative = card.dataset.rep || "best";
                this.updateGenerationDisplay();
            });
        });
    },
    updateRepresentativeSelectionUI() {
        const cards = document.querySelectorAll(".mini-card");
        cards.forEach(card => {
            const isActive = card.dataset.rep === selectedRepresentative;
            card.style.border = isActive ? "2px solid #3498db" : "2px solid #ddd";
            card.style.boxShadow = isActive ? "0 0 0 2px rgba(52, 152, 219, 0.15)" : "none";
        });
    },
    drawMiniRepresentativeCanvases(genData) {
        if (!genData?.representatives) return;

        const reps = [
            { key: "best", canvasId: "miniCanvasBest", statsId: "miniBestStats" },
            { key: "median", canvasId: "miniCanvasMedian", statsId: "miniMedianStats" },
            { key: "worst", canvasId: "miniCanvasWorst", statsId: "miniWorstStats" }
        ];

        reps.forEach(({ key, canvasId, statsId }) => {
            const rep = genData.representatives[key];
            const canvas = document.getElementById(canvasId);
            const statsEl = document.getElementById(statsId);

            if (!canvas || !rep) return;

            const ctx = canvas.getContext("2d");
            const width = canvas.width;
            const height = canvas.height;

            ctx.fillStyle = "#f8f8f8";
            ctx.fillRect(0, 0, width, height);

            const margin = 18;
            const squareSize = Math.min(width, height) - 2 * margin;
            const squareX = (width - squareSize) / 2;
            const squareY = (height - squareSize) / 2;

            ctx.strokeStyle = "#333";
            ctx.lineWidth = 1.5;
            ctx.strokeRect(squareX, squareY, squareSize, squareSize);

            if (points && points.length > 0) {
                ctx.fillStyle = "#2196F3";
                points.forEach(point => {
                    const x = squareX + point.x * squareSize;
                    const y = squareY + point.y * squareSize;
                    ctx.beginPath();
                    ctx.arc(x, y, 2, 0, 2 * Math.PI);
                    ctx.fill();
                });
            }

            this.drawPolygon(ctx, rep.shape, squareX, squareY, squareSize);

            if (statsEl) {
                statsEl.innerHTML = `
        Rank ${rep.rank}<br>
        Cov: ${rep.fitness.coverage}/${Model.pointCount}<br>
        Area: ${rep.fitness.area.toFixed(3)}
      `;
            }
        });

        this.updateRepresentativeSelectionUI();
    },
    initGenerationControls() {
        const slider = document.getElementById('genSlider');
        const genDisplay = document.getElementById('genDisplay');

        slider?.addEventListener('input', (e) => {
            currentGen = parseInt(e.target.value);
            genDisplay.textContent = `${currentGen} / ${Model.genCount}`;
            this.updateGenerationDisplay();
        });

        // Run evolution immediately
        this.runEvolution();
    },

    setupEvolutionEngine(useExperimentRNGs = false) {
        const rngs = useExperimentRNGs ? Model.experimentRNGs : {
            mutation: null,
            crossover: null,
            selection: null,
            initialization: null
        };

        const mutationParams = {
            ...Model.mutation.params[Model.mutation.type]
        };

        const mutationOp = MutationFactory.create(
            Model.mutation.type,
            mutationParams,
            rngs.mutation
        );

        let crossoverOp = null;
        if (Model.crossover.type !== 'none') {
            const crossoverParams = {
                ...Model.crossover.params[Model.crossover.type]
            };

            crossoverOp = CrossoverFactory.create(
                Model.crossover.type,
                crossoverParams,
                rngs.crossover
            );
        }

        const fitnessEvaluator = new FitnessEvaluator(points);

        const selectionOp = new TournamentSelection(
            { tournamentSize: Model.tournamentSize },
            rngs.selection
        );

        evolutionEngine = new EvolutionEngine(
            {
                populationSize: Model.popSize,
                maxGenerations: Model.genCount,
                elitismCount: Model.elitismCount,
                repair: true
            },
            {
                mutationOp,
                crossoverOp,
                fitnessEvaluator,
                selectionOp
            },
            {
                initialization: rngs.initialization
            }
        );
    }
    ,

    runEvolution() {
        if (!evolutionEngine) {
            this.setupEvolutionEngine();
        }

        // Show loading state
        document.getElementById('bestCoverage').textContent = 'Running...';

        // Run evolution
        setTimeout(() => {
            const IndividualClass = Model.representation === 'cartesian'
                ? CartesianPolygonIndividual
                : PolarPolygonIndividual;

            evolutionResult = evolutionEngine.run(IndividualClass, Model.nVertices);

            // Update UI with results
            currentGen = 0;

            // Enable slider
            const slider = document.getElementById('genSlider');
            if (slider) {
                slider.disabled = false;
                slider.value = 0;
            }

            const genDisplay = document.getElementById('genDisplay');
            if (genDisplay) {
                genDisplay.textContent = `0 / ${Model.genCount}`;
            }
            selectedRepresentative = "best";

            this.updateGenerationDisplay();

        }, 100);
    },

    updateGenerationDisplay() {
        if (!evolutionResult || !evolutionResult.history) return;

        const genData = evolutionResult.history[currentGen];
        if (!genData) return;

        document.getElementById("bestCoverage").textContent =
            `${genData.bestFitness.coverage}/${Model.pointCount}`;
        document.getElementById("avgCoverage").textContent =
            genData.avgFitness.coverage.toFixed(2);
        document.getElementById("bestArea").textContent =
            genData.bestFitness.area.toFixed(3);
        document.getElementById("diversity").textContent =
            genData.diversity.toFixed(3);

        const selectedRep = genData.representatives?.[selectedRepresentative];
        bestSolution = selectedRep?.shape || genData.bestShape;

        this.drawCurrentCanvas();
        this.drawMiniRepresentativeCanvases(genData);

        this.drawCoverageGraph();
        this.drawAreaGraph();
        this.drawDiversityGraph();
    },

    drawCoverageGraph() {
        const canvas = document.getElementById('coverageGraph');
        if (!canvas || !evolutionResult || !evolutionResult.history) return;

        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;

        ctx.clearRect(0, 0, width, height);

        const history = evolutionResult.history;
        if (history.length < 2) return;

        const maxCoverage = Model.pointCount;

        // Draw grid
        ctx.beginPath();
        ctx.strokeStyle = '#e0e0e0';
        ctx.lineWidth = 0.5;

        // Horizontal grid lines (every 25%)
        for (let i = 0; i <= 4; i++) {
            const y = height - (i / 4) * height;
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();

            // Labels
            ctx.fillStyle = '#999';
            ctx.font = '10px Arial';
            ctx.fillText(`${Math.round((i / 4) * maxCoverage)}`, 5, y - 2);
        }

        // Vertical grid lines (every 25% of generations)
        const maxGen = Model.genCount;
        for (let i = 0; i <= 4; i++) {
            const x = (i / 4) * width;
            ctx.moveTo(x, 0);
            ctx.lineTo(x, height);
            ctx.stroke();

            ctx.fillStyle = '#999';
            ctx.fillText(`${Math.round((i / 4) * maxGen)}`, x - 15, height - 5);
        }

        // Draw best coverage line
        ctx.beginPath();
        ctx.strokeStyle = '#3498db';
        ctx.lineWidth = 2;

        for (let i = 0; i < history.length; i++) {
            const x = (i / maxGen) * width;
            const y = height - (history[i].bestFitness.coverage / maxCoverage) * height;

            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        }
        ctx.stroke();

        // Draw average coverage line
        ctx.beginPath();
        ctx.strokeStyle = '#95a5a6';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([5, 5]);

        for (let i = 0; i < history.length; i++) {
            const x = (i / maxGen) * width;
            const y = height - (history[i].avgFitness.coverage / maxCoverage) * height;

            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        }
        ctx.stroke();
        ctx.setLineDash([]);

        // Legend
        ctx.fillStyle = '#3498db';
        ctx.fillRect(width - 100, 10, 12, 12);
        ctx.fillStyle = '#333';
        ctx.font = '10px Arial';
        ctx.fillText('Best', width - 85, 20);

        ctx.fillStyle = '#95a5a6';
        ctx.fillRect(width - 100, 30, 12, 12);
        ctx.fillStyle = '#333';
        ctx.fillText('Average', width - 85, 40);

        // Mark current generation
        if (currentGen < history.length) {
            const x = (currentGen / maxGen) * width;
            const yBest = height - (history[currentGen].bestFitness.coverage / maxCoverage) * height;
            const yAvg = height - (history[currentGen].avgFitness.coverage / maxCoverage) * height;

            ctx.beginPath();
            ctx.arc(x, yBest, 5, 0, 2 * Math.PI);
            ctx.fillStyle = '#e74c3c';
            ctx.fill();
            ctx.strokeStyle = 'white';
            ctx.lineWidth = 2;
            ctx.stroke();

            ctx.beginPath();
            ctx.arc(x, yAvg, 4, 0, 2 * Math.PI);
            ctx.fillStyle = '#e67e22';
            ctx.fill();
            ctx.stroke();
        }
    },

    drawAreaGraph() {
        const canvas = document.getElementById('areaGraph');
        if (!canvas || !evolutionResult || !evolutionResult.history) return;

        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;

        ctx.clearRect(0, 0, width, height);

        const history = evolutionResult.history;
        if (history.length < 2) return;

        // Find max area for scaling
        let maxArea = 0;
        for (const gen of history) {
            maxArea = Math.max(maxArea, gen.bestFitness.area);
        }
        maxArea = maxArea || 1;

        // Draw grid
        ctx.beginPath();
        ctx.strokeStyle = '#e0e0e0';
        ctx.lineWidth = 0.5;

        // Horizontal grid lines (every 25%)
        for (let i = 0; i <= 4; i++) {
            const y = height - (i / 4) * height;
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();

            // Labels - FIXED: show actual area values from bottom to top
            const areaValue = (maxArea * (i / 4)).toFixed(2);
            ctx.fillStyle = '#999';
            ctx.font = '10px Arial';
            ctx.fillText(areaValue, 5, y - 2);
        }

        // Vertical grid lines (every 25% of generations)
        const maxGen = Model.genCount;
        for (let i = 0; i <= 4; i++) {
            const x = (i / 4) * width;
            ctx.moveTo(x, 0);
            ctx.lineTo(x, height);
            ctx.stroke();

            ctx.fillStyle = '#999';
            ctx.fillText(`${Math.round((i / 4) * maxGen)}`, x - 15, height - 5);
        }

        // Draw best area line
        ctx.beginPath();
        ctx.strokeStyle = '#e74c3c';
        ctx.lineWidth = 2;

        for (let i = 0; i < history.length; i++) {
            const x = (i / maxGen) * width;
            // FIXED: Y coordinate calculation - lower area = lower on graph
            const y = height - (history[i].bestFitness.area / maxArea) * height;

            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        }
        ctx.stroke();

        // Mark current generation
        if (currentGen < history.length) {
            const x = (currentGen / maxGen) * width;
            const y = height - (history[currentGen].bestFitness.area / maxArea) * height;

            ctx.beginPath();
            ctx.arc(x, y, 5, 0, 2 * Math.PI);
            ctx.fillStyle = '#e74c3c';
            ctx.fill();
            ctx.strokeStyle = 'white';
            ctx.lineWidth = 2;
            ctx.stroke();
        }

        // Label and legend
        ctx.fillStyle = '#e74c3c';
        ctx.fillRect(width - 70, 10, 12, 12);
        ctx.fillStyle = '#333';
        ctx.font = '10px Arial';
        ctx.fillText('Best Area', width - 55, 20);

        // Add y-axis label
        ctx.save();
        ctx.translate(15, height / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.fillStyle = '#666';
        ctx.font = '10px Arial';
        ctx.fillText('Area', -5, 0);
        ctx.restore();
    },
    drawDiversityGraph() {
        const canvas = document.getElementById('diversityGraph');
        if (!canvas || !evolutionResult || !evolutionResult.history) return;

        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;

        ctx.clearRect(0, 0, width, height);

        const history = evolutionResult.history;
        if (history.length < 2) return;

        // Find max diversity for scaling
        let maxDiversity = 0;
        for (const gen of history) {
            maxDiversity = Math.max(maxDiversity, gen.diversity);
        }
        maxDiversity = maxDiversity || 1;

        // Draw grid
        ctx.beginPath();
        ctx.strokeStyle = '#e0e0e0';
        ctx.lineWidth = 0.5;

        // Horizontal grid lines (every 25%)
        for (let i = 0; i <= 4; i++) {
            const y = height - (i / 4) * height;
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();

            // Labels
            const diversityValue = (maxDiversity * (i / 4)).toFixed(2);
            ctx.fillStyle = '#999';
            ctx.font = '10px Arial';
            ctx.fillText(diversityValue, 5, y - 2);
        }

        // Vertical grid lines (every 25% of generations)
        const maxGen = Model.genCount;
        for (let i = 0; i <= 4; i++) {
            const x = (i / 4) * width;
            ctx.moveTo(x, 0);
            ctx.lineTo(x, height);
            ctx.stroke();

            ctx.fillStyle = '#999';
            ctx.fillText(`${Math.round((i / 4) * maxGen)}`, x - 15, height - 5);
        }

        // Draw diversity line
        ctx.beginPath();
        ctx.strokeStyle = '#9b59b6';
        ctx.lineWidth = 2;

        for (let i = 0; i < history.length; i++) {
            const x = (i / maxGen) * width;
            const y = height - (history[i].diversity / maxDiversity) * height;

            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        }
        ctx.stroke();

        // Fill area under the curve for better visualization
        ctx.beginPath();
        ctx.moveTo(0, height);
        for (let i = 0; i < history.length; i++) {
            const x = (i / maxGen) * width;
            const y = height - (history[i].diversity / maxDiversity) * height;
            ctx.lineTo(x, y);
        }
        ctx.lineTo(width, height);
        ctx.closePath();
        ctx.fillStyle = 'rgba(155, 89, 182, 0.1)';
        ctx.fill();

        // Mark current generation
        if (currentGen < history.length) {
            const x = (currentGen / maxGen) * width;
            const y = height - (history[currentGen].diversity / maxDiversity) * height;

            ctx.beginPath();
            ctx.arc(x, y, 5, 0, 2 * Math.PI);
            ctx.fillStyle = '#e74c3c';
            ctx.fill();
            ctx.strokeStyle = 'white';
            ctx.lineWidth = 2;
            ctx.stroke();
        }

        // Legend and labels
        ctx.fillStyle = '#9b59b6';
        ctx.fillRect(width - 80, 10, 12, 12);
        ctx.fillStyle = '#333';
        ctx.font = '10px Arial';
        ctx.fillText('Diversity', width - 65, 20);

        // Add y-axis label
        ctx.save();
        ctx.translate(15, height / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.fillStyle = '#666';
        ctx.font = '10px Arial';
        ctx.fillText('Diversity', -5, 0);
        ctx.restore();
    },
    drawExperimentPlots() {
        if (!experimentResults || experimentResults.length === 0) return;

        this.drawExperimentCoverageGraph();
        this.drawExperimentAreaGraph();
        this.drawExperimentDiversityGraph();
        this.drawExperimentFinalCoverageGraph();
        this.drawExperimentFinalAreaGraph();
        this.drawExperimentFinalDiversityGraph();
    }
    ,
    drawExperimentDiversityGraph() {
        const series = this.computeExperimentSeries("diversity");
        this.drawLineWithBand("expDiversityGraph", series, {
            lineColor: "#9b59b6",
            bandColor: "rgba(155, 89, 182, 0.15)",
            yFormatter: v => v.toFixed(3),
            label: "Mean diversity"
        });
    },

    drawExperimentFinalDiversityGraph() {
        const values = experimentResults.map(r => r.final.diversity);
        this.drawHistogram("expFinalDiversityGraph", values, {
            bins: 6,
            color: "#8e44ad"
        });
    },


    drawDiscreteCountChart(canvasId, values, options = {}) {
        if (!values.length) return;

        const prepared = this.prepareResponsiveCanvas(canvasId, options.height || 240);
        if (!prepared) return;

        const { ctx, width: W, height: H } = prepared;
        ctx.clearRect(0, 0, W, H);

        const color = options.color || '#3498db';
        const margin = { left: 56, right: 18, top: 12, bottom: 40 };
        const plotW = W - margin.left - margin.right;
        const plotH = H - margin.top - margin.bottom;

        const countsMap = new Map();
        values.forEach(v => {
            countsMap.set(v, (countsMap.get(v) || 0) + 1);
        });

        const categories = [...countsMap.keys()].sort((a, b) => a - b);
        const counts = categories.map(c => countsMap.get(c));
        const maxCount = Math.max(...counts, 1);

        ctx.strokeStyle = '#e0e0e0';
        ctx.lineWidth = 1;
        ctx.font = '11px Arial';
        ctx.fillStyle = '#777';

        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        for (let i = 0; i <= 4; i++) {
            const val = Math.round((i / 4) * maxCount);
            const y = margin.top + plotH - (i / 4) * plotH;

            ctx.beginPath();
            ctx.moveTo(margin.left, y);
            ctx.lineTo(W - margin.right, y);
            ctx.stroke();

            ctx.fillText(`${val}`, margin.left - 8, y);
        }

        ctx.beginPath();
        ctx.strokeStyle = '#999';
        ctx.moveTo(margin.left, margin.top);
        ctx.lineTo(margin.left, margin.top + plotH);
        ctx.lineTo(W - margin.right, margin.top + plotH);
        ctx.stroke();

        const n = categories.length;
        const slotW = plotW / Math.max(n, 1);
        const barW = Math.max(Math.min(slotW * 0.7, 160), 28);

        for (let i = 0; i < n; i++) {
            const xCenter = margin.left + (i + 0.5) * slotW;
            const barH = (counts[i] / maxCount) * plotH;
            const x = xCenter - barW / 2;
            const y = margin.top + plotH - barH;

            ctx.fillStyle = color;
            ctx.fillRect(x, y, barW, barH);

            ctx.fillStyle = '#555';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';
            ctx.fillText(`${categories[i]}`, xCenter, margin.top + plotH + 6);
        }

        ctx.textAlign = 'left';
        ctx.textBaseline = 'alphabetic';
    },
    drawLineWithBand(canvasId, series, options = {}) {
        if (!series.length) return;

        const prepared = this.prepareResponsiveCanvas(canvasId, options.height || 240);
        if (!prepared) return;

        const { ctx, width: W, height: H } = prepared;
        ctx.clearRect(0, 0, W, H);

        const margin = { left: 56, right: 40, top: 12, bottom: 36 };
        const plotW = W - margin.left - margin.right;
        const plotH = H - margin.top - margin.bottom;

        const maxGen = Math.max(1, series.length - 1);
        const maxY = options.maxY ?? Math.max(...series.map(s => s.max), 1);
        const yFormatter = options.yFormatter || (v => v.toFixed(2));
        const lineColor = options.lineColor || '#3498db';
        const bandColor = options.bandColor || 'rgba(52, 152, 219, 0.15)';
        const label = options.label || '';

        ctx.strokeStyle = '#e0e0e0';
        ctx.lineWidth = 1;
        ctx.font = '11px Arial';
        ctx.fillStyle = '#777';

        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        for (let i = 0; i <= 4; i++) {
            const yVal = (i / 4) * maxY;
            const y = margin.top + plotH - (i / 4) * plotH;

            ctx.beginPath();
            ctx.moveTo(margin.left, y);
            ctx.lineTo(W - margin.right, y);
            ctx.stroke();

            ctx.fillText(`${yFormatter(yVal)}`, margin.left - 8, y);
        }

        ctx.textBaseline = 'top';
        for (let i = 0; i <= 4; i++) {
            const xVal = Math.round((i / 4) * maxGen);
            const x = margin.left + (i / 4) * plotW;

            ctx.beginPath();
            ctx.moveTo(x, margin.top);
            ctx.lineTo(x, margin.top + plotH);
            ctx.stroke();

            if (i === 0) ctx.textAlign = 'left';
            else if (i === 4) ctx.textAlign = 'right';
            else ctx.textAlign = 'center';

            ctx.fillText(`${xVal}`, x, margin.top + plotH + 6);
        }

        ctx.beginPath();
        ctx.strokeStyle = '#999';
        ctx.moveTo(margin.left, margin.top);
        ctx.lineTo(margin.left, margin.top + plotH);
        ctx.lineTo(W - margin.right, margin.top + plotH);
        ctx.stroke();

        ctx.beginPath();
        for (let i = 0; i < series.length; i++) {
            const x = margin.left + (i / maxGen) * plotW;
            const y = margin.top + plotH - (series[i].max / maxY) * plotH;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        for (let i = series.length - 1; i >= 0; i--) {
            const x = margin.left + (i / maxGen) * plotW;
            const y = margin.top + plotH - (series[i].min / maxY) * plotH;
            ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.fillStyle = bandColor;
        ctx.fill();

        ctx.beginPath();
        ctx.strokeStyle = lineColor;
        ctx.lineWidth = 2;
        for (let i = 0; i < series.length; i++) {
            const x = margin.left + (i / maxGen) * plotW;
            const y = margin.top + plotH - (series[i].mean / maxY) * plotH;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.stroke();

        if (label) {
            ctx.fillStyle = lineColor;
            ctx.fillRect(W - 155, 12, 12, 12);
            ctx.fillStyle = '#333';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'alphabetic';
            ctx.fillText(label, W - 136, 22);
        }

        ctx.textAlign = 'left';
        ctx.textBaseline = 'alphabetic';
    },
    drawHistogram(canvasId, values, options = {}) {
        if (!values.length) return;

        const prepared = this.prepareResponsiveCanvas(canvasId, options.height || 240);
        if (!prepared) return;

        const { ctx, width: W, height: H } = prepared;
        ctx.clearRect(0, 0, W, H);

        const bins = options.bins || 4;
        const color = options.color || '#3498db';
        const margin = { left: 56, right: 18, top: 12, bottom: 42 };
        const plotW = W - margin.left - margin.right;
        const plotH = H - margin.top - margin.bottom;

        const min = Math.min(...values);
        const max = Math.max(...values);
        const range = max - min || 1;
        const counts = new Array(bins).fill(0);

        values.forEach(v => {
            let idx = Math.floor(((v - min) / range) * bins);
            if (idx >= bins) idx = bins - 1;
            if (idx < 0) idx = 0;
            counts[idx]++;
        });

        const maxCount = Math.max(...counts, 1);

        ctx.strokeStyle = '#e0e0e0';
        ctx.lineWidth = 1;
        ctx.font = '11px Arial';
        ctx.fillStyle = '#777';

        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        for (let i = 0; i <= 4; i++) {
            const val = Math.round((i / 4) * maxCount);
            const y = margin.top + plotH - (i / 4) * plotH;

            ctx.beginPath();
            ctx.moveTo(margin.left, y);
            ctx.lineTo(W - margin.right, y);
            ctx.stroke();

            ctx.fillText(`${val}`, margin.left - 8, y);
        }

        ctx.beginPath();
        ctx.strokeStyle = '#999';
        ctx.moveTo(margin.left, margin.top);
        ctx.lineTo(margin.left, margin.top + plotH);
        ctx.lineTo(W - margin.right, margin.top + plotH);
        ctx.stroke();

        const slotW = plotW / bins;

        for (let i = 0; i < bins; i++) {
            const x = margin.left + i * slotW + 3;
            const barW = Math.max(slotW - 6, 10);
            const barH = (counts[i] / maxCount) * plotH;
            const y = margin.top + plotH - barH;

            ctx.fillStyle = color;
            ctx.fillRect(x, y, barW, barH);

            const binStart = min + (i / bins) * range;
            const binEnd = min + ((i + 1) / bins) * range;
            const label = `${binStart.toFixed(3)}–${binEnd.toFixed(3)}`;

            ctx.fillStyle = '#555';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';
            ctx.fillText(label, margin.left + (i + 0.5) * slotW, margin.top + plotH + 6);
        }

        ctx.textAlign = 'left';
        ctx.textBaseline = 'alphabetic';
    },

    drawExperimentCoverageGraph() {
        const series = this.computeExperimentSeries('bestFitness.coverage');
        this.drawLineWithBand('expCoverageGraph', series, {
            maxY: Model.pointCount,
            yFormatter: v => `${Math.round(v)}`,
            lineColor: '#3498db',
            bandColor: 'rgba(52, 152, 219, 0.15)',
            label: 'Avg best coverage'
        });
    },

    drawExperimentAreaGraph() {
        const series = this.computeExperimentSeries('bestFitness.area');
        this.drawLineWithBand('expAreaGraph', series, {
            lineColor: '#e74c3c',
            bandColor: 'rgba(231, 76, 60, 0.15)',
            yFormatter: v => v.toFixed(2),
            label: 'Mean best area'
        });
    },
    drawExperimentFinalCoverageGraph() {
        const values = experimentResults.map(r => Math.round(r.final.coverage));
        this.drawDiscreteCountChart('expFinalCoverageGraph', values, {
            color: '#2980b9'
        });
    },

    drawExperimentFinalAreaGraph() {
        const values = experimentResults.map(r => r.final.area);
        this.drawHistogram('expFinalAreaGraph', values, {
            bins: 4,
            color: '#c0392b'
        });
    },
    computeExperimentSeries(metricPath) {
        const histories = experimentResults
            .map(r => r.history)
            .filter(h => Array.isArray(h) && h.length > 0);

        if (histories.length === 0) return [];

        const maxLen = Math.max(...histories.map(h => h.length));
        const series = [];

        for (let gen = 0; gen < maxLen; gen++) {
            const values = histories
                .map(h => h[gen])
                .filter(Boolean)
                .map(entry => {
                    const parts = metricPath.split('.');
                    let v = entry;
                    for (const p of parts) v = v?.[p];
                    return v;
                })
                .filter(v => typeof v === 'number' && !Number.isNaN(v));

            if (values.length === 0) {
                series.push({ mean: 0, min: 0, max: 0 });
                continue;
            }

            const mean = values.reduce((a, b) => a + b, 0) / values.length;
            const min = Math.min(...values);
            const max = Math.max(...values);

            series.push({ mean, min, max });
        }

        return series;
    },

    drawExperimentRepairGraph() {
        const series = this.computeExperimentSeries('repairRate');
        this.drawLineWithBand('expRepairGraph', series, {
            maxY: 1,
            lineColor: '#27ae60',
            bandColor: 'rgba(39, 174, 96, 0.15)',
            yFormatter: v => v.toFixed(2),
            label: 'Mean repair rate'
        });
    },

    // ===== EXPERIMENT MODE =====
    startExperiment() {
        this.setSettingsEnabled(false);

        const container = document.getElementById('resultsContainer');
        container.innerHTML = this.createExperimentView();

        const runCounter = document.getElementById('runCounter');
        if (runCounter) {
            runCounter.textContent = `Run: 0 / ${Model.experiment.numRuns}`;
        }

        document.getElementById('exportResultsBtn')?.addEventListener('click', () => this.exportResults());
        this.runExperiment();
    },

    createExperimentView() {
        return `
    <div class="experiment-view">
      <div class="results-panel">
        <div class="results-header">
          <h3>Experiment Progress</h3>
          <div class="run-info" id="runCounter">Run 0 / ${Model.experiment.numRuns}</div>
        </div>

        <div class="progress-bar">
          <div class="progress-fill" id="progressFill" style="width: 0%"></div>
        </div>

        <div class="graph-container" style="margin-top: 24px;">
          <h4 style="margin: 0 0 12px 0; color: #2c3e50; font-size: 16px;">
            General Experiment Plots
          </h4>

          <div class="graph-row">
            <div class="graph-item">
              <div class="graph-label">Mean Best Coverage over Generations</div>
              <canvas id="expCoverageGraph"></canvas>
            </div>

            <div class="graph-item">
              <div class="graph-label">Mean Best Area over Generations</div>
              <canvas id="expAreaGraph"></canvas>
            </div>

            <div class="graph-item">
              <div class="graph-label">Mean Diversity over Generations</div>
              <canvas id="expDiversityGraph"></canvas>
            </div>

            <div class="graph-item">
              <div class="graph-label">Final Coverage Distribution</div>
              <canvas id="expFinalCoverageGraph"></canvas>
            </div>

            <div class="graph-item">
              <div class="graph-label">Final Area Distribution</div>
              <canvas id="expFinalAreaGraph"></canvas>
            </div>

            <div class="graph-item">
              <div class="graph-label">Final Diversity Distribution</div>
              <canvas id="expFinalDiversityGraph"></canvas>
            </div>
          </div>
        </div>

        <div class="action-row">
          <button class="button export" id="exportResultsBtn">EXPORT CSV</button>
        </div>
      </div>
    </div>
  `;
    }

    , runExperiment() {
        if (isExperimentRunning) {
            return;
        }

        isExperimentRunning = true;
        experimentResults = [];

        const experimentBtn = document.getElementById('runExperimentBtn');
        if (experimentBtn) {
            experimentBtn.disabled = true;
            experimentBtn.textContent = 'RUNNING EXPERIMENT...';
        }
        const runInteractiveBtn = document.getElementById('runInteractiveBtn');
        const clearBtn = document.getElementById('clearBtn');

        if (runInteractiveBtn) runInteractiveBtn.disabled = true;
        if (clearBtn) clearBtn.disabled = true;

        const progressFill = document.getElementById('progressFill');
        const runCounter = document.getElementById('runCounter');

        if (progressFill) progressFill.style.width = '0%';
        if (runCounter) runCounter.textContent = `Run: 0 / ${Model.experiment.numRuns}`;

        const totalRuns = Model.experiment.numRuns;

        const IndividualClass =
            Model.representation === 'cartesian'
                ? CartesianPolygonIndividual
                : PolarPolygonIndividual;

        const conditionLabel =
            `${Model.representation} | ${Model.mutation.type} | ${Model.crossover.type}`;

        const finishExperiment = () => {
            isExperimentRunning = false;
            this.setSettingsEnabled(true);

            const experimentBtn = document.getElementById('runExperimentBtn');
            const runInteractiveBtn = document.getElementById('runInteractiveBtn');
            const clearBtn = document.getElementById('clearBtn');

            if (experimentBtn) {
                experimentBtn.disabled = false;
                experimentBtn.textContent = 'RUN EXPERIMENT';
            }

            if (runInteractiveBtn) runInteractiveBtn.disabled = false;
            if (clearBtn) clearBtn.disabled = true;

            this.drawExperimentPlots();
        };

        const runOne = (runIndex) => {
            if (!isExperimentRunning) return;

            if (runIndex >= totalRuns) {
                finishExperiment();
                return;
            }

            setTimeout(() => {
                if (!isExperimentRunning) return;

                Model.initExperimentRNGs(runIndex);

                if (runIndex === 0 || !points || points.length === 0) {
                    this.generatePoints(Model.experimentRNGs.points);
                }

                this.setupEvolutionEngine(true);

                const result = evolutionEngine.run(IndividualClass, Model.nVertices);
                const finalGen = result.history[result.history.length - 1];

                const runData = {
                    run: runIndex + 1,
                    condition: conditionLabel,
                    pointSet: Model.pointSet,
                    pointCount: Model.pointCount,
                    representation: Model.representation,
                    mutationType: Model.mutation.type,
                    crossoverType: Model.crossover.type,
                    seeds: {
                        points: Model.experimentSeed + 1000,
                        mutation: Model.experimentSeed + runIndex * 10000 + 2000,
                        crossover: Model.experimentSeed + runIndex * 10000 + 3000,
                        selection: Model.experimentSeed + runIndex * 10000 + 4000,
                        initialization: Model.experimentSeed + runIndex * 10000 + 5000
                    },
                    points: runIndex === 0 ? JSON.parse(JSON.stringify(points)) : null,
                    history: result.history,
                    final: {
                        coverage: finalGen.bestFitness.coverage,
                        area: finalGen.bestFitness.area,
                        diversity: finalGen.diversity
                    }
                };

                experimentResults.push(runData);


                const done = runIndex + 1;
                const percent = (done / totalRuns) * 100;

                if (progressFill) progressFill.style.width = `${percent}%`;
                if (runCounter) runCounter.textContent = `Run: ${done} / ${totalRuns}`;

                runOne(runIndex + 1);
            }, 0);
        };

        runOne(0);
    }

    ,

    exportResults() {
        console.log('Exporting results...');
    }
};

// ===== INITIALIZE =====
document.addEventListener('DOMContentLoaded', () => {
    UI.init();
});