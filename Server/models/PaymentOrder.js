const mongoose = require('mongoose');

const schema = new mongoose.Schema({
  orderId: { type: String, required: true, unique: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  courses: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true }],
  amount: { type: Number, required: true },
  currency: { type: String, required: true },
  status: { type: String, enum: ['created', 'fulfilled'], default: 'created' },
  paymentId: { type: String, unique: true, sparse: true },
  receiptSent: { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model('PaymentOrder', schema);
