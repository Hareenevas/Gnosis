const { Schema, model } = require('mongoose');
module.exports = model('Squad', new Schema({
  name: { type: String, required: true },
  owner: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  code: { type: String, required: true, unique: true },
  members: [{ type: Schema.Types.ObjectId, ref: 'User' }]
}, { timestamps: true }));
