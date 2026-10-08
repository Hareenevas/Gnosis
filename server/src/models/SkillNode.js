const { Schema, model } = require('mongoose');
const schema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  material: { type: Schema.Types.ObjectId, ref: 'Material', required: true },
  topic: { type: String, required: true },
  mastery: { type: Number, default: 0.3, min: 0, max: 1 },
  attempts: { type: Number, default: 0 },
  correct: { type: Number, default: 0 }
}, { timestamps: true });
schema.index({ user: 1, material: 1, topic: 1 }, { unique: true });
module.exports = model('SkillNode', schema);
