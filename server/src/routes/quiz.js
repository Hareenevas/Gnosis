const router = require('express').Router();
const { requireAuth } = require('../middleware/auth');
const Question = require('../models/Question');
const Attempt = require('../models/Attempt');
const SkillNode = require('../models/SkillNode');
const User = require('../models/User');
const adaptive = require('../services/adaptive');

// Next adaptive question (never leaks the answer)
router.get('/next/:materialId', requireAuth, async (req, res, next) => {
  try {
    const { materialId } = req.params;
    const nodes = await SkillNode.find({ user: req.user.id, material: materialId });
    if (!nodes.length) return res.status(404).json({ error: 'No skill nodes for this material' });

    const seen = (await Attempt.find({ user: req.user.id, material: materialId }).select('question')).map(a => a.question);
    const node = adaptive.pickTopic(nodes);
    const diff = adaptive.targetDifficulty(node.mastery);

    // Preference: unseen at target difficulty -> unseen any difficulty in topic -> any unseen
    const tries = [
      { topic: node.topic, difficulty: diff, _id: { $nin: seen } },
      { topic: node.topic, _id: { $nin: seen } },
      { _id: { $nin: seen } }
    ];
    let q = null;
    for (const t of tries) {
      const found = await Question.aggregate([{ $match: { material: node.material, ...t } }, { $sample: { size: 1 } }]);
      if (found[0]) { q = found[0]; break; }
    }
    if (!q) return res.json({ done: true });
    res.json({ id: q._id, topic: q.topic, difficulty: q.difficulty, text: q.text, options: q.options });
  } catch (e) { next(e); }
});

// Submit answer -> record, update mastery + XP
router.post('/answer', requireAuth, async (req, res, next) => {
  try {
    const { questionId, selectedIndex, timeMs } = req.body;
    const q = await Question.findById(questionId);
    if (!q) return res.status(404).json({ error: 'Question not found' });

    const correct = selectedIndex === q.answerIndex;
    await Attempt.create({ user: req.user.id, question: q._id, material: q.material, selectedIndex, correct, timeMs });

    const node = await SkillNode.findOne({ user: req.user.id, material: q.material, topic: q.topic });
    node.mastery = adaptive.updateMastery(node.mastery, q.difficulty, correct);
    node.attempts += 1;
    if (correct) node.correct += 1;
    await node.save();

    const user = await User.findById(req.user.id);
    if (correct) user.xp += 10 * q.difficulty;
    const today = new Date().toISOString().slice(0, 10);
    if (user.lastActiveDay !== today) {
      const yesterday = new Date(Date.now() - 864e5).toISOString().slice(0, 10);
      user.streak = user.lastActiveDay === yesterday ? user.streak + 1 : 1;
      user.lastActiveDay = today;
    }
    await user.save();

    res.json({
      correct, correctIndex: q.answerIndex, explanation: q.explanation,
      mastery: node.mastery, topic: q.topic, xp: user.xp, streak: user.streak
    });
  } catch (e) { next(e); }
});

module.exports = router;
