const router = require('express').Router();
const { requireAuth } = require('../middleware/auth');
const User = require('../models/User');
const SkillNode = require('../models/SkillNode');
const badges = require('../services/badges');

const GAMES = ['termdash', 'boss', 'story', 'voice'];
const topicsOf = (a) => (Array.isArray(a) ? a : []).filter(t => typeof t === 'string').slice(0, 40);

// Game outcomes award XP and nudge the skill-tree mastery of the topics involved.
router.post('/result', requireAuth, async (req, res, next) => {
  try {
    const { materialId, game, score = 0, correctTopics, wrongTopics, won = false } = req.body;
    if (!GAMES.includes(game)) return res.status(400).json({ error: 'Unknown game' });
    const gained = Math.max(0, Math.min(300, Math.round(Number(score) || 0)));
    const user = await User.findByIdAndUpdate(req.user.id, { $inc: { xp: gained } }, { new: true });

    const nudge = (topic, d) => SkillNode.updateOne(
      { user: req.user.id, material: materialId, topic },
      [{ $set: { mastery: { $min: [1, { $max: [0, { $add: ['$mastery', d] }] }] } } }]
    );
    await Promise.all([
      ...topicsOf(correctTopics).map(t => nudge(t, 0.03)),
      ...topicsOf(wrongTopics).map(t => nudge(t, -0.04))
    ]);
    await badges.award(req.user.id, game === 'boss' && won ? ['boss-slayer'] : []);
    res.json({ gained, xp: user.xp });
  } catch (e) { next(e); }
});

module.exports = router;
