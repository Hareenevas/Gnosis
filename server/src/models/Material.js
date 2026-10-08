const { Schema, model } = require('mongoose');
module.exports = model('Material', new Schema({
  owner: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  title: String,
  text: { type: String, required: true },
  topics: [String],
  summary: String,
  flashcards: [{ front: String, back: String }],
  mindmap: Schema.Types.Mixed,
  terms: [{ term: String, definition: String, topic: String, level: String }],
  distractors: [String],
  story: Schema.Types.Mixed
}, { timestamps: true }));
