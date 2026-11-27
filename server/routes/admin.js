import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import { rateLimit } from 'express-rate-limit';
import mongoose from 'mongoose';
import Event from '../models/Event.js';
import User from '../models/User.js';
import Order from '../models/Order.js';
import Ticket from '../models/Ticket.js';
import AdminLog from '../models/AdminLog.js';
import Notification from '../models/Notification.js';
import { requireAdmin } from '../middleware/auth.js';
import { markEventRemoved, restoreEventModeration, disableTicketsForRemovedEvent, restoreTicketsAfterEventRestored } from '../services/eventModeration.js';

const r = Router();
const send = (res, data, message = 'OK', status = 200) => res.status(status).json({ success: true, message, data });
const asyncRoute = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 180, standardHeaders: 'draft-7', legacyHeaders: false });
const escapeRegex = value => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const activeOrLegacy = { $or: [{ 'moderation.status': 'active' }, { 'moderation.status': { $exists: false } }] };

r.use(limiter, requireAdmin);

r.get('/stats', asyncRoute(async (req, res) => {
  const [totalEvents, removedEvents, totalUsers, hosts, orders] = await Promise.all([
    Event.countDocuments({}), Event.countDocuments({ 'moderation.status': 'removed' }),
    User.countDocuments({}), User.countDocuments({ role: 'organizer' }), Order.countDocuments({}),
  ]);
  send(res, { totalEvents, activeEvents: totalEvents - removedEvents, removedEvents, totalUsers, hosts, orders });
}));

r.get('/events', asyncRoute(async (req, res) => {
  const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, Number.parseInt(req.query.limit, 10) || 10));
  const queryParts = [];
  if (req.query.status) queryParts.push({ status: String(req.query.status) });
  if (req.query.category) queryParts.push({ category: String(req.query.category) });
  if (req.query.moderationStatus === 'removed') queryParts.push({ 'moderation.status': 'removed' });
  if (req.query.moderationStatus === 'active') queryParts.push(activeOrLegacy);
  if (req.query.host) {
    if (mongoose.isValidObjectId(req.query.host)) queryParts.push({ organizer: req.query.host });
    else {
      const hostPattern = new RegExp(escapeRegex(String(req.query.host).trim()), 'i');
      const matchingHosts = await User.find({ $or: [{ name: hostPattern }, { email: hostPattern }] }).distinct('_id');
      queryParts.push({ organizer: { $in: matchingHosts } });
    }
  }
  if (req.query.search) {
    const pattern = new RegExp(escapeRegex(String(req.query.search).trim()), 'i');
    const matchingHosts = await User.find({ $or: [{ name: pattern }, { email: pattern }] }).distinct('_id');
    queryParts.push({ $or: [{ title: pattern }, { venue: pattern }, { organizer: { $in: matchingHosts } }] });
  }
  const query = queryParts.length ? { $and: queryParts } : {};
  const sortField = ['title', 'date', 'createdAt', 'status'].includes(req.query.sort) ? req.query.sort : 'createdAt';
  const sortDirection = req.query.order === 'asc' ? 1 : -1;
  const [total, events] = await Promise.all([
    Event.countDocuments(query), Event.find(query).populate('organizer', 'name email organization')
      .sort({ [sortField]: sortDirection, _id: -1 }).skip((page - 1) * limit).limit(limit),
  ]);
  send(res, { events, page, limit, total, pages: Math.ceil(total / limit) });
}));

r.patch('/events/:id/remove', body('reason').isString().trim().isLength({ min: 5, max: 500 }), body('adminNote').optional().isString().isLength({ max: 1000 }), asyncRoute(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(422).json({ success: false, message: 'A removal reason of at least 5 characters is required.', errors: errors.array() });
  const event = await Event.findById(req.params.id);
  if (!event) return res.status(404).json({ success: false, message: 'Event not found.' });
  if (event.moderation?.status === 'removed') return res.status(409).json({ success: false, message: 'This event has already been removed.' });
  const reason = req.body.reason.trim();
  markEventRemoved(event, { adminId: req.user.id, reason, adminNote: String(req.body.adminNote || '') });
  await event.save();
  const tickets = await Ticket.find({ event: event.id, status: { $ne: 'Event Removed' } });
  disableTicketsForRemovedEvent(tickets);
  if (tickets.length) await Ticket.bulkWrite(tickets.map(ticket => ({ updateOne: { filter: { _id: ticket.id }, update: { $set: { status: ticket.status, statusBeforeRemoval: ticket.statusBeforeRemoval } } } })));
  await Notification.create({ user: event.organizer, type: 'event_removed', event: event.id, eventTitle: event.title, reason });
  await AdminLog.create({ admin: req.user.id, action: 'remove', targetId: event.id, targetTitle: event.title, reason });
  send(res, event, 'Event removed from public listings. Existing orders and tickets were preserved.');
}));

r.patch('/events/:id/restore', asyncRoute(async (req, res) => {
  const event = await Event.findById(req.params.id);
  if (!event) return res.status(404).json({ success: false, message: 'Event not found.' });
  if (event.moderation?.status !== 'removed') return res.status(409).json({ success: false, message: 'This event is not removed.' });
  const previousReason = restoreEventModeration(event);
  await event.save();
  const tickets = await Ticket.find({ event: event.id, status: 'Event Removed' });
  restoreTicketsAfterEventRestored(tickets);
  if (tickets.length) await Ticket.bulkWrite(tickets.map(ticket => ({ updateOne: { filter: { _id: ticket.id }, update: { $set: { status: ticket.status }, $unset: { statusBeforeRemoval: 1 } } } })));
  await Notification.create({ user: event.organizer, type: 'event_restored', event: event.id, eventTitle: event.title, reason: previousReason });
  await AdminLog.create({ admin: req.user.id, action: 'restore', targetId: event.id, targetTitle: event.title, reason: previousReason });
  send(res, event, 'Event restored.');
}));

r.delete('/events/:id', body('confirmTitle').isString().trim().notEmpty(), asyncRoute(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(422).json({ success: false, message: 'Type the event title to confirm permanent deletion.' });
  const event = await Event.findById(req.params.id);
  if (!event) return res.status(404).json({ success: false, message: 'Event not found.' });
  if (event.moderation?.status !== 'removed') return res.status(409).json({ success: false, message: 'Remove the event before permanently deleting it.' });
  if (req.body.confirmTitle.trim() !== event.title) return res.status(422).json({ success: false, message: 'The confirmation title does not match.' });
  if (await Order.exists({ event: event.id }) || await Ticket.exists({ event: event.id })) return res.status(409).json({ success: false, message: 'This event has order or ticket records. Permanent deletion is blocked so purchase, attendance, and refund history remain intact.' });
  const title = event.title;
  await AdminLog.create({ admin: req.user.id, action: 'delete', targetId: event.id, targetTitle: title, reason: event.moderation.reason || '' });
  await Notification.updateMany({ event: event.id }, { $set: { event: null } });
  await event.deleteOne();
  send(res, null, 'Event permanently deleted.');
}));

r.get('/logs', asyncRoute(async (req, res) => {
  const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, Number.parseInt(req.query.limit, 10) || 20));
  const [total, logs] = await Promise.all([
    AdminLog.countDocuments({}), AdminLog.find({}).populate('admin', 'name email').sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
  ]);
  send(res, { logs, page, limit, total, pages: Math.ceil(total / limit) });
}));

export default r;
