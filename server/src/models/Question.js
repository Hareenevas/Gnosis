const { Schema, model } = require('mongoose');
module.exports = model('Question', new Schema({
  material: { type: Schema.Types.ObjectId, ref: 'Material', required: true, index: true },
  topic: { type: String, required: true },
  difficulty: { type: Number, min: 1, max: 3, required: true },
  text: { type: String, required: true },
  options: { type: [String], validate: v => v.length === 4 },
  answerIndex: { type: Number, min: 0, max: 3, required: true },
  explanation: String
}, { timestamps: true }));
