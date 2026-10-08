const { Schema, model } = require('mongoose');
module.exports = model('User', new Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ['student', 'instructor', 'admin'], default: 'student' },
  xp: { type: Number, default: 0 },
  streak: { type: Number, default: 0 },
  lastActiveDay: String,
  badges: { type: [String], default: [] }
}, { timestamps: true }));
