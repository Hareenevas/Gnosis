const router = require('express').Router();
const { requireAuth } = require('../middleware/auth');
const Material = require('../models/Material');
const llm = require('../services/llm');

// RAG-lite: split notes into chunks, rank by keyword overlap, send the best few to the LLM
const chunk = (text, size = 900) => {
  const paras = text.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);
  const out = []; let cur = '';
  for (const p of paras) {
    if ((cur + p).length > size && cur) { out.push(cur); cur = ''; }
    cur += (cur ? '\n' : '') + p;
  }
  if (cur) out.push(cur);
  return out;
};
const words = (s) => (s.toLowerCase().match(/[a-z0-9]{3,}/g) || []);

router.post('/:materialId', requireAuth, async (req, res, next) => {
  try {
    const { message, history = [] } = req.body;
    if (!message || typeof message !== 'string') return res.status(400).json({ error: 'Message required' });
    const m = await Material.findOne({ _id: req.params.materialId, owner: req.user.id });
    if (!m) return res.status(404).json({ error: 'Material not found' });

    const q = new Set(words(message));
    const top = chunk(m.text)
      .map(c => ({ c, score: words(c).filter(w => q.has(w)).length }))
      .sort((a, b) => b.score - a.score).slice(0, 4).map(x => x.c);

    const system = `You are Gnosis, a friendly tutor. Answer using ONLY the study excerpts below.
If the excerpts don't cover the question, say so and offer a short general hint. Be concise.

EXCERPTS:
${top.join('\n---\n')}`;

    const past = history.slice(-8)
      .filter(h => (h.role === 'user' || h.role === 'assistant') && typeof h.content === 'string');
    while (past.length && past[0].role !== 'user') past.shift();
    const msgs = [];
    for (const h of past) if (!msgs.length || msgs[msgs.length - 1].role !== h.role) msgs.push({ role: h.role, content: h.content });
    if (msgs.length && msgs[msgs.length - 1].role === 'user') msgs.pop();
    msgs.push({ role: 'user', content: message });

    res.json({ reply: await llm.chat(system, msgs) });
  } catch (e) { next(e); }
});

module.exports = router;
