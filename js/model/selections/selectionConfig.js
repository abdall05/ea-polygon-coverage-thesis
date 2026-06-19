export const SELECTION_TYPES = Object.freeze({
  TOURNAMENT: 'tournament',
  RANK: 'rank',
  TRUNCATION: 'truncation'
});

export const DEFAULT_SELECTION_TYPE = SELECTION_TYPES.TOURNAMENT;

const tournamentParams = Object.freeze({
  tournamentSize: Object.freeze({
    label: 'Tournament Size',
    default: 2,
    min: 2,
    max: 20,
    step: 1
  })
});

const rankParams = Object.freeze({
  selectivePressure: Object.freeze({
    label: 'Selective Pressure',
    default: 1.7,
    min: 1,
    max: 2,
    step: 0.01
  })
});

const truncationParams = Object.freeze({
  truncationSize: Object.freeze({
    label: 'Truncation Size',
    default: 0.5,
    min: 0.01,
    max: 1,
    step: 0.01
  })
});

export const selectionRegistry = Object.freeze({
  [SELECTION_TYPES.TOURNAMENT]: Object.freeze({
    label: 'Tournament',
    params: tournamentParams
  }),

  [SELECTION_TYPES.RANK]: Object.freeze({
    label: 'Rank',
    params: rankParams
  }),

  [SELECTION_TYPES.TRUNCATION]: Object.freeze({
    label: 'Truncation',
    params: truncationParams
  })
});

export function getSelectionTypes() {
  return Object.keys(selectionRegistry);
}

export function getSelectionDefinition(type) {
  const entry = selectionRegistry[type];
  if (!entry) return null;

  return Object.freeze({
    type,
    label: entry.label,
    params: entry.params
  });
}