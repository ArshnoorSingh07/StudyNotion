const mongoose = require('mongoose');

const sourceSchema = new mongoose.Schema({ id: Number, title: String, url: String, excerpt: String }, { _id: false });
const messageSchema = new mongoose.Schema({
  role: { type: String, enum: ['user', 'assistant'], required: true },
  content: { type: String, maxlength: 16000, required: true },
  sources: [sourceSchema],
}, { _id: false });
const schema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  messages: { type: [messageSchema], default: [] },
  lockedUntil: { type: Date, default: () => new Date(0) },
}, { timestamps: true });
schema.index({ user: 1, course: 1 }, { unique: true });
schema.index({ updatedAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 30 });
module.exports = mongoose.model('ChatSession', schema);
