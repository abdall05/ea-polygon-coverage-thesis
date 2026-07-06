import {
  localityFieldConfig,
  createDefaultLocalityState
} from '../../model/locality/localityConfig.js';

import { getMutationDefinition } from '../../model/mutations/mutationConfig.js';

import {
  paramsToDefaults,
  parseIntInput,
  parseFloatInput,
  renderOptions,
  renderParamInputs,
  validateNumberInputsBeforeAction
} from '../../utils/configUiHelpers.js';

export class ConfigLocalityExperiment {
  constructor(container) {
    this.container = container;
    this.state = createDefaultLocalityState();
    this.result = null;
    this.localityWorker = null;
    this.isRunning = false;
    this.refs = {};

    this._boundOnInput = (e) => this._handleInput(e);
    this._boundOnChange = (e) => this._handleChange(e);
    this._boundOnClick = (e) => this._handleClick(e);
  }

  async start() {
    this.render();
    this.cacheRefs();
    this.bindEvents();
    this.renderMutationParams();
    this.syncUI();
    this.setBusy(false);
  }

  render() {
    const repTypeField = localityFieldConfig.representation.type;
    const repVerticesField = localityFieldConfig.representation.nVertices;
    const mutationTypeField = localityFieldConfig.mutation.type;
    const sampleSizeField = localityFieldConfig.experiment.sampleSize;
    const seedField = localityFieldConfig.experiment.seed;

    this.container.innerHTML = `
      <section class="locality-experiment" aria-label="Locality experiment">
        <section class="locality-config-row" aria-labelledby="locality-config-title">
          <div class="section-head">
            <div>
              <h2 id="locality-config-title" class="config-card-title">Locality Configuration</h2>
              <p class="config-card-subtitle">
                Configure representation, mutation, and sampling before estimating locality.
              </p>
            </div>
          </div>

          <div class="locality-config-grid">
            <section class="config-card locality-config-card" aria-labelledby="locality-representation-title">
              <header class="config-card-header">
                <div>
                  <h3 id="locality-representation-title" class="config-card-title">Representation</h3>
                  <p class="config-card-subtitle">
                    Choose the encoding and the polygon complexity used during mutation sampling.
                  </p>
                </div>
              </header>

              <div class="config-card-body">
                <div class="config-section">
                  <div class="param-grid">
                    <div class="param-row">
                      <label for="loc-representation-type">${repTypeField.label}</label>
                      <select id="loc-representation-type">
                        ${renderOptions(repTypeField.options, this.state.representation.type)}
                      </select>
                    </div>

                    <div class="param-row">
                      <label for="loc-nVertices">${repVerticesField.label}</label>
                      <div class="param-control">
                        <input
                          id="loc-nVertices"
                          type="number"
                          inputmode="numeric"
                          min="${repVerticesField.min}"
                          max="${repVerticesField.max}"
                          step="${repVerticesField.step}"
                          value="${this.state.representation.nVertices}"
                        >
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section class="config-card locality-config-card" aria-labelledby="locality-mutation-title">
              <header class="config-card-header">
                <div>
                  <h3 id="locality-mutation-title" class="config-card-title">Mutation</h3>
                  <p class="config-card-subtitle">
                    Select the mutation operator and tune its parameters for the locality estimate.
                  </p>
                </div>
              </header>

              <div class="config-card-body">
                <div class="config-section">
                  <div class="param-grid">
                    <div class="param-row">
                      <label for="loc-mutation-type">${mutationTypeField.label}</label>
                      <select id="loc-mutation-type">
                        ${renderOptions(mutationTypeField.options, this.state.mutation.type)}
                      </select>
                    </div>
                  </div>

                  <div id="loc-mutation-params" class="dynamic-param-group"></div>
                </div>
              </div>
            </section>

            <section class="config-card locality-config-card" aria-labelledby="locality-experiment-title">
              <header class="config-card-header">
                <div>
                  <h3 id="locality-experiment-title" class="config-card-title">Experiment</h3>
                  <p class="config-card-subtitle">
                    Control the sample count and seed used for a reproducible measurement.
                  </p>
                </div>
              </header>

              <div class="config-card-body">
                <div class="config-section">
                  <div class="param-grid">
                    <div class="param-row">
                      <label for="loc-sampleSize">${sampleSizeField.label}</label>
                      <div class="param-control">
                        <input
                          id="loc-sampleSize"
                          type="number"
                          inputmode="numeric"
                          min="${sampleSizeField.min}"
                          max="${sampleSizeField.max}"
                          step="${sampleSizeField.step}"
                          value="${this.state.experiment.sampleSize}"
                        >
                      </div>
                    </div>

                    <div class="param-row">
                      <label for="loc-seed">${seedField.label}</label>
                      <div class="param-control">
                        <input
                          id="loc-seed"
                          type="number"
                          inputmode="numeric"
                          min="${seedField.min}"
                          ${seedField.max !== undefined ? `max="${seedField.max}"` : ''}
                          step="${seedField.step}"
                          value="${this.state.experiment.seed}"
                        >
                      </div>
                    </div>
                  </div>
                </div>

                <div class="exp-actions" aria-label="Locality experiment actions">
                  <button id="measureLocalityBtn" class="primary" type="button">
                    <span class="btn-label">Measure locality</span>
                  </button>

<button id="clearLocalityBtn" class="secondary" type="button" disabled>
  Clear Results
</button>
                </div>
              </div>
            </section>
          </div>
        </section>

        <section class="config-card locality-results-panel" aria-labelledby="locality-results-title" aria-live="polite">
          <header class="config-card-header">
            <div>
              <h2 id="locality-results-title" class="config-card-title">Distance Results</h2>
              <p class="config-card-subtitle">
                Statistical summary of genotype and phenotype distances.
              </p>
            </div>
          </header>

          <div class="config-card-body locality-results-body">
            <div id="localityEmptyState" class="empty-state">
              <p>No result yet. Run a measurement to display the statistical summary.</p>
            </div>

            <div id="localityResultContent" class="locality-result-stack" hidden>
              <section class="result-section" aria-labelledby="locality-meta-title">
                <div class="section-head">
                  <div>
                    <h3 id="locality-meta-title">Measurement Setup</h3>
                    <p class="section-note">
                      This records the exact representation, mutation settings, and sample counts used for the reported statistics.
                    </p>
                  </div>
                </div>

                <div class="result-meta">
                  <div><span class="label">Representation</span><span id="localityRep">—</span></div>
                  <div><span class="label">Vertices</span><span id="localityVertices">—</span></div>
                  <div><span class="label">Mutation</span><span id="localityMutType">—</span></div>
                  <div><span class="label">Parameters</span><span id="localityMutParams">—</span></div>
                  <div><span class="label">Requested samples</span><span id="localityRequestedSamples">—</span></div>
                  <div><span class="label">Valid samples</span><span id="localityValidSamples">—</span></div>
                  <div><span class="label">Skipped no-change</span><span id="localitySkippedSamples">—</span></div>
                </div>
              </section>

              <section class="result-section" aria-labelledby="locality-summary-title">
                <div class="section-head">
                  <div>
                    <h3 id="locality-summary-title">Summary Tables</h3>
                    <p class="section-note">
                        The tables report the underlying genotype and phenotype distance summaries.
                    </p>
                  </div>
                </div>

                <div class="locality-table-grid">
                  <section class="locality-table-card" aria-labelledby="locality-dg-title">
                    <h3 id="locality-dg-title">Genotype Distance (dG)</h3>
                    <p class="section-note">Distance measured in genotype space.</p>
                    <div id="localityDGTable"></div>
                  </section>

                  <section class="locality-table-card" aria-labelledby="locality-dp-title">
                    <h3 id="locality-dp-title">Phenotype Distance (dP)</h3>
                    <p class="section-note">Distance measured in phenotype space.</p>
                    <div id="localityDPTable"></div>
                  </section>
                </div>
              </section>
            </div>
          </div>
        </section>
      </section>
    `;
  }

  cacheRefs() {
    this.refs = {
      mutationParams: this.container.querySelector('#loc-mutation-params'),
      empty: this.container.querySelector('#localityEmptyState'),
      resultContent: this.container.querySelector('#localityResultContent'),
      measureBtn: this.container.querySelector('#measureLocalityBtn'),
      clearBtn: this.container.querySelector('#clearLocalityBtn'),
      representationType: this.container.querySelector('#loc-representation-type'),
      nVertices: this.container.querySelector('#loc-nVertices'),
      mutationType: this.container.querySelector('#loc-mutation-type'),
      sampleSize: this.container.querySelector('#loc-sampleSize'),
      seed: this.container.querySelector('#loc-seed'),
      localityRep: this.container.querySelector('#localityRep'),
      localityVertices: this.container.querySelector('#localityVertices'),
      localityMutType: this.container.querySelector('#localityMutType'),
      localityMutParams: this.container.querySelector('#localityMutParams'),
      localityRequestedSamples: this.container.querySelector('#localityRequestedSamples'),
      localityValidSamples: this.container.querySelector('#localityValidSamples'),
      localitySkippedSamples: this.container.querySelector('#localitySkippedSamples'),
      localityDGTable: this.container.querySelector('#localityDGTable'),
      localityDPTable: this.container.querySelector('#localityDPTable')
    };
  }

  bindEvents() {
    this.container.removeEventListener('change', this._boundOnChange);
    this.container.removeEventListener('click', this._boundOnClick);

    this.container.addEventListener('change', this._boundOnChange);
    this.container.addEventListener('click', this._boundOnClick);
  }

  rebuildMutationParams() {
    const def = getMutationDefinition(this.state.mutation.type, this.state.representation.type);
    this.state.mutation.params = paramsToDefaults(def?.params);
  }

  renderMutationParams() {
    const def = getMutationDefinition(this.state.mutation.type, this.state.representation.type);
    renderParamInputs(this.refs.mutationParams, def, this.state.mutation.params, 'loc-mut');
  }

  _handleInput(e) {
    const { id } = e.target;

    if (id === 'loc-nVertices') {
      const meta = localityFieldConfig.representation.nVertices;
      this.state.representation.nVertices = parseIntInput(e.target, meta.default, meta);
      return;
    }

    if (id === 'loc-sampleSize') {
      const meta = localityFieldConfig.experiment.sampleSize;
      this.state.experiment.sampleSize = parseIntInput(e.target, meta.default, meta);
      return;
    }

    if (id === 'loc-seed') {
      const meta = localityFieldConfig.experiment.seed;
      this.state.experiment.seed = parseIntInput(e.target, meta.default, meta);
      return;
    }

    if (id.startsWith('loc-mut-param-')) {
      const key = id.slice('loc-mut-param-'.length);
      const def = getMutationDefinition(this.state.mutation.type, this.state.representation.type);
      const meta = def?.params?.[key];
      if (!meta) return;

      this.state.mutation.params[key] = Number.isInteger(meta.step)
        ? parseIntInput(e.target, meta.default, meta)
        : parseFloatInput(e.target, meta.default, meta);
    }
  }

  _handleChange(e) {
    const { id, value } = e.target;

    if (id === 'loc-representation-type') {
      this.state.representation.type = value;
      this.rebuildMutationParams();
      this.renderMutationParams();
      return;
    }

    if (id === 'loc-mutation-type') {
      this.state.mutation.type = value;
      this.rebuildMutationParams();
      this.renderMutationParams();
      return;
    }

    if (id === 'loc-nVertices') {
      const meta = localityFieldConfig.representation.nVertices;
      this.state.representation.nVertices = parseIntInput(e.target, meta.default, meta);
      return;
    }

    if (id === 'loc-sampleSize') {
      const meta = localityFieldConfig.experiment.sampleSize;
      this.state.experiment.sampleSize = parseIntInput(e.target, meta.default, meta);
      return;
    }

    if (id === 'loc-seed') {
      const meta = localityFieldConfig.experiment.seed;
      this.state.experiment.seed = parseIntInput(e.target, meta.default, meta);
      return;
    }

    if (id.startsWith('loc-mut-param-')) {
      const key = id.slice('loc-mut-param-'.length);
      const def = getMutationDefinition(this.state.mutation.type, this.state.representation.type);
      const meta = def?.params?.[key];
      if (!meta) return;

      this.state.mutation.params[key] = Number.isInteger(meta.step)
        ? parseIntInput(e.target, meta.default, meta)
        : parseFloatInput(e.target, meta.default, meta);
    }
  }
  _handleClick(e) {
    if (e.target.closest('#measureLocalityBtn')) {
      if (!validateNumberInputsBeforeAction(
        this.container,
        input => this._handleChange({ target: input }),
        {
          selector: '.locality-experiment input[type="number"]:not(:disabled)',
          message: 'Some invalid inputs were reset to their default values. Please review them and click Measure locality again.'
        }
      )) {
        return;
      }

      this.measureLocality();
      return;
    }

    if (e.target.closest('#clearLocalityBtn')) {
      this.clear();
    }
  }

  setBusy(isBusy) {
    this.isRunning = isBusy;

    if (this.refs.measureBtn) {
      this.refs.measureBtn.disabled = isBusy;
    }

    const label = this.refs.measureBtn?.querySelector('.btn-label');
    if (label) {
      label.textContent = isBusy ? 'Measuring…' : 'Measure locality';
    }

    if (this.refs.clearBtn) {
      this.refs.clearBtn.disabled = isBusy ? false : !this.result;
      this.refs.clearBtn.textContent = isBusy ? 'Stop Measurement' : 'Clear Results';
    }
  }

  syncUI() {
    const hasResult = Boolean(this.result);

    if (this.refs.empty) {
      this.refs.empty.hidden = hasResult;
      this.refs.empty.style.display = hasResult ? 'none' : 'grid';
    }

    if (this.refs.resultContent) {
      this.refs.resultContent.hidden = !hasResult;
      this.refs.resultContent.style.display = hasResult ? 'grid' : 'none';
    }
  }

  measureLocality() {
    if (this.isRunning) return;

    if (this.localityWorker) {
      this.localityWorker.terminate();
      this.localityWorker = null;
    }

    this.result = null;

    if (this.refs.localityDGTable) this.refs.localityDGTable.innerHTML = '';
    if (this.refs.localityDPTable) this.refs.localityDPTable.innerHTML = '';

    this.syncUI();
    this.setBusy(true);

    this.localityWorker = new Worker(new URL('../../workers/localityWorker.js', import.meta.url), {
      type: 'module'
    });
    this.localityWorker.onerror = (error) => {
      console.error('Locality worker failed to load or crashed:', error);

      this.localityWorker?.terminate();
      this.localityWorker = null;
      this.result = null;
      this.syncUI();
      this.setBusy(false);
    };

    this.localityWorker.onmessageerror = (error) => {
      console.error('Locality worker message error:', error);

      this.localityWorker?.terminate();
      this.localityWorker = null;
      this.result = null;
      this.syncUI();
      this.setBusy(false);
    };

    this.localityWorker.onmessage = ({ data }) => {
      if (data.type === 'localityResult') {
        this.result = data.result;
        this.updateResultPanel(data.result);
        this.syncUI();

        this.localityWorker?.terminate();
        this.localityWorker = null;
        this.setBusy(false);
        return;
      }

      if (data.type === 'localityError') {
        console.error(data.error);

        this.localityWorker?.terminate();
        this.localityWorker = null;
        this.result = null;
        this.syncUI();
        this.setBusy(false);
      }
    };

    this.localityWorker.postMessage({
      type: 'runLocalityExperiment',
      config: structuredClone(this.state)
    });
  }

  formatNumber(value, digits = 4) {
    if (!Number.isFinite(value)) return '—';

    if (value === 0) {
      return value.toFixed(digits);
    }

    const abs = Math.abs(value);
    const threshold = 10 ** -digits;

    if (abs < threshold) {
      return value.toExponential(2);
    }

    return value.toFixed(digits);
  }

  renderSummaryTable(summary) {
    return `
      <div class="experiment-table-wrap">
        <table class="results-table">
          <thead>
            <tr>
              <th>Statistic</th>
              <th class="is-numeric">Value</th>
            </tr>
          </thead>
          <tbody>
            <tr><td>Mean</td><td class="is-numeric">${this.formatNumber(summary.mean)}</td></tr>
            <tr><td>Median</td><td class="is-numeric">${this.formatNumber(summary.median)}</td></tr>
            <tr><td>Standard deviation</td><td class="is-numeric">${this.formatNumber(summary.sd)}</td></tr>
            <tr><td>Minimum</td><td class="is-numeric">${this.formatNumber(summary.min)}</td></tr>
            <tr><td>Q1</td><td class="is-numeric">${this.formatNumber(summary.q1)}</td></tr>
            <tr><td>Q3</td><td class="is-numeric">${this.formatNumber(summary.q3)}</td></tr>
            <tr><td>Maximum</td><td class="is-numeric">${this.formatNumber(summary.max)}</td></tr>
          </tbody>
        </table>
      </div>
    `;
  }

  formatParams(params) {
    const entries = Object.entries(params ?? {});
    return entries.length ? entries.map(([k, v]) => `${k}=${v}`).join(', ') : 'None';
  }

  updateResultPanel(result) {
    if (!result) return;

    if (this.refs.localityRep) {
      this.refs.localityRep.textContent = this.state.representation.type;
    }

    if (this.refs.localityVertices) {
      this.refs.localityVertices.textContent = String(this.state.representation.nVertices);
    }

    if (this.refs.localityMutType) {
      this.refs.localityMutType.textContent = this.state.mutation.type;
    }

    if (this.refs.localityMutParams) {
      this.refs.localityMutParams.textContent = this.formatParams(this.state.mutation.params);
    }

    if (this.refs.localityRequestedSamples) {
      this.refs.localityRequestedSamples.textContent = String(result.config.sampleSize);
    }

    if (this.refs.localityValidSamples) {
      this.refs.localityValidSamples.textContent = String(result.samples.validSamples);
    }

    if (this.refs.localitySkippedSamples) {
      this.refs.localitySkippedSamples.textContent = String(result.samples.skippedNoGenotypeChange ?? 0);
    }


    if (this.refs.localityDGTable) {
      this.refs.localityDGTable.innerHTML = this.renderSummaryTable(result.summary.dG);
    }

    if (this.refs.localityDPTable) {
      this.refs.localityDPTable.innerHTML = this.renderSummaryTable(result.summary.dP);
    }

    if (this.refs.empty) {
      this.refs.empty.hidden = true;
      this.refs.empty.style.display = 'none';
    }

    if (this.refs.resultContent) {
      this.refs.resultContent.hidden = false;
      this.refs.resultContent.style.display = 'grid';
    }
  }

  clear() {
    this.localityWorker?.terminate();
    this.localityWorker = null;
    this.isRunning = false;
    this.result = null;

    if (this.refs.localityDGTable) this.refs.localityDGTable.innerHTML = '';
    if (this.refs.localityDPTable) this.refs.localityDPTable.innerHTML = '';

    if (this.refs.localityRep) this.refs.localityRep.textContent = '—';
    if (this.refs.localityVertices) this.refs.localityVertices.textContent = '—';
    if (this.refs.localityMutType) this.refs.localityMutType.textContent = '—';
    if (this.refs.localityMutParams) this.refs.localityMutParams.textContent = '—';
    if (this.refs.localityRequestedSamples) this.refs.localityRequestedSamples.textContent = '—';
    if (this.refs.localityValidSamples) this.refs.localityValidSamples.textContent = '—';
    if (this.refs.localitySkippedSamples) this.refs.localitySkippedSamples.textContent = '—';

    this.syncUI();
    this.setBusy(false);
  }
  destroy() {
    this.localityWorker?.terminate();
    this.localityWorker = null;
    this.container.removeEventListener('input', this._boundOnInput);
    this.container.removeEventListener('change', this._boundOnChange);
    this.container.removeEventListener('click', this._boundOnClick);
    this.container.innerHTML = '';
  }
}