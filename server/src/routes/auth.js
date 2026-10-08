const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const sign = (u) => jwt.sign({ id: u._id, role: u.role }, process.env.JWT_SECRET, { expiresIn: '7d' });

router.post('/register', async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password || password.length < 6)
      return res.status(400).json({ error: 'Name, email and a 6+ char password required' });
    if (await User.findOne({ email })) return res.status(409).json({ error: 'Email already registered' });
    const user = await User.create({
      name, email,
      passwordHash: await bcrypt.hash(password, 10),
      role: role === 'instructor' ? 'instructor' : 'student' // admin only via DB
    });
    res.status(201).json({ token: sign(user), user: { id: user._id, name, role: user.role } });
  } catch (e) { next(e); }
});

router.post('/login', async (req, res, next) => {
  try {
    const user = await User.findOne({ email: (req.body.email || '').toLowerCase() });
    if (!user || !(await bcrypt.compare(req.body.password || '', user.passwordHash)))
      return res.status(401).json({ error: 'Invalid credentials' });
    res.json({ token: sign(user), user: { id: user._id, name: user.name, role: user.role, xp: user.xp, streak: user.streak } });
  } catch (e) { next(e); }
});

module.exports = router;
