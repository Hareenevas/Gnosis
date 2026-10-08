const { Schema, model } = require('mongoose');
module.exports = model('Attempt', new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  question: { type: Schema.Types.ObjectId, ref: 'Question', required: true },
  material: { type: Schema.Types.ObjectId, ref: 'Material', required: true },
  selectedIndex: Number,
  correct: Boolean,
  timeMs: Number
}, { timestamps: true }));
