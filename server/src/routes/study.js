const router = require('express').Router();
const { requireAuth } = require('../middleware/auth');
const Material = require('../models/Material');
const llm = require('../services/llm');

router.use(requireAuth);

const view = (m) => ({
  id: m._id, title: m.title, topics: m.topics, summary: m.summary,
  flashcards: m.flashcards, mindmap: m.mindmap, terms: m.terms,
  distractors: m.distractors, story: m.story
});

const own = async (req, res) => {
  const m = await Material.findOne({ _id: req.params.id, owner: req.user.id });
  if (!m) res.status(404).json({ error: 'Material not found' });
  return m;
};

router.get('/:id', async (req, res, next) => {
  try { const m = await own(req, res); if (m) res.json(view(m)); } catch (e) { next(e); }
});

router.post('/:id/content', async (req, res, next) => {
  try {
    const m = await own(req, res); if (!m) return;
    const c = await llm.studyContent(m.text);
    m.summary = c.summary; m.flashcards = c.flashcards; m.mindmap = c.mindmap;
    await m.save();
    res.json(view(m));
  } catch (e) { next(e); }
});

router.post('/:id/terms', async (req, res, next) => {
  try {
    const m = await own(req, res); if (!m) return;
    const t = await llm.keyTerms(m.text);
    m.terms = t.terms; m.distractors = t.distractors;
    await m.save();
    res.json(view(m));
  } catch (e) { next(e); }
});

router.post('/:id/story', async (req, res, next) => {
  try {
    const m = await own(req, res); if (!m) return;
    m.story = await llm.story(m.text, m.topics);
    await m.save();
    res.json(view(m));
  } catch (e) { next(e); }
});

module.exports = router;
