const { instance } = require('../config/razorpay');
const mongoose = require('mongoose');
const crypto = require('crypto');
const Course = require('../models/Course');
const User = require('../models/User');
const CourseProgress = require('../models/CourseProgress');
const PaymentOrder = require('../models/PaymentOrder');
const mailSender = require('../utils/mailSender');
const { paymentSuccessEmail } = require('../mail/templates/paymentSuccessEmail');
const { courseEnrollmentEmail } = require('../mail/templates/courseEnrollmentEmail');

const validId = value => typeof value === 'string' && /^[a-f0-9]{24}$/i.test(value);
const fail = (status, message) => Object.assign(new Error(message), { status });

function createPaymentController(deps = {}) {
  const courses = deps.Course || Course;
  const users = deps.User || User;
  const progress = deps.CourseProgress || CourseProgress;
  const orders = deps.PaymentOrder || PaymentOrder;
  const gateway = deps.gateway || instance;
  const transaction = deps.transaction || (fn => mongoose.connection.transaction(fn));
  const sendMail = deps.mailSender || mailSender;
  const secret = () => deps.secret || process.env.RAZORPAY_SECRET;
  const handle = fn => async (req, res) => {
    try { await fn(req, res); }
    catch (error) {
      res.status(error.status || 500).json({ success: false, message: error.status ? error.message : 'Could not complete payment processing. Please retry verification.' });
    }
  };

  async function student(userId, session) {
    const user = await users.findOne({ _id: userId, accountType: 'Student', active: { $ne: false } }).session(session || null);
    if (!user) throw fail(403, 'An active student account is required.');
    return user;
  }

  async function sendReceipt(orderId, userId) {
    const order = await orders.findOneAndUpdate(
      { orderId, user: userId, status: 'fulfilled', receiptSent: false },
      { $set: { receiptSent: true } }, { new: true }
    );
    if (!order) return;
    try {
      const user = await student(userId);
      await sendMail(user.email, 'Payment successful', paymentSuccessEmail(user.firstName, order.amount / 100, order.orderId, order.paymentId));
    } catch (error) {
      await orders.updateOne({ _id: order._id }, { $set: { receiptSent: false } });
      throw error;
    }
  }

  return {
    capturePayment: handle(async (req, res) => {
      const ids = req.body?.courses;
      if (!Array.isArray(ids) || !ids.length || ids.length > 50 || !ids.every(validId) || new Set(ids.map(id => id.toLowerCase())).size !== ids.length) {
        throw fail(400, 'Provide a non-empty list of distinct course IDs (up to 50).');
      }
      await student(req.user.id);
      const selected = await courses.find({ _id: { $in: ids }, status: 'Published' });
      if (selected.length !== ids.length) throw fail(400, 'One or more courses are unavailable.');
      let amount = 0;
      for (const course of selected) {
        if (course.studentsEnrolled.some(id => String(id) === req.user.id)) throw fail(409, 'You are already enrolled in a selected course.');
        const price = Math.round(course.price * 100);
        if (!Number.isSafeInteger(price) || price <= 0) throw fail(400, 'A selected course has an invalid price.');
        amount += price;
      }
      if (!Number.isSafeInteger(amount)) throw fail(400, 'Invalid order amount.');
      const order = await gateway.orders.create({ amount, currency: 'INR', receipt: crypto.randomBytes(16).toString('hex') });
      // Persist the authorized purchase before exposing the gateway order to checkout.
      await orders.create({ orderId: order.id, user: req.user.id, courses: selected.map(course => course._id), amount, currency: 'INR' });
      res.json({ success: true, data: order });
    }),

    verifyPayment: handle(async (req, res) => {
      const { razorpay_order_id: orderId, razorpay_payment_id: paymentId, razorpay_signature: signature } = req.body || {};
      if (typeof orderId !== 'string' || !/^order_[a-zA-Z0-9]+$/.test(orderId) ||
          typeof paymentId !== 'string' || !/^pay_[a-zA-Z0-9]+$/.test(paymentId) ||
          typeof signature !== 'string' || !/^[a-f0-9]{64}$/i.test(signature)) throw fail(400, 'Invalid payment details.');
      await student(req.user.id);
      const order = await orders.findOne({ orderId, user: req.user.id });
      if (!order) throw fail(404, 'Payment order not found for this account.');
      const expected = crypto.createHmac('sha256', secret()).update(order.orderId + '|' + paymentId).digest();
      if (!crypto.timingSafeEqual(expected, Buffer.from(signature, 'hex'))) throw fail(400, 'Payment signature is invalid.');
      if (order.status === 'fulfilled') {
        if (order.paymentId !== paymentId) throw fail(409, 'This order was fulfilled with another payment.');
        return res.json({ success: true, message: 'Payment already verified' });
      }
      const payment = await gateway.payments.fetch(paymentId);
      if (payment.order_id !== order.orderId || payment.amount !== order.amount || payment.currency !== order.currency || payment.status !== 'captured') {
        throw fail(409, 'Payment is not captured for the expected order and amount. Please retry verification once payment completes.');
      }
      // All enrollment writes and the consumed-order marker commit together. A failed
      // write rolls back, while concurrent callbacks retry and observe fulfillment.
      const enrolled = await transaction(async session => {
        const claimed = await orders.findOneAndUpdate(
          { _id: order._id, status: 'created' },
          { $set: { status: 'fulfilled', paymentId } }, { new: true, session }
        );
        if (!claimed) {
          const existing = await orders.findOne({ _id: order._id }).session(session);
          if (existing?.status === 'fulfilled' && existing.paymentId === paymentId) return null;
          throw fail(409, 'Payment verification is already in progress. Please retry.');
        }
        const user = await student(req.user.id, session);
        const purchased = [];
        // Only the saved order defines the courses, never req.body.courses.
        for (const courseId of claimed.courses) {
          const course = await courses.findOneAndUpdate(
            { _id: courseId, status: 'Published' },
            { $addToSet: { studentsEnrolled: user._id } }, { new: true, session }
          );
          if (!course) throw fail(409, 'A purchased course is unavailable. Please contact support with your order ID.');
          const record = await progress.findOneAndUpdate(
            { courseID: courseId, userId: user._id },
            { $setOnInsert: { completedVideos: [] } }, { upsert: true, new: true, session }
          );
          await users.updateOne({ _id: user._id }, { $addToSet: { courses: courseId, courseProgress: record._id } }, { session });
          purchased.push(course);
        }
        return { user, purchased };
      });
      // Notification failure must not turn a committed purchase into a payment failure.
      if (enrolled) {
        for (const course of enrolled.purchased) {
          await sendMail(enrolled.user.email, 'Successfully enrolled', courseEnrollmentEmail(course.courseName, enrolled.user.firstName)).catch(() => {});
        }
      }
      await sendReceipt(orderId, req.user.id).catch(() => {});
      res.json({ success: true, message: 'Payment Verified' });
    }),

    sendPaymentSuccessEmail: handle(async (req, res) => {
      const { orderId, paymentId } = req.body || {};
      if (typeof orderId !== 'string' || typeof paymentId !== 'string') throw fail(400, 'Invalid payment details.');
      const order = await orders.findOne({ orderId, paymentId, user: req.user.id, status: 'fulfilled' });
      if (!order) throw fail(404, 'Verified payment not found for this account.');
      await sendReceipt(orderId, req.user.id);
      res.json({ success: true, message: 'Payment receipt processed' });
    }),
  };
}

module.exports = { ...createPaymentController(), createPaymentController };
