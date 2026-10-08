const router = require('express').Router();
const crypto = require('crypto');
const mongoose = require('mongoose');
const { requireAuth } = require('../middleware/auth');
const User = require('../models/User');
const Friendship = require('../models/Friendship');
const Squad = require('../models/Squad');
const SkillNode = require('../models/SkillNode');

router.use(requireAuth);

const areFriends = (a, b) => Friendship.exists({
  status: 'accepted',
  $or: [{ from: a, to: b }, { from: b, to: a }]
});

// ---- Friends ----
router.post('/friends/request', async (req, res, next) => {
  try {
    const friend = await User.findOne({ email: (req.body.email || '').toLowerCase() });
    if (!friend) return res.status(404).json({ error: 'No user with that email' });
    if (String(friend._id) === req.user.id) return res.status(400).json({ error: "You can't add yourself" });
    const existing = await Friendship.exists({ $or: [
      { from: req.user.id, to: friend._id }, { from: friend._id, to: req.user.id }] });
    if (existing) return res.status(409).json({ error: 'Already friends or request pending' });
    await Friendship.create({ from: req.user.id, to: friend._id });
    res.status(201).json({ ok: true });
  } catch (e) { next(e); }
});

router.get('/friends', async (req, res, next) => {
  try {
    const rows = await Friendship.find({ $or: [{ from: req.user.id }, { to: req.user.id }] })
      .populate('from to', 'name xp streak');
    const me = req.user.id;
    const friends = rows.filter(r => r.status === 'accepted').map(r => {
      const o = String(r.from._id) === me ? r.to : r.from;
      return { id: o._id, name: o.name, xp: o.xp, streak: o.streak };
    });
    const incoming = rows.filter(r => r.status === 'pending' && String(r.to._id) === me)
      .map(r => ({ id: r._id, name: r.from.name }));
    const outgoing = rows.filter(r => r.status === 'pending' && String(r.from._id) === me).length;
    res.json({ friends, incoming, outgoing });
  } catch (e) { next(e); }
});

router.post('/friends/:id/accept', async (req, res, next) => {
  try {
    const f = await Friendship.findOne({ _id: req.params.id, to: req.user.id, status: 'pending' });
    if (!f) return res.status(404).json({ error: 'Request not found' });
    f.status = 'accepted'; await f.save();
    res.json({ ok: true });
  } catch (e) { next(e); }
});

// ---- Skill-tree comparison with a friend (matched by topic name) ----
router.get('/compare/:friendId', async (req, res, next) => {
  try {
    if (!(await areFriends(req.user.id, req.params.friendId))) return res.status(403).json({ error: 'Not friends' });
    const avg = (uid) => SkillNode.aggregate([
      { $match: { user: new mongoose.Types.ObjectId(uid) } },
      { $group: { _id: '$topic', mastery: { $avg: '$mastery' } } }
    ]);
    const [mine, theirs] = await Promise.all([avg(req.user.id), avg(req.params.friendId)]);
    const map = new Map();
    mine.forEach(n => map.set(n._id, { topic: n._id, me: n.mastery, friend: null }));
    theirs.forEach(n => map.set(n._id, { ...(map.get(n._id) || { topic: n._id, me: null }), friend: n.mastery }));
    res.json([...map.values()].sort((a, b) => a.topic.localeCompare(b.topic)));
  } catch (e) { next(e); }
});

// ---- Study squads ----
router.get('/squads', async (req, res, next) => {
  try {
    const squads = await Squad.find({ members: req.user.id }).populate('members', 'name xp');
    res.json(squads.map(s => ({
      id: s._id, name: s.name, code: s.code,
      members: s.members.map(m => ({ id: m._id, name: m.name, xp: m.xp })).sort((a, b) => b.xp - a.xp),
      totalXp: s.members.reduce((t, m) => t + m.xp, 0)
    })));
  } catch (e) { next(e); }
});

router.post('/squads', async (req, res, next) => {
  try {
    const name = (req.body.name || '').trim();
    if (!name) return res.status(400).json({ error: 'Squad name required' });
    const squad = await Squad.create({
      name, owner: req.user.id, members: [req.user.id],
      code: crypto.randomBytes(3).toString('hex').toUpperCase()
    });
    res.status(201).json({ id: squad._id, code: squad.code });
  } catch (e) { next(e); }
});

router.post('/squads/join', async (req, res, next) => {
  try {
    const squad = await Squad.findOne({ code: (req.body.code || '').toUpperCase() });
    if (!squad) return res.status(404).json({ error: 'Invalid squad code' });
    if (squad.members.length >= 20) return res.status(400).json({ error: 'Squad is full' });
    await Squad.updateOne({ _id: squad._id }, { $addToSet: { members: req.user.id } });
    res.json({ ok: true });
  } catch (e) { next(e); }
});

// ---- Leaderboard ----
router.get('/leaderboard', async (req, res, next) => {
  try {
    res.json(await User.find({ role: 'student' }).sort('-xp').limit(10).select('name xp streak'));
  } catch (e) { next(e); }
});

module.exports = router;
