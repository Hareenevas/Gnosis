const { GoogleGenerativeAI } = require('@google/generative-ai');

const DEFAULT_MODELS = ['gemini-3.5-flash-lite', 'gemini-3.5-flash', 'gemini-2.5-flash', 'gemini-2.5-flash-lite'];
const PREFERRED_MODELS = Array.from(new Set([
  (process.env.LLM_MODEL || DEFAULT_MODELS[0]).replace(/^models\//, '').trim(),
  ...DEFAULT_MODELS
].filter(Boolean)));
const MODEL = PREFERRED_MODELS[0];
const API_KEY = process.env.GEMINI_API_KEY;

exports.PREFERRED_MODELS = PREFERRED_MODELS;

const genAI = API_KEY ? new GoogleGenerativeAI(API_KEY) : null;

const clip = (t, n = 12000) => (typeof t === 'string' ? t.slice(0, n) : '');

function ensureGeminiConfigured() {
  if (!API_KEY || !API_KEY.trim()) {
    throw new Error('GEMINI_API_KEY is missing. Add a valid Google AI Studio API key to server/.env.');
  }
  if (!genAI) {
    throw new Error('Gemini client was not initialized. Check the server environment.');
  }
}

async function askJson(prompt, maxTokens = 4000, retries = 3) {
  ensureGeminiConfigured();

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    for (const currentModel of PREFERRED_MODELS) {
      try {
        const model = genAI.getGenerativeModel({
          model: currentModel,
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: maxTokens,
            responseMimeType: 'application/json'
          }
        });

        const result = await model.generateContent(
          prompt + '\n\nReturn ONLY valid JSON. No markdown fences, no commentary.'
        );

        const text = result.response.text();

        try {
          return JSON.parse(text.replace(/```json|```/g, '').trim());
        } catch (error) {
          console.error('Gemini returned invalid JSON:', text);
          throw new Error('AI returned invalid JSON. Please retry.');
        }
      } catch (error) {
        const message = error && error.message ? error.message : String(error);
        const status = Number(error?.status ?? error?.details?.status ?? error?.response?.status ?? 0);
        const isModelUnavailable = [404, 410].includes(status) || /model.*not found|not available|no longer available|unsupported model|invalid model/i.test(message);
        const isRetryable = [408, 429, 500, 502, 503, 504].includes(status) || /high demand|temporar|rate limit|unavailable|resource exhausted/i.test(message);

        if (!isRetryable && !isModelUnavailable) throw error;

        if (currentModel !== PREFERRED_MODELS[PREFERRED_MODELS.length - 1]) {
          console.warn(`Gemini model ${currentModel} is unavailable or overloaded; falling back to the next model...`);
          continue;
        }

        if (attempt >= retries && !isModelUnavailable) throw error;
        if (attempt >= retries && isModelUnavailable) {
          throw new Error(`No usable Gemini model was available. Try updating LLM_MODEL to a newer supported model. Last error: ${message}`);
        }

        const delayMs = 1000 * (attempt + 1);
        console.warn(`Gemini rate limited. Retrying in ${delayMs}ms (${attempt + 1}/${retries})...`);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }
}

const validQ = (q) =>
  q &&
  q.text &&
  Array.isArray(q.options) &&
  q.options.length === 4 &&
  Number.isInteger(q.answerIndex) &&
  q.answerIndex >= 0 &&
  q.answerIndex <= 3;

exports.extractTopics = async (text) => {
  const out = await askJson(
    `From the study material below, list 5-8 distinct core topics a student must master, as short names.
Format: {"topics": ["...", "..."]}

MATERIAL:
${clip(text)}`,
    800
  );

  return (out.topics || []).slice(0, 8);
};

exports.generateQuestions = async (text, topic) => {
  const safeText = clip(text || '');
  if (!safeText.trim()) {
    throw new Error('No readable material text was found in the uploaded PDF. Please upload a valid PDF or text file with actual content.');
  }

  const out = await askJson(
    `Generate quiz questions ONLY from the uploaded material below.
Use the material as the source of truth. Do not invent facts, general knowledge, or unrelated examples.

Topic to target: "${topic}"

Requirements:
- Write exactly 6 multiple-choice questions.
- Exactly 2 questions per difficulty: 1, 2, and 3.
- Each question must be answerable from the material.
- Each question has exactly 4 options, one correct answer, and a one-sentence explanation.
- The explanation must mention how the answer is supported by the uploaded material.

Return JSON only in this exact format:
{"questions":[{"difficulty":1,"text":"...","options":["a","b","c","d"],"answerIndex":0,"explanation":"..."}]}

UPLOADED MATERIAL:
${safeText}`,
    4000
  );

  return (out.questions || []).filter(
    (q) => validQ(q) && [1, 2, 3].includes(q.difficulty)
  );
};

exports.studyContent = async (text) => {
  const out = await askJson(
    `Create study aids from the material below.

- "summary": 150-220 words, plain prose.
- "flashcards": exactly 10 cards {"front": question or term, "back": concise answer}.
- "mindmap": {"root": "central idea", "branches": [{"label": "...", "children": ["...", "..."]}]}
  with 4-6 branches and 2-4 short children each (max 4 words per label).

Format:
{"summary":"...","flashcards":[...],"mindmap":{...}}

MATERIAL:
${clip(text)}`,
    4000
  );

  if (
    typeof out.summary !== 'string' ||
    !Array.isArray(out.flashcards) ||
    !out.mindmap?.branches
  ) {
    throw new Error('AI returned an unexpected format, please retry');
  }

  return out;
};

exports.keyTerms = async (text) => {
  const out = await askJson(
    `From the material below extract 24 key terms a student should know and be able to SAY aloud.

Each term must be 1-3 words.

For each give:
- a one-sentence definition
- the topic it belongs to
- a level:
  "starting" (basic)
  "intermediate"
  "pro" (advanced/harder to pronounce)

Mix the levels.

Also give 15 "distractors": plausible-sounding terms from the same general field that do NOT appear in the material.

Format:
{"terms":[{"term":"","definition":"","topic":"","level":"starting"}],"distractors":["",""]}

MATERIAL:
${clip(text)}`,
    4000
  );

  const terms = (out.terms || [])
    .filter(
      (t) =>
        t.term &&
        t.definition &&
        t.term.length <= 40
    )
    .map((t) => ({
      ...t,
      level: ['starting', 'intermediate', 'pro'].includes(t.level)
        ? t.level
        : 'intermediate'
    }));

  if (terms.length < 6) {
    throw new Error('Could not extract enough terms from this material');
  }

  return {
    terms,
    distractors: (out.distractors || []).filter(
      (d) => typeof d === 'string' && d.length <= 40
    )
  };
};

exports.story = async (text, topics) => {
  const out = await askJson(
    `Turn the material below into a 5-chapter learning adventure.

Each chapter has:
- a 2-3 sentence story beat that sets up a challenge
- one multiple-choice question testing the material
- exactly 4 options

Cover these topics where possible:
${topics.join(', ')}

Format:
{"title":"...","chapters":[{"narrative":"...","topic":"...","question":{"text":"...","options":["","","",""],"answerIndex":0,"explanation":"..."}}]}

MATERIAL:
${clip(text)}`,
    4000
  );

  const chapters = (out.chapters || []).filter(
    (c) => c.narrative && validQ(c.question)
  );

  if (chapters.length < 3) {
    throw new Error('Could not build a story from this material');
  }

  return {
    title: out.title || 'The Quest',
    chapters
  };
};

exports.chat = async (system, messages) => {
  ensureGeminiConfigured();
  const model = genAI.getGenerativeModel({
    model: MODEL,
    systemInstruction: system,
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 800
    }
  });

  const history = messages
    .slice(0, -1)
    .map((message) => ({
      role: message.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: message.content }]
    }));

  const lastMessage = messages[messages.length - 1];

  const chat = model.startChat({
    history
  });

  const result = await chat.sendMessage(lastMessage.content);

  return result.response.text();
};