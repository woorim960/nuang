export const feedCodeStatsDisplayThreshold = 1;

// G00-D06: feed_poll_vote rows do not carry trusted release provenance.
// Keep aggregate poll results available, but fail closed at every UI boundary
// until the vote schema can bind a code to an allowlisted release bundle.
export const feedCodeStatsEnabled = false;
