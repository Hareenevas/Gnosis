const router = require('express').Router();
const multer = require('multer');
const pdfParse = require('pdf-parse');
const { requireAuth } = require('../middleware/auth');
const Material = require('../models/Material');
const Question = require('../models/Question');
const SkillNode = require('../models/SkillNode');
const llm = require('../services/llm');

const MAX_PDF_BYTES = 150 * 1024 * 1024;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_PDF_BYTES, files: 1 }
});

// Upload notes (PDF or .txt) -> extract text -> LLM extracts topics -> create skill-tree nodes
router.post('/', requireAuth, upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const isPdf = req.file.mimetype === 'application/pdf'
      || req.file.originalname.toLowerCase().endsWith('.pdf')
      || req.file.buffer.subarray(0, 5).toString('ascii') === '%PDF-';

    let text = '';
    if (isPdf) {
      try {
        text = (await pdfParse(req.file.buffer)).text || '';
      } catch (error) {
        throw new Error('Unable to read the uploaded PDF. Please upload a valid PDF or a text document.');
      }
    } else {
      text = req.file.buffer.toString('utf8');
    }

    const cleaned = (text || '').replace(/\s+/g, ' ').trim();
    if (cleaned.length < 80) return res.status(400).json({ error: 'Not enough readable text in file' });

    const topics = await llm.extractTopics(cleaned);
    const material = await Material.create({
      owner: req.user.id, title: req.body.title || req.file.originalname, text: cleaned, topics
    });
    await SkillNode.insertMany(topics.map(topic => ({ user: req.user.id, material: material._id, topic })));
    res.status(201).json({ id: material._id, title: material.title, topics });
  } catch (e) { next(e); }
});

// Generate question bank for every topic (run once per material)
router.post('/:id/generate-quiz', requireAuth, async (req, res, next) => {
  try {
    const material = await Material.findOne({ _id: req.params.id, owner: req.user.id });
    if (!material) return res.status(404).json({ error: 'Material not found' });

    await Question.deleteMany({ material: material._id });
    const batches = await Promise.all(material.topics.map(async (topic) => {
      try {
        const qs = await llm.generateQuestions(material.text, topic);
        return qs.map(q => ({ ...q, topic, material: material._id }));
      } catch (err) { console.error('Topic failed:', topic, err.message); return []; }
    }));
    const docs = batches.flat();
    await Question.insertMany(docs);
    res.json({ created: docs.length });
  } catch (e) { next(e); }
});

router.get('/', requireAuth, async (req, res, next) => {
  try {
    res.json(await Material.find({ owner: req.user.id }).select('title topics createdAt').sort('-createdAt'));
  } catch (e) { next(e); }
});

module.exports = router;
