const router = require('express').Router();
const { requireAuth } = require('../middleware/auth');
const SkillNode = require('../models/SkillNode');

// Data for the skill-tree UI. Status buckets drive node colours.
router.get('/:materialId', requireAuth, async (req, res, next) => {
  try {
    const nodes = await SkillNode.find({ user: req.user.id, material: req.params.materialId });
    res.json(nodes.map(n => ({
      topic: n.topic, mastery: n.mastery, attempts: n.attempts,
      status: n.attempts === 0 ? 'locked' : n.mastery < 0.4 ? 'weak' : n.mastery < 0.75 ? 'learning' : 'mastered'
    })));
  } catch (e) { next(e); }
});

module.exports = router;
