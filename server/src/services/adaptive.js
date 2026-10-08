// Adaptive logic: mastery (0..1) per topic -> target difficulty (1..3)
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

exports.targetDifficulty = (mastery) => (mastery < 0.4 ? 1 : mastery < 0.75 ? 2 : 3);

// Elo-style update: surprise (actual - expected) moves mastery
exports.updateMastery = (mastery, difficulty, correct) => {
  const expected = 1 / (1 + Math.exp(-(mastery * 3 + 0.5 - difficulty) * 1.5));
  const K = 0.12;
  return clamp(mastery + K * ((correct ? 1 : 0) - expected), 0, 1);
};

// Pick a topic, weighted toward weak ones
exports.pickTopic = (nodes) => {
  const weights = nodes.map(n => 1 - n.mastery + 0.1);
  let r = Math.random() * weights.reduce((a, b) => a + b, 0);
  for (let i = 0; i < nodes.length; i++) { r -= weights[i]; if (r <= 0) return nodes[i]; }
  return nodes[nodes.length - 1];
};
