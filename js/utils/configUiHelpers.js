export function paramsToDefaults(params = {}) {
  return Object.fromEntries(
    Object.entries(params).map(([key, meta]) => [key, meta.default])
  );
}

export function renderOptions(options = [], selectedValue = null) {
  return options.map(opt => {
    const item = typeof opt === 'string'
      ? { value: opt, label: opt }
      : opt;

    const selected = item.value === selectedValue ? ' selected' : '';
    return `<option value="${item.value}"${selected}>${item.label}</option>`;
  }).join('');
}

function normalizeNumber(value, meta, { integer = false } = {}) {
  const raw = String(value ?? '').trim();
  const parsed = Number(raw);

  if (raw === '' || !Number.isFinite(parsed)) {
    return {
      valid: false,
      value: meta.default,
      message: `${meta.label} is invalid. Reset to default ${meta.default}.`
    };
  }

  if (integer && !Number.isInteger(parsed)) {
    return {
      valid: false,
      value: meta.default,
      message: `${meta.label} must be an integer. Reset to default ${meta.default}.`
    };
  }

  if (meta.min !== undefined && parsed < meta.min) {
    return {
      valid: false,
      value: meta.default,
      message: `${meta.label} must be at least ${meta.min}. Reset to default ${meta.default}.`
    };
  }

  if (meta.max !== undefined && parsed > meta.max) {
    return {
      valid: false,
      value: meta.default,
      message: `${meta.label} must be at most ${meta.max}. Reset to default ${meta.default}.`
    };
  }

  return {
    valid: true,
    value: parsed,
    message: ''
  };
}

function showFieldError(input, message) {
  clearFieldError(input);

  input.classList.add('input-invalid');

  const error = document.createElement('div');
  error.className = 'field-error-popup';
  error.textContent = message;
  error.dataset.forInput = input.id;

  const control = input.parentElement;
  control?.appendChild(error);
}

function clearFieldError(input) {
  input.classList.remove('input-invalid');

  const control = input.parentElement;
  const error = control?.querySelector('.field-error-popup');
  if (error) error.remove();
}

function applyInputValidationResult(input, result) {
  if (!result.valid) {
    showFieldError(input, result.message);
    input.value = String(result.value);
    input.dataset.correctedToDefault = 'true';
    input.setCustomValidity('');
    return result.value;
  }

  clearFieldError(input);
  input.value = String(result.value);
  input.dataset.correctedToDefault = 'false';
  input.setCustomValidity('');
  return result.value;
}

export function parseIntInput(input, fallback = 0, meta = null) {
  const cfg = {
    label: 'Value',
    default: fallback,
    ...(meta ?? {})
  };

  if (cfg.default === undefined) {
    cfg.default = fallback;
  }

  return applyInputValidationResult(
    input,
    normalizeNumber(input.value, cfg, { integer: true })
  );
}

export function parseFloatInput(input, fallback = 0, meta = null) {
  const cfg = {
    label: 'Value',
    default: fallback,
    ...(meta ?? {})
  };

  if (cfg.default === undefined) {
    cfg.default = fallback;
  }

  return applyInputValidationResult(
    input,
    normalizeNumber(input.value, cfg, { integer: false })
  );
}

export function validateNumberInputsBeforeAction(
  root,
  syncInput,
  {
    selector = 'input[type="number"]:not(:disabled)',
    message = 'Some invalid inputs were reset to their default values. Please review them and click Run again.'
  } = {}
) {
  const correctedInputs = [];

  const numberInputs = root.querySelectorAll(selector);

  numberInputs.forEach(input => {
    // Important: if the change event already corrected this input,
    // do not erase that information.
    if (input.dataset.correctedToDefault === 'true') {
      correctedInputs.push(input);
      return;
    }

    syncInput(input);

    if (input.dataset.correctedToDefault === 'true') {
      correctedInputs.push(input);
    }
  });

  if (correctedInputs.length > 0) {
    alert(message);

    // Mark as reviewed so the next Run click can continue
    // after the user has seen the corrected values.
    correctedInputs.forEach(input => {
      input.dataset.correctedToDefault = 'reviewed';
    });

    correctedInputs[0]?.focus();
    return false;
  }

  return true;
}

export function renderParamInputs(container, definition, values, idPrefix) {
  if (!container) return;

  const params = definition?.params ?? {};
  const entries = Object.entries(params);



  container.innerHTML = entries.map(([key, meta]) => {
    const value = values?.[key] ?? meta.default;

    const minAttr = meta.min !== undefined ? ` min="${meta.min}"` : '';
    const maxAttr = meta.max !== undefined ? ` max="${meta.max}"` : '';
    const stepAttr = meta.step !== undefined ? ` step="${meta.step}"` : ' step="any"';

    return `
  <div class="param-row">
    <label for="${idPrefix}-param-${key}">${meta.label}:</label>
    <div class="param-control">
      <input
        id="${idPrefix}-param-${key}"
        type="number"
        value="${value}"
        ${minAttr}
        ${maxAttr}
        ${stepAttr}
      >
    </div>
  </div>
`;
  }).join('');
}