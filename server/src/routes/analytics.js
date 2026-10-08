const router = require('express').Router();
const { requireAuth, requireRole } = require('../middleware/auth');
const User = require('../models/User');
const Attempt = require('../models/Attempt');
const SkillNode = require('../models/SkillNode');

// Class-wide analytics for instructors (all students on the platform).
router.get('/overview', requireAuth, requireRole('instructor', 'admin'), async (req, res, next) => {
  try {
    const since = new Date(Date.now() - 7 * 864e5);
    const [students, attempts, correct, weekAttempts, weakest, top] = await Promise.all([
      User.countDocuments({ role: 'student' }),
      Attempt.countDocuments(),
      Attempt.countDocuments({ correct: true }),
      Attempt.countDocuments({ createdAt: { $gte: since } }),
      SkillNode.aggregate([
        { $match: { attempts: { $gt: 0 } } },
        { $group: { _id: '$topic', avgMastery: { $avg: '$mastery' }, learners: { $sum: 1 } } },
        { $sort: { avgMastery: 1 } }, { $limit: 8 }
      ]),
      User.find({ role: 'student' }).sort('-xp').limit(5).select('name xp streak')
    ]);
    res.json({
      students, attempts, weekAttempts,
      accuracy: attempts ? correct / attempts : 0,
      weakestTopics: weakest.map(w => ({ topic: w._id, avgMastery: w.avgMastery, learners: w.learners })),
      topStudents: top
    });
  } catch (e) { next(e); }
});

module.exports = router;
