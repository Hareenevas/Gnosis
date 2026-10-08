const router = require('express').Router();
const { requireAuth } = require('../middleware/auth');
const badges = require('../services/badges');

router.get('/', requireAuth, async (req, res, next) => {
  try {
    const u = await badges.award(req.user.id);
    res.json({
      id: u._id, name: u.name, role: u.role, xp: u.xp, streak: u.streak,
      level: Math.floor(u.xp / 100) + 1,
      badges: u.badges.map(id => ({ id, label: badges.BADGES[id] || id }))
    });
  } catch (e) { next(e); }
});

module.exports = router;
