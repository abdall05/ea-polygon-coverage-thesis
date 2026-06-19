import { TournamentSelection } from "./TournamentSelection.js";
import { RankSelection } from "./RankSelection.js";
import { TruncationSelection } from "./TruncationSelection.js";
import { SELECTION_TYPES } from "./selectionConfig.js";

export class SelectionFactory {
  static create(type, params = {}, rng = null) {
    switch (type) {
      case SELECTION_TYPES.TOURNAMENT:
        return new TournamentSelection(params, rng);

      case SELECTION_TYPES.RANK:
        return new RankSelection(params, rng);

      case SELECTION_TYPES.TRUNCATION:
        return new TruncationSelection(params, rng);

      default:
        throw new Error(`Unknown selection type: ${type}`);
    }
  }
}