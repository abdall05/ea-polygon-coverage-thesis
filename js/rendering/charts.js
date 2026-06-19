// js/rendering/charts.js
import Plotly from 'plotly.js-dist-min';
import { getDefaultLayout, makeLineTrace, getGenerationAxis } from './plotly.js';

function getContainer(containerOrId) {
    if (typeof containerOrId === 'string') return document.getElementById(containerOrId);
    return containerOrId;
}

function renderChart(container, traces, layout, config = { responsive: true }) {
    if (!container) return;
    Plotly.newPlot(container, traces, layout, config);
}

export function purgePlot(target) {
    if (target) Plotly.purge(target);
}

// ------------------------------------------------------------------------
// Interactive mode charts
// ------------------------------------------------------------------------

export function drawCoverageGraph(containerId, history, pointCount) {
    const container = getContainer(containerId);
    const x = getGenerationAxis(history);

    const traces = [
        makeLineTrace(x, history.map(g => g.bestFitness.coverage), 'Best', '#3498db'),
        makeLineTrace(x, history.map(g => g.avgFitness.coverage), 'Average', '#95a5a6', {
            line: { dash: 'dash' }
        })
    ];

    const layout = getDefaultLayout(
        'Coverage Convergence',
        'Generation',
        `Coverage (${pointCount} points)`
    );

    renderChart(container, traces, layout);
}

export function drawAreaGraph(containerId, history) {
    const container = getContainer(containerId);
    const x = getGenerationAxis(history);

    const traces = [
        makeLineTrace(x, history.map(g => g.bestFitness.area), 'Best', '#e74c3c'),
        makeLineTrace(x, history.map(g => g.avgFitness.area), 'Average', '#f39c12', {
            line: { dash: 'dash' }
        })
    ];

    const layout = getDefaultLayout(
        'Area Convergence',
        'Generation',
        'Polygon Area'
    );

    renderChart(container, traces, layout);
}

export function drawDiversityGraph(containerId, history) {
    const container = getContainer(containerId);
    const x = getGenerationAxis(history);

    const traces = [
        makeLineTrace(x, history.map(g => g.diversity), 'Diversity', '#9b59b6')
    ];

    const layout = getDefaultLayout(
        'Population Diversity',
        'Generation',
        'Diversity'
    );

    renderChart(container, traces, layout);
}

export function drawExpandedGraph(plotDiv, graphKey, history, pointCount) {
    if (!plotDiv) return;

    Plotly.purge(plotDiv);

    const x = getGenerationAxis(history);
    let traces = [];
    let layout = null;

    if (graphKey === 'coverage') {
        traces = [
            makeLineTrace(x, history.map(g => g.bestFitness.coverage), 'Best', '#3498db'),
            makeLineTrace(x, history.map(g => g.avgFitness.coverage), 'Average', '#95a5a6', {
                line: { dash: 'dash' }
            })
        ];
        layout = getDefaultLayout('Coverage Convergence', 'Generation', `Coverage (${pointCount} points)`, true);
    } else if (graphKey === 'area') {
        traces = [
            makeLineTrace(x, history.map(g => g.bestFitness.area), 'Best', '#e74c3c'),
            makeLineTrace(x, history.map(g => g.avgFitness.area), 'Average', '#f39c12', {
                line: { dash: 'dash' }
            })
        ];
        layout = getDefaultLayout('Area Convergence', 'Generation', 'Polygon Area', true);
    } else if (graphKey === 'diversity') {
        traces = [
            makeLineTrace(x, history.map(g => g.diversity), 'Diversity', '#9b59b6')
        ];
        layout = getDefaultLayout('Population Diversity', 'Generation', 'Diversity', true);
    }

    if (layout) {
        Plotly.newPlot(plotDiv, traces, layout, { responsive: true });
    }
}
// ------------------------------------------------------------------------
// Experiment mode charts
// ------------------------------------------------------------------------

function getMetricValue(gen, metric) {
    if (metric === 'coverage') return gen.bestFitness.coverage;
    if (metric === 'area') return gen.bestFitness.area;
    return gen.diversity;
}

function getMetricTitle(metric) {
    if (metric === 'coverage') return 'Coverage';
    if (metric === 'area') return 'Area';
    return 'Diversity';
}

function getMetricYAxis(metric) {
    if (metric === 'coverage') return 'Coverage (points)';
    if (metric === 'area') return 'Polygon Area';
    return 'Diversity';
}

/**
 * Mean best convergence + min/max envelope
 * container can be id or HTMLElement
 */
export function drawMeanConvergenceGraph(containerOrId, runResults, metric, color, yMax = null, expanded = false) {
    const container = getContainer(containerOrId);
    if (!container || !runResults?.length) return;

    const maxGen = Math.max(...runResults.map(r => r.history.length));
    const generations = Array.from({ length: maxGen }, (_, i) => i);

    const meanValues = [];
    const minValues = [];
    const maxValues = [];

    for (let gen = 0; gen < maxGen; gen++) {
        const values = runResults
            .map(r => r.history[gen])
            .filter(Boolean)
            .map(g => getMetricValue(g, metric));

        if (!values.length) {
            meanValues.push(0);
            minValues.push(0);
            maxValues.push(0);
            continue;
        }

        meanValues.push(values.reduce((a, b) => a + b, 0) / values.length);
        minValues.push(Math.min(...values));
        maxValues.push(Math.max(...values));
    }

    const fillColor =
        metric === 'coverage' ? 'rgba(52,152,219,0.2)' :
            metric === 'area' ? 'rgba(231,76,60,0.2)' :
                'rgba(155,89,182,0.2)';

    const traces = [
        {
            x: [...generations, ...[...generations].reverse()],
            y: [...maxValues, ...[...minValues].reverse()],
            name: 'Min-Max Range',
            type: 'scatter',
            mode: 'lines',
            fill: 'toself',
            fillcolor: fillColor,
            line: { color: 'transparent' },
            showlegend: true
        },
        {
            x: generations,
            y: meanValues,
            name: `Mean Best ${getMetricTitle(metric)}`,
            type: 'scatter',
            mode: 'lines',
            line: { color, width: expanded ? 3 : 2 },
            showlegend: true
        }
    ];

    const layout = {
        title: `${getMetricTitle(metric)} Convergence (${runResults.length} runs)`,
        xaxis: {
            title: 'Generation',
            rangeslider: { visible: true }
        },
        yaxis: {
            title: getMetricYAxis(metric),
            range: yMax != null ? [0, yMax] : undefined
        },
        hovermode: 'closest',
        dragmode: 'zoom',
        font: { size: expanded ? 16 : 12 },
        margin: expanded
            ? { l: 70, r: 30, t: 60, b: 70 }
            : { l: 50, r: 20, t: 40, b: 50 }
    };

    Plotly.newPlot(container, traces, layout, { responsive: true });
}

export function drawExperimentCoverageGraph(containerOrId, experimentResults, pointCount, expanded = false) {
    drawMeanConvergenceGraph(containerOrId, experimentResults, 'coverage', '#3498db', pointCount, expanded);
}

export function drawExperimentAreaGraph(containerOrId, experimentResults, expanded = false) {
    drawMeanConvergenceGraph(containerOrId, experimentResults, 'area', '#e74c3c', 1, expanded);
}

export function drawExperimentDiversityGraph(containerOrId, experimentResults, expanded = false) {
    drawMeanConvergenceGraph(containerOrId, experimentResults, 'diversity', '#9b59b6', null, expanded);
}

/**
 * Box plot for final values
 * container can be id or HTMLElement
 */
export function drawBoxPlot(containerOrId, values, title, yMax = null, expanded = false) {
    const container = getContainer(containerOrId);
    if (!container || !values?.length) return;

    const trace = {
        y: values,
        type: 'box',
        name: title,
        boxmean: 'sd',
        boxpoints: 'all',
        jitter: 0.3,
        pointpos: -1.8,
        marker: { color: '#2980b9', size: 6, opacity: 0.6 },
        line: { color: '#1a5276', width: expanded ? 3 : 2 },
        fillcolor: '#85c1e9'
    };

    const layout = {
        title: `${title} (${values.length} runs)`,
        yaxis: {
            title:
                title === 'Final Coverage'
                    ? 'Points Covered'
                    : title === 'Final Area'
                        ? 'Polygon Area'
                        : 'Diversity',
            range: yMax != null ? [0, yMax] : undefined
        },
        xaxis: { showticklabels: false },
        showlegend: false,
        hovermode: 'closest',
        font: { size: expanded ? 16 : 12 },
        margin: expanded
            ? { l: 70, r: 30, t: 60, b: 70 }
            : { l: 50, r: 20, t: 40, b: 50 }
    };

    Plotly.newPlot(container, [trace], layout, { responsive: true });
}

export function drawExperimentBoxPlot(containerOrId, values, title, yMax = null, expanded = false) {
    drawBoxPlot(containerOrId, values, title, yMax, expanded);
}

export function createExperimentGraphItem(graphId, title, containerId) {
    return `
        <div class="graph-item">
            <div class="graph-head" style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                <div class="graph-label">${title}</div>
                <button class="button secondary expand-graph-btn" data-graph="${graphId}">Expand</button>
            </div>
            <div id="${containerId}" style="width:100%; height:400px;"></div>
        </div>`;
}

export function createExperimentModal() {
    return `
        <div id="graphModal" style="display:none; position:fixed; inset:0; background:rgba(0,0,0,0.65); z-index:9999; align-items:center; justify-content:center; padding:24px;">
            <div style="background:white; width:min(1400px, 96vw); height:min(90vh, 900px); border-radius:12px; padding:16px; display:flex; flex-direction:column; box-shadow:0 20px 60px rgba(0,0,0,0.25);">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
                    <h3 id="graphModalTitle" style="margin:0;">Expanded Graph</h3>
                    <button id="closeGraphModal" class="button">Close</button>
                </div>
                <div id="graphModalPlot" style="width:100%; height:100%; min-height:500px;"></div>
            </div>
        </div>`;
}

// Helper to get final value from run's history (last generation)
function getFinalFromRun(run, field) {
    if (!run.history || run.history.length === 0) return null;
    const last = run.history[run.history.length - 1];
    if (field === 'coverage') return last.bestFitness?.coverage;
    if (field === 'area') return last.bestFitness?.area;
    if (field === 'diversity') return last.diversity;
    return null;
}

export function bindExperimentGraphExpanders(container, experimentModeInstance) {
    const expandBtns = container.querySelectorAll('.expand-graph-btn');

    expandBtns.forEach(btn => {
        btn.onclick = () => {
            openExperimentGraphModal(btn.dataset.graph, experimentModeInstance);
        };
    });

    const closeModalBtn = document.getElementById('closeGraphModal');
    if (closeModalBtn) {
        closeModalBtn.onclick = () => closeExperimentGraphModal();
    }

    const modal = document.getElementById('graphModal');
    if (modal) {
        modal.onclick = (e) => {
            if (e.target.id === 'graphModal') closeExperimentGraphModal();
        };
    }
}

function openExperimentGraphModal(graphKey, expMode) {
    const modal = document.getElementById('graphModal');
    const titleEl = document.getElementById('graphModalTitle');
    const plotDiv = document.getElementById('graphModalPlot');

    if (!modal || !titleEl || !plotDiv) return;

    const runResults = expMode?.state?.runResults ?? [];
    const pointCount = expMode?.state?.pointDistribution?.params?.count ?? 100;

    const titles = {
        coverage: 'Mean Best Coverage',
        area: 'Mean Best Area',
        diversity: 'Mean Diversity',
        finalCoverage: 'Final Coverage',
        finalArea: 'Final Area',
        finalDiversity: 'Final Diversity',
        expCoverageGraph: 'Mean Best Coverage',
        expAreaGraph: 'Mean Best Area',
        expDiversityGraph: 'Mean Diversity',
        expFinalCoverageGraph: 'Final Coverage',
        expFinalAreaGraph: 'Final Area',
        expFinalDiversityGraph: 'Final Diversity'
    };

    titleEl.textContent = titles[graphKey] || 'Expanded Graph';
    modal.style.display = 'flex';

    requestAnimationFrame(() => {
        modal.offsetHeight;
        Plotly.purge(plotDiv);

        if (graphKey === 'coverage' || graphKey === 'expCoverageGraph') {
            drawExperimentCoverageGraph(plotDiv, runResults, pointCount, true);

        } else if (graphKey === 'area' || graphKey === 'expAreaGraph') {
            drawExperimentAreaGraph(plotDiv, runResults, true);

        } else if (graphKey === 'diversity' || graphKey === 'expDiversityGraph') {
            drawExperimentDiversityGraph(plotDiv, runResults, true);

        } else if (graphKey === 'finalCoverage' || graphKey === 'expFinalCoverageGraph') {
            const values = runResults
                .map(r => getFinalFromRun(r, 'coverage'))
                .filter(v => v !== undefined && v !== null);

            drawExperimentBoxPlot(plotDiv, values, 'Final Coverage', pointCount, true);

        } else if (graphKey === 'finalArea' || graphKey === 'expFinalAreaGraph') {
            const values = runResults
                .map(r => getFinalFromRun(r, 'area'))
                .filter(v => v !== undefined && v !== null);

            drawExperimentBoxPlot(plotDiv, values, 'Final Area', 1, true);

        } else if (graphKey === 'finalDiversity' || graphKey === 'expFinalDiversityGraph') {
            const values = runResults
                .map(r => getFinalFromRun(r, 'diversity'))
                .filter(v => v !== undefined && v !== null);

            drawExperimentBoxPlot(plotDiv, values, 'Final Diversity', null, true);
        }

        setTimeout(() => {
            if (plotDiv) {
                Plotly.Plots.resize(plotDiv);
                Plotly.relayout(plotDiv, {
                    'xaxis.autorange': true,
                    'yaxis.autorange': true
                });
            }
        }, 50);
    });
}
export function closeExperimentGraphModal() {
    const modal = document.getElementById('graphModal');
    const plot = document.getElementById('graphModalPlot');
    if (plot) Plotly.purge(plot);
    if (modal) modal.style.display = 'none';
}