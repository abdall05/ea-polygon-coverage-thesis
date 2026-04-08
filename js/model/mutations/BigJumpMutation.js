// BigJumpMutation.js
import { BaseMutation } from './BaseMutation.js';

export class BigJumpMutation extends BaseMutation {
  type = "BigJumpMutation";
  constructor(params = {}, rng = null) {
    super({ jumpSize: 0.5, ...params }, rng = null);
  }

  applyCartesian(ind) {
    // Will implement later
  }

  applyPolar(ind) {
    // Will implement later
  }
}