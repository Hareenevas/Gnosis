// Real-time 1v1 Duel and Co-op rooms (Socket.io).
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const Material = require('../models/Material');
const Question = require('../models/Question');
const User = require('../models/User');
const badges = require('./badges');

const rooms = new Map();
const QCOUNT = 8;
const Q_TIME = Number(process.env.ROOM_Q_TIME_MS || 20000);
const REVEAL = Number(process.env.ROOM_REVEAL_MS || 3500);
const MAX = { duel: 2, coop: 4 };

const genCode = () => {
  let c; do { c = Math.random().toString(36).slice(2, 6).toUpperCase(); } while (rooms.has(c));
  return c;
};

const pub = (r) => ({
  code: r.code, mode: r.mode, host: r.host, state: r.state, teamScore: r.teamScore,
  players: [...r.players.values()].map(p => ({ id: p.id, name: p.name, score: p.score }))
});

module.exports = (io) => {
  io.use((socket, next) => {
    try { socket.user = jwt.verify(socket.handshake.auth?.token, process.env.JWT_SECRET); next(); }
    catch { next(new Error('Unauthorized')); }
  });

  const sendQuestion = (r) => {
    r.round = new Map(); r.revealing = false;
    const q = r.questions[r.index];
    r.deadline = Date.now() + Q_TIME;
    io.to(r.code).emit('question', {
      index: r.index, total: r.questions.length, text: q.text, options: q.options,
      topic: q.topic, difficulty: q.difficulty, deadline: r.deadline
    });
    r.timer = setTimeout(() => reveal(r), Q_TIME);
  };

  const reveal = (r) => {
    if (r.revealing || r.state !== 'playing') return;
    r.revealing = true; clearTimeout(r.timer);
    const q = r.questions[r.index];
    io.to(r.code).emit('room:update', pub(r));
    io.to(r.code).emit('reveal', {
      correctIndex: q.answerIndex, explanation: q.explanation,
      results: [...r.players.values()].map(p => ({ id: p.id, ...(r.round.get(p.id) || { choice: null, correct: false, gained: 0 }) }))
    });
    setTimeout(() => {
      if (!rooms.has(r.code) || r.state !== 'playing') return;
      r.index += 1;
      r.index >= r.questions.length ? finish(r) : sendQuestion(r);
    }, REVEAL);
  };

  const finish = async (r) => {
    if (r.state === 'over') return;
    r.state = 'over'; clearTimeout(r.timer);
    const players = [...r.players.values()];
    let winnerId = null;
    if (r.mode === 'duel' && players.length === 2 && players[0].score !== players[1].score) {
      winnerId = players[0].score > players[1].score ? players[0].id : players[1].id;
    }
    const xp = {};
    for (const p of players) {
      xp[p.id] = Math.round((r.mode === 'coop' ? r.teamScore : p.score) / 10) + (p.id === winnerId ? 30 : 0);
      try {
        await User.findByIdAndUpdate(p.id, { $inc: { xp: xp[p.id] } });
        await badges.award(p.id, p.id === winnerId ? ['duelist'] : r.mode === 'coop' ? ['team-player'] : []);
      } catch (e) { console.error('room award failed', e.message); }
    }
    io.to(r.code).emit('room:update', pub(r));
    io.to(r.code).emit('game:over', { mode: r.mode, winnerId, teamScore: r.teamScore, xp, players: pub(r).players });
    setTimeout(() => rooms.delete(r.code), 60000);
  };

  const leave = (socket) => {
    const code = socket.data.room; if (!code) return;
    socket.data.room = null; socket.leave(code);
    const r = rooms.get(code); if (!r) return;
    r.players.delete(socket.user.id);
    if (r.state === 'lobby' && r.host === socket.user.id) {
      io.to(code).emit('room:closed'); rooms.delete(code); return;
    }
    if (!r.players.size) { clearTimeout(r.timer); rooms.delete(code); return; }
    if (r.state === 'playing' && r.players.size < 2 && r.mode === 'duel') return finish(r);
    io.to(code).emit('room:update', pub(r));
    if (r.state === 'playing' && [...r.players.keys()].every(id => r.round.has(id))) reveal(r);
  };

  io.on('connection', (socket) => {
    const uid = socket.user.id;

    socket.on('room:create', async ({ materialId, mode } = {}, ack = () => {}) => {
      try {
        if (!MAX[mode]) return ack({ error: 'Invalid mode' });
        const mat = await Material.findOne({ _id: materialId, owner: uid });
        if (!mat) return ack({ error: 'Material not found' });
        if ((await Question.countDocuments({ material: materialId })) < 4) return ack({ error: 'Generate the quiz first' });
        const me = await User.findById(uid).select('name');
        leave(socket);
        const r = { code: genCode(), mode, materialId, host: uid, state: 'lobby', teamScore: 0,
          players: new Map([[uid, { id: uid, name: me.name, score: 0 }]]), questions: [], index: 0, round: new Map() };
        rooms.set(r.code, r); socket.join(r.code); socket.data.room = r.code;
        ack({ code: r.code }); io.to(r.code).emit('room:update', pub(r));
      } catch (e) { ack({ error: e.message }); }
    });

    socket.on('room:join', async ({ code } = {}, ack = () => {}) => {
      try {
        const r = rooms.get(String(code || '').toUpperCase());
        if (!r) return ack({ error: 'Room not found' });
        if (r.state !== 'lobby') return ack({ error: 'Game already started' });
        if (r.players.size >= MAX[r.mode] && !r.players.has(uid)) return ack({ error: 'Room is full' });
        const me = await User.findById(uid).select('name');
        leave(socket);
        r.players.set(uid, { id: uid, name: me.name, score: 0 });
        socket.join(r.code); socket.data.room = r.code;
        ack({ code: r.code }); io.to(r.code).emit('room:update', pub(r));
      } catch (e) { ack({ error: e.message }); }
    });

    socket.on('room:start', async (_, ack = () => {}) => {
      try {
        const r = rooms.get(socket.data.room);
        if (!r || r.host !== uid) return ack({ error: 'Only the host can start' });
        if (r.state !== 'lobby') return ack({ error: 'Already started' });
        if (r.players.size < 2) return ack({ error: 'Need at least 2 players' });
        r.questions = await Question.aggregate([
          { $match: { material: new mongoose.Types.ObjectId(r.materialId) } }, { $sample: { size: QCOUNT } }]);
        r.state = 'playing'; r.index = 0;
        ack({ ok: true }); io.to(r.code).emit('room:update', pub(r)); sendQuestion(r);
      } catch (e) { ack({ error: e.message }); }
    });

    socket.on('answer', ({ choice } = {}) => {
      const r = rooms.get(socket.data.room);
      if (!r || r.state !== 'playing' || r.revealing || r.round.has(uid) || !r.players.has(uid)) return;
      const q = r.questions[r.index];
      const correct = choice === q.answerIndex;
      const left = Math.max(0, r.deadline - Date.now());
      const gained = correct ? 100 + Math.round(50 * left / Q_TIME) : 0;
      r.round.set(uid, { choice, correct, gained });
      if (r.mode === 'coop') r.teamScore += gained; else r.players.get(uid).score += gained;
      io.to(r.code).emit('player:answered', { id: uid });
      if ([...r.players.keys()].every(id => r.round.has(id))) reveal(r);
    });

    socket.on('room:leave', () => leave(socket));
    socket.on('disconnect', () => leave(socket));
  });
};
