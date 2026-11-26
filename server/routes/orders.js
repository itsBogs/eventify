import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import crypto from 'node:crypto';
import Order from '../models/Order.js';
import Event from '../models/Event.js';
import Ticket from '../models/Ticket.js';
import User from '../models/User.js';
import { auth, roles } from '../middleware/auth.js';
import { imageUpload } from '../middleware/imageUpload.js';
import { uploadImage, deleteImage } from '../services/cloudinary.js';
import { expireOverdueOrders, ORDER_EXPIRY_HOURS } from '../services/orderExpiry.js';

const r = Router();
const PAYMENT_METHODS = ['GCash', 'Maya', 'Bank Transfer', 'Other'];
const UNPAID = ['Pending Payment', 'Pending Verification', 'Rejected', 'Pending'];
const send = (res, data, message = 'OK', status = 200) => res.status(status).json({ success: true, message, data });
const check = (req, res, next) => {
  const result = validationResult(req);
  if (!result.isEmpty()) return res.status(422).json({ success: false, message: 'Validation failed', errors: result.array() });
  next();
};
const makeTickets = async order => {
  const existing = await Ticket.countDocuments({ order: order._id });
  if (existing) return;
  const docs = order.items.flatMap(item => Array.from({ length: item.quantity }, () => ({
    code: crypto.randomBytes(8).toString('hex').toUpperCase(), order: order._id,
    event: order.event, user: order.user, ticketType: item.name,
  })));
  if (docs.length) await Ticket.insertMany(docs);
};
const hostOwnsOrder = async (order, user) => {
  if (user.role === 'admin') return true;
  const event = await Event.findById(order.event).select('organizer');
  return Boolean(event && String(event.organizer) === String(user.id));
};

// Reserve inventory at checkout; only free purchases are immediately paid and ticketed.
r.post('/', auth, roles('attendee'), body('eventId').isMongoId(), body('ticketTypeId').isMongoId(), body('quantity').isInt({ min: 1 }), check, async (req, res) => {
  await expireOverdueOrders();
  const { eventId, ticketTypeId, quantity: rawQuantity } = req.body;
  const quantity = Number(rawQuantity);
  let event, ticket, reserved = false;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    event = await Event.findOne({ _id: eventId, status: 'Published' });
    if (!event) return res.status(409).json({ success: false, message: 'Event is unavailable' });
    ticket = event.tickets.id(ticketTypeId);
    const now = new Date();
    const sold = event.tickets.reduce((sum, item) => sum + Number(item.sold || 0), 0);
    if (!ticket || !ticket.active || quantity > ticket.maxPerOrder || ticket.sold + quantity > ticket.quantity || (ticket.salesStart && now < ticket.salesStart) || (ticket.salesEnd && now > ticket.salesEnd) || sold + quantity > event.capacity) {
      return res.status(409).json({ success: false, message: 'Tickets are unavailable or the requested quantity exceeds event capacity' });
    }
    const updated = await Event.findOneAndUpdate({ _id: event.id, status: 'Published', __v: event.__v, 'tickets._id': ticketTypeId }, { $inc: { 'tickets.$.sold': quantity, __v: 1 } }, { new: true });
    if (updated) { event = updated; ticket = event.tickets.id(ticketTypeId); reserved = true; break; }
  }
  if (!reserved) return res.status(409).json({ success: false, message: 'Ticket inventory changed. Please try again.' });
  const activeDiscount = event.discount?.percent && (!event.discount.endsAt || event.discount.endsAt > new Date()) ? event.discount : null;
  const unitPrice = activeDiscount ? Math.round(ticket.price * (1 - activeDiscount.percent / 100) * 100) / 100 : ticket.price;
  const subtotal = unitPrice * quantity;
  const fees = subtotal === 0 ? 0 : Math.round(subtotal * 0.05 * 100) / 100;
  const status = subtotal === 0 ? 'Paid' : 'Pending Payment';
  try {
    const order = await Order.create({
      user: req.user.id, event: event.id,
      items: [{ ticketTypeId, name: ticket.name, quantity, unitPrice }],
      subtotal, fees, total: subtotal + fees, status,
      expiresAt: new Date(Date.now() + ORDER_EXPIRY_HOURS * 60 * 60 * 1000),
      statusHistory: [{ status, at: new Date(), by: req.user.id, note: subtotal === 0 ? 'Free ticket confirmed.' : 'Ticket inventory reserved.' }],
    });
    if (status === 'Paid') await makeTickets(order);
    await order.populate('event', 'title date venue image paymentInstructions organizer');
    return send(res, order, status === 'Paid' ? 'Free tickets confirmed.' : 'Order created. Submit payment before it expires.', 201);
  } catch (error) {
    await Event.updateOne({ _id: event.id, 'tickets._id': ticketTypeId }, { $inc: { 'tickets.$.sold': -quantity, __v: 1 } });
    throw error;
  }
});

r.get('/my-orders', auth, roles('attendee'), async (req, res) => {
  await expireOverdueOrders();
  const orders = await Order.find({ user: req.user.id }).populate('event', 'title date venue image paymentInstructions').sort({ createdAt: -1 });
  send(res, orders);
});

r.get('/host', auth, roles('organizer'), async (req, res) => {
  await expireOverdueOrders();
  const eventIds = (await Event.find({ organizer: req.user.id }).distinct('_id'));
  const query = { event: { $in: eventIds } };
  if (req.query.status) query.status = req.query.status;
  if (req.query.event && eventIds.some(id => String(id) === String(req.query.event))) query.event = req.query.event;
  if (req.query.search) {
    const term = String(req.query.search).trim();
    const buyers = await User.find({ $or: [{ name: new RegExp(term, 'i') }, { email: new RegExp(term, 'i') }] }).distinct('_id');
    query.$or = [{ user: { $in: buyers } }, { 'payment.referenceNumber': new RegExp(term, 'i') }];
  }
  const page = Math.max(1, Number(req.query.page) || 1), limit = Math.min(50, Math.max(1, Number(req.query.limit) || 10));
  const [total, orders] = await Promise.all([
    Order.countDocuments(query), Order.find(query).populate('user', 'name email').populate('event', 'title date venue').sort({ 'payment.submittedAt': -1, createdAt: -1 }).skip((page - 1) * limit).limit(limit),
  ]);
  send(res, { orders, page, limit, total, pages: Math.ceil(total / limit), pendingVerification: await Order.countDocuments({ event: { $in: eventIds }, status: 'Pending Verification' }) });
});

r.get('/:id', auth, async (req, res) => {
  await expireOverdueOrders();
  const order = await Order.findById(req.params.id).populate('event', 'title date venue image paymentInstructions organizer').populate('user', 'name email').populate('statusHistory.by', 'name');
  if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
  if (String(order.user?._id || order.user) !== String(req.user.id) && !(req.user.role === 'organizer' && await hostOwnsOrder(order, req.user))) return res.status(403).json({ success: false, message: 'Not your order' });
  send(res, order);
});

r.post('/:id/payment', auth, roles('attendee'), imageUpload.single('receipt'), body('method').isIn(PAYMENT_METHODS), body('referenceNumber').trim().notEmpty().isLength({ max: 100 }), check, async (req, res) => {
  const order = await Order.findOne({ _id: req.params.id, user: req.user.id });
  if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
  if (!req.file) return res.status(422).json({ success: false, message: 'Upload your payment receipt image.' });
  if (!['Pending Payment', 'Rejected', 'Pending'].includes(order.status)) return res.status(409).json({ success: false, message: 'This order cannot accept another receipt.' });
  if (order.expiresAt && order.expiresAt <= new Date()) {
    await expireOverdueOrders();
    return res.status(409).json({ success: false, message: 'This order has expired. Please place a new order.' });
  }
  let uploaded;
  try { uploaded = await uploadImage(req.file.buffer, 'receipts'); }
  catch (error) { return res.status(error.status || 502).json({ success: false, message: error.status === 503 ? error.message : 'Cloudinary could not store the receipt. Please try again.' }); }
  if (order.payment?.receiptPublicId) await deleteImage(order.payment.receiptPublicId).catch(() => {});
  order.status = 'Pending Verification';
  order.payment = { ...order.payment?.toObject?.(), method: req.body.method, referenceNumber: req.body.referenceNumber.trim(), receiptUrl: uploaded.url, receiptPublicId: uploaded.publicId, submittedAt: new Date(), reviewedAt: undefined, reviewedBy: undefined, rejectionReason: '', hostNote: '' };
  order.statusHistory.push({ status: order.status, at: new Date(), by: req.user.id, note: 'Payment receipt submitted for verification.' });
  await order.save();
  await order.populate('event', 'title date venue image');
  send(res, order, 'Your payment is under review. The host will confirm it soon.');
});

r.patch('/:id/approve', auth, roles('organizer', 'admin'), async (req, res) => {
  await expireOverdueOrders();
  const order = await Order.findById(req.params.id);
  if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
  if (!(await hostOwnsOrder(order, req.user))) return res.status(403).json({ success: false, message: 'This event belongs to another organizer.' });
  if (order.status === 'Paid') return send(res, order, 'Order was already approved.');
  if (order.status !== 'Pending Verification') return res.status(409).json({ success: false, message: 'Only orders with submitted receipts can be approved.' });
  const approved = await Order.findOneAndUpdate({ _id: order._id, status: 'Pending Verification' }, { $set: { status: 'Paid', 'payment.reviewedAt': new Date(), 'payment.reviewedBy': req.user.id }, $push: { statusHistory: { status: 'Paid', at: new Date(), by: req.user.id, note: 'Payment approved by event host.' } } }, { new: true });
  if (!approved) return res.status(409).json({ success: false, message: 'Order status changed. Refresh and try again.' });
  await makeTickets(approved);
  send(res, approved, 'Payment approved and tickets issued.');
});

r.patch('/:id/reject', auth, roles('organizer', 'admin'), body('rejectionReason').trim().notEmpty().isLength({ max: 500 }), check, async (req, res) => {
  await expireOverdueOrders();
  const order = await Order.findById(req.params.id);
  if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
  if (!(await hostOwnsOrder(order, req.user))) return res.status(403).json({ success: false, message: 'This event belongs to another organizer.' });
  if (order.status !== 'Pending Verification') return res.status(409).json({ success: false, message: 'Only orders with submitted receipts can be rejected.' });
  order.status = 'Rejected';
  order.payment.reviewedAt = new Date(); order.payment.reviewedBy = req.user.id; order.payment.rejectionReason = req.body.rejectionReason.trim();
  order.statusHistory.push({ status: 'Rejected', at: new Date(), by: req.user.id, note: order.payment.rejectionReason });
  await order.save();
  send(res, order, 'Payment receipt rejected. The buyer may upload a new receipt.');
});

r.post('/:id/cancel', auth, roles('attendee'), async (req, res) => {
  await expireOverdueOrders();
  const order = await Order.findOne({ _id: req.params.id, user: req.user.id });
  if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
  if (!UNPAID.includes(order.status)) return res.status(409).json({ success: false, message: 'This order cannot be cancelled.' });
  const cancelled = await Order.findOneAndUpdate({ _id: order._id, status: order.status, reservationReleased: { $ne: true } }, { $set: { status: 'Cancelled', reservationReleased: true }, $push: { statusHistory: { status: 'Cancelled', at: new Date(), by: req.user.id, note: 'Cancelled by buyer; reservation released.' } } }, { new: true });
  if (!cancelled) return res.status(409).json({ success: false, message: 'Order status changed. Refresh and try again.' });
  for (const item of cancelled.items) await Event.updateOne({ _id: cancelled.event, 'tickets._id': item.ticketTypeId }, { $inc: { 'tickets.$.sold': -item.quantity, __v: 1 } });
  send(res, cancelled, 'Order cancelled. Reserved tickets released.');
});

// Kept as a compatibility response for old clients; never marks a paid order automatically.
r.post('/:id/demo-payment', auth, roles('attendee'), async (req, res) => {
  const order = await Order.findOne({ _id: req.params.id, user: req.user.id });
  if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
  if (order.status === 'Paid') return send(res, order, 'Order is already paid.');
  return res.status(409).json({ success: false, message: 'Demo payment is disabled. Submit a payment receipt for host verification.' });
});

export default r;
