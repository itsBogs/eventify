import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import Event from '../models/Event.js';
import Order from '../models/Order.js';
import Ticket from '../models/Ticket.js';
import Notification from '../models/Notification.js';
import { auth, optionalAuth, roles } from '../middleware/auth.js';
import { imageUpload } from '../middleware/imageUpload.js';
import { uploadImage, deleteImage } from '../services/cloudinary.js';
import { OPEN_ORDER_STATUSES, CANCELLABLE_UNPAID_STATUSES, eventDateTime, isEventInPast, validateEventTimes, validateTicketType, validateTicketTypes } from '../services/eventRules.js';

const r = Router();
const send = (res, data, message = 'OK', status = 200) => res.status(status).json({ success: true, message, data });
const invalid = (res, message, status = 400) => res.status(status).json({ success: false, message });
const check = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(422).json({ success: false, message: errors.array().map(error => error.msg).join(' '), errors: errors.array() });
  next();
};
const asyncRoute = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const timeError = (date, startTime, endTime) => {
  const valid = value => !value || (/^\d{2}:\d{2}$/.test(value) && Number(value.slice(0, 2)) < 24 && Number(value.slice(3)) < 60);
  if (!valid(startTime)) return 'Start time must use a valid 24-hour time.';
  if (!valid(endTime)) return 'End time must use a valid 24-hour time.';
  return validateEventTimes({ date, startTime, endTime });
};
const committedCounts = async event => {
  const orders = await Order.find({ event: event._id, status: { $in: OPEN_ORDER_STATUSES } }).select('items').lean();
  const counts = new Map();
  for (const order of orders) for (const item of order.items || []) {
    const id = String(item.ticketTypeId || '');
    if (id) counts.set(id, (counts.get(id) || 0) + Number(item.quantity || 0));
  }
  for (const ticket of event.tickets || []) {
    const id = String(ticket._id);
    counts.set(id, Math.max(counts.get(id) || 0, Number(ticket.sold || 0)));
  }
  return counts;
};
const ownedEvent = async (id, organizerId) => Event.findOne({ _id: id, organizer: organizerId });
const ensureEditable = (event, res) => {
  if (event.status === 'Cancelled') { invalid(res, 'Cancelled events cannot be edited.', 409); return false; }
  if (event.moderation?.status === 'removed') { res.status(423).json({ success: false, message: `This event was removed by an administrator${event.moderation.reason ? `: ${event.moderation.reason}` : ''}. It is read-only.` }); return false; }
  return true;
};
const parsePage = (value, fallback, max) => {
  const parsed = value === undefined ? fallback : Number(value);
  return Number.isInteger(parsed) && parsed >= 1 ? Math.min(parsed, max) : null;
};
const parseDate = (value, endOfDay = false) => {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(String(value))) parsed.setUTCHours(endOfDay ? 23 : 0, endOfDay ? 59 : 0, endOfDay ? 59 : 0, endOfDay ? 999 : 0);
  return parsed;
};

r.get('/', asyncRoute(async (req, res) => {
  const page = parsePage(req.query.page, 1, Number.MAX_SAFE_INTEGER), limit = parsePage(req.query.limit, 12, 50);
  if (!page || !limit) return invalid(res, 'Page and limit must be positive whole numbers.');
  const filter = { status: 'Published', $and: [{ $or: [{ 'moderation.status': 'active' }, { 'moderation.status': { $exists: false } }] }] };
  if (req.query.search && String(req.query.search).trim()) filter.$text = { $search: String(req.query.search).trim().slice(0, 150) };
  if (req.query.category) filter.category = String(req.query.category).slice(0, 80);
  const from = parseDate(req.query.dateFrom), to = parseDate(req.query.dateTo, true);
  if (req.query.dateFrom && !from) return invalid(res, 'dateFrom must be a valid date.');
  if (req.query.dateTo && !to) return invalid(res, 'dateTo must be a valid date.');
  if (from && to && from > to) return invalid(res, 'dateFrom must be on or before dateTo.');
  if (from || to || String(req.query.upcoming) === 'true') {
    filter.date = {};
    if (from) filter.date.$gte = from;
    if (to) filter.date.$lte = to;
    if (String(req.query.upcoming) === 'true') {
      const now = new Date(), localDay = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now), today = new Date(`${localDay}T00:00:00Z`);
      const tomorrow = new Date(today); tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
      const currentTime = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Manila', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(now);
      filter.$and.push({ $or: [
        { date: { $gte: tomorrow } },
        { date: { $gte: today, $lt: tomorrow }, $or: [{ startTime: { $gt: currentTime } }, { startTime: { $exists: false } }] },
      ] });
    }
  }
  const priceValue = key => {
    if (req.query[key] === undefined || req.query[key] === '') return null;
    const value = Number(req.query[key]);
    return Number.isFinite(value) && value >= 0 ? value : NaN;
  };
  const minPrice = priceValue('minPrice'), maxPrice = priceValue('maxPrice');
  if (Number.isNaN(minPrice) || Number.isNaN(maxPrice)) return invalid(res, 'Price filters must be zero or greater.');
  if (minPrice !== null && maxPrice !== null && minPrice > maxPrice) return invalid(res, 'minPrice cannot be greater than maxPrice.');
  if (minPrice !== null || maxPrice !== null) {
    const price = {};
    if (minPrice !== null) price.$gte = minPrice;
    if (maxPrice !== null) price.$lte = maxPrice;
    filter.tickets = { $elemMatch: { active: { $ne: false }, price } };
  }
  const sorts = {
    date: { date: 1, _id: 1 }, 'date-asc': { date: 1, _id: 1 }, 'date-desc': { date: -1, _id: -1 },
    newest: { createdAt: -1, _id: -1 }, 'price-asc': { sortPrice: 1, date: 1 }, 'price-desc': { sortPrice: -1, date: 1 },
  };
  const sortKey = String(req.query.sort || 'date');
  if (!sorts[sortKey]) return invalid(res, 'sort must be date, date-asc, date-desc, newest, price-asc, or price-desc.');
  const priceSort = sortKey.startsWith('price-');
  const priceStage = { $addFields: { sortPrice: { $min: { $map: {
    input: { $filter: { input: { $ifNull: ['$tickets', []] }, as: 'ticket', cond: { $ne: ['$$ticket.active', false] } } },
    as: 'ticket', in: '$$ticket.price',
  } } } } };
  const pipeline = [
    { $match: filter },
    ...(priceSort ? [priceStage] : []),
    { $sort: sorts[sortKey] },
    { $facet: { data: [{ $skip: (page - 1) * limit }, { $limit: limit }, { $project: { images: 0, gallery: 0, sortPrice: 0 } }], meta: [{ $count: 'total' }] } },
  ];
  const [result] = await Event.aggregate(pipeline);
  const data = await Event.populate(result?.data || [], { path: 'organizer', select: 'name organization' });
  const total = result?.meta?.[0]?.total || 0;
  res.json({ success: true, data, meta: { total, page, limit, totalPages: Math.ceil(total / limit), hasNext: page * limit < total } });
}));

r.get('/mine', auth, roles('organizer'), asyncRoute(async (req, res) => {
  const page = parsePage(req.query.page, 1, Number.MAX_SAFE_INTEGER), limit = parsePage(req.query.limit, 10, 50);
  if (!page || !limit) return invalid(res, 'Page and limit must be positive whole numbers.');
  const query = { organizer: req.user.id };
  const [total, data] = await Promise.all([
    Event.countDocuments(query), Event.find(query).select('-images -gallery').sort({ createdAt: -1, _id: -1 }).skip((page - 1) * limit).limit(limit),
  ]);
  res.json({ success: true, data, meta: { total, page, limit, totalPages: Math.ceil(total / limit), hasNext: page * limit < total } });
}));

r.get('/:id/lifecycle', auth, roles('organizer'), asyncRoute(async (req, res) => {
  const event = await ownedEvent(req.params.id, req.user.id);
  if (!event) return res.status(404).json({ success: false, message: 'Event not found' });
  const statuses = ['Pending Payment', 'Pending Verification', 'Paid', 'Refund Required', 'Refunded', 'Rejected', 'Pending'];
  const counts = await Order.aggregate([{ $match: { event: event._id, status: { $in: statuses } } }, { $group: { _id: '$status', count: { $sum: 1 } } }]);
  const byStatus = Object.fromEntries(counts.map(item => [item._id, item.count]));
  const blockedOrders = (byStatus['Pending Payment'] || 0) + (byStatus['Pending Verification'] || 0) + (byStatus.Paid || 0) + (byStatus['Refund Required'] || 0) + (byStatus.Pending || 0);
  send(res, { canDelete: blockedOrders === 0, blockedOrders, cancellationImpact: { pendingPayment: byStatus['Pending Payment'] || 0, pendingVerification: byStatus['Pending Verification'] || 0, paid: byStatus.Paid || 0, refundRequired: byStatus['Refund Required'] || 0, refunded: byStatus.Refunded || 0, rejected: byStatus.Rejected || 0, legacyPending: byStatus.Pending || 0, total: statuses.reduce((sum, status) => sum + (byStatus[status] || 0), 0) } });
}));

const optionalEventValidators = [
  body('theme').optional({ values: 'falsy' }).isIn(['neon','elegant','retro','minimal','sports','script','cyber','classic']),
  body('gallery').optional().isArray({ max: 6 }), body('paymentInstructions').optional().isObject(),
  body('paymentInstructions.methods').optional().isArray({ max: 4 }), body('paymentInstructions.methods.*.type').optional().isIn(['GCash','Maya','Bank Transfer','Other']),
  body('paymentInstructions.methods.*.accountName').optional().isString().isLength({ max: 100 }), body('paymentInstructions.methods.*.accountNumber').optional().isString().isLength({ max: 100 }),
  body('paymentInstructions.note').optional().isString().isLength({ max: 1000 }), body('gallery.*').optional().isString().isLength({ max: 600000 }),
  body('discount').optional({ nullable: true }).isObject(), body('discount.percent').optional({ values: 'falsy' }).isFloat({ min: 1, max: 90 }),
  body('discount.endsAt').optional({ values: 'falsy' }).isISO8601(), body('tickets.*.perks').optional().isArray({ max: 10 }), body('tickets.*.tags').optional().isArray({ max: 10 }),
];

r.post('/', auth, roles('organizer'),
  body('title').isString().trim().notEmpty().withMessage('Event title is required.'),
  body('description').isString().trim().notEmpty().withMessage('Event description is required.'),
  body('venue').isString().trim().notEmpty().withMessage('Event venue is required.'),
  body('capacity').custom(value => Number.isInteger(Number(value)) && Number(value) >= 1).withMessage('Event capacity must be a whole number of at least 1.'),
  body('date').isISO8601().withMessage('A valid event date is required.'), body('tickets').optional().isArray().withMessage('Ticket types must be an array.'),
  ...optionalEventValidators, check, asyncRoute(async (req, res) => {
    const date = new Date(req.body.date);
    if (isEventInPast({ date, startTime: req.body.startTime })) return invalid(res, 'Event date and start time must be in the future.');
    const timing = timeError(date, req.body.startTime, req.body.endTime);
    if (timing) return invalid(res, timing);
    const tickets = Array.isArray(req.body.tickets) ? req.body.tickets.map(ticket => ({ ...ticket, maxPerOrder: ticket.maxPerOrder === undefined ? Math.min(5, Number(ticket.quantity)) : ticket.maxPerOrder })) : [];
    const ticketError = validateTicketTypes(tickets, Number(req.body.capacity), { eventDate: date, startTime: req.body.startTime });
    if (ticketError) return invalid(res, ticketError);
    const images = Array.isArray(req.body.images) ? req.body.images.slice(0, 6) : [];
    const gallery = Array.isArray(req.body.gallery) ? req.body.gallery.slice(0, 6) : [];
    const cover = gallery[0] || images[0] || req.body.image || '';
    const safeTickets = tickets.map(ticket => ({ ...ticket, name: String(ticket.name).trim(), price: Number(ticket.price), quantity: Number(ticket.quantity), maxPerOrder: Number(ticket.maxPerOrder), sold: 0, tags: Array.isArray(ticket.tags) ? ticket.tags.slice(0, 10) : [], perks: Array.isArray(ticket.perks) ? ticket.perks.slice(0, 10) : [] }));
    const discount = req.body.discount;
    const safeDiscount = discount && Number(discount.percent) > 0 ? { label: String(discount.label || '').slice(0, 60), percent: Number(discount.percent), endsAt: discount.endsAt || undefined } : null;
    const event = await Event.create({
      title: req.body.title.trim(), description: req.body.description.trim(), category: req.body.category || 'Other',
      image: cover, images: gallery.length ? [] : images, gallery, theme: req.body.theme || '', discount: safeDiscount,
      paymentInstructions: req.body.paymentInstructions || {}, date, startTime: req.body.startTime, endTime: req.body.endTime,
      venue: req.body.venue.trim(), address: req.body.address || '', capacity: Number(req.body.capacity), tickets: safeTickets,
      status: 'Draft', organizer: req.user.id,
    });
    send(res, event, 'Event created', 201);
  }));

r.get('/:id', optionalAuth, asyncRoute(async (req, res) => {
  const event = await Event.findById(req.params.id).populate('organizer', 'name organization');
  if (!event || (event.status !== 'Published' && String(event.organizer?._id) !== String(req.user?._id) && req.user?.role !== 'admin')) return res.status(404).json({ success: false, message: 'Event not found' });
  if (event.moderation?.status === 'removed' && String(event.organizer?._id) !== String(req.user?._id) && req.user?.role !== 'admin') return res.status(404).json({ success: false, message: 'This event is no longer available.' });
  send(res, event);
}));

r.put('/:id', auth, roles('organizer'), asyncRoute(async (req, res) => {
  const event = await ownedEvent(req.params.id, req.user.id);
  if (!event) return res.status(404).json({ success: false, message: 'Event not found' });
  if (!ensureEditable(event, res)) return;
  const hasDate = Object.hasOwn(req.body, 'date'), date = hasDate ? new Date(req.body.date) : event.date;
  const startTime = req.body.startTime ?? event.startTime, endTime = req.body.endTime ?? event.endTime;
  if (!Number.isFinite(date.getTime())) return invalid(res, 'A valid event date is required.');
  const dateKey = value => new Date(value).toISOString().slice(0, 10);
  const dateChanged = hasDate && dateKey(date) !== dateKey(event.date);
  const startChanged = req.body.startTime !== undefined && req.body.startTime !== event.startTime;
  const endChanged = req.body.endTime !== undefined && req.body.endTime !== event.endTime;
  if (isEventInPast(event) && (dateChanged || startChanged || endChanged)) return invalid(res, 'Past events can be edited only without changing their date or time.');
  if (!isEventInPast(event) && isEventInPast({ date, startTime })) return invalid(res, 'Event date and start time must be in the future.');
  const timing = timeError(date, startTime, endTime);
  if (timing) return invalid(res, timing);
  const counts = await committedCounts(event), committed = event.tickets.reduce((sum, ticket) => sum + (counts.get(String(ticket._id)) || 0), 0);
  const capacity = req.body.capacity === undefined ? event.capacity : Number(req.body.capacity);
  if (!Number.isInteger(capacity) || capacity < 1) return invalid(res, 'Event capacity must be a whole number of at least 1.');
  if (capacity < committed) return invalid(res, 'Capacity cannot be lower than sold and reserved tickets.', 409);
  if (event.tickets.reduce((sum, ticket) => sum + Number(ticket.quantity || 0), 0) > capacity) return invalid(res, 'The total ticket quantities cannot exceed event capacity.', 409);
  if (hasDate || req.body.startTime !== undefined) for (const ticket of event.tickets) {
    const message = validateTicketType(ticket.toObject(), { eventDate: date, startTime });
    if (message) return invalid(res, message);
  }
  if (req.body.status === 'Cancelled') return invalid(res, 'Use the cancel event action so ticket orders can be handled safely.');
  const fields = ['title','description','category','image','images','gallery','theme','discount','paymentInstructions','date','startTime','endTime','venue','address','capacity','status'];
  for (const field of fields) if (req.body[field] !== undefined) event[field] = req.body[field];
  if (Array.isArray(req.body.images)) event.images = req.body.images.slice(0, 6);
  if (Array.isArray(req.body.gallery)) { event.gallery = req.body.gallery.slice(0, 6); event.image = event.gallery[0] || event.images?.[0] || req.body.image || ''; }
  else if (Array.isArray(req.body.images)) event.image = event.images[0] || req.body.image || '';
  if (req.body.discount === null || !req.body.discount?.percent) event.discount = null;
  await event.save(); send(res, event, 'Event updated');
}));

r.post('/:id/payment-qr', auth, roles('organizer'), imageUpload.single('qrImage'), asyncRoute(async (req, res) => {
  const event = await ownedEvent(req.params.id, req.user.id);
  if (!event) return res.status(404).json({ success: false, message: 'Event not found' });
  if (!ensureEditable(event, res)) return;
  const index = Number(req.body.methodIndex), method = event.paymentInstructions?.methods?.[index];
  if (!Number.isInteger(index) || !method) return invalid(res, 'Select a valid payment method first.');
  if (!req.file) return invalid(res, 'Choose a QR image.');
  let result;
  try { result = await uploadImage(req.file.buffer, 'payment-qr'); }
  catch (error) { return res.status(error.status || 502).json({ success: false, message: error.status === 503 ? error.message : 'Cloudinary could not store the payment QR. Please try again.' }); }
  if (method.qrImagePublicId) await deleteImage(method.qrImagePublicId).catch(() => {});
  method.qrImageUrl = result.url; method.qrImagePublicId = result.publicId;
  await event.save(); send(res, event.paymentInstructions, 'Payment QR saved.');
}));

r.delete('/:id', auth, roles('organizer'), asyncRoute(async (req, res) => {
  const event = await ownedEvent(req.params.id, req.user.id);
  if (!event) return res.status(404).json({ success: false, message: 'Event not found' });
  const active = await Order.find({ event: event.id, status: { $in: ['Pending Payment','Pending Verification','Paid','Refund Required','Pending'] } }).select('status').lean();
  if (active.length) return res.status(409).json({ success: false, message: 'This event cannot be deleted while it has active orders (' + [...new Set(active.map(order => order.status))].join(', ') + '). Cancel the event or wait until unpaid orders expire.' });
  const publicIds = (event.paymentInstructions?.methods || []).map(method => method.qrImagePublicId).filter(Boolean);
  const inactiveOrders = await Order.find({ event: event.id, status: { $in: ['Expired','Cancelled','Rejected','Refunded'] } }).select('payment.receiptPublicId').lean();
  const receiptIds = inactiveOrders.map(order => order.payment?.receiptPublicId).filter(Boolean);
  try { await Promise.all([...publicIds, ...receiptIds].map(publicId => deleteImage(publicId))); }
  catch { return res.status(502).json({ success: false, message: 'Event images could not be removed from storage. The event was kept; please try again.' }); }
  await Ticket.deleteMany({ event: event.id });
  await Order.deleteMany({ event: event.id });
  await Notification.updateMany({ event: event.id }, { $set: { event: null } });
  await event.deleteOne();
  send(res, null, 'Event and inactive order history deleted.');
}));

r.patch('/:id/cancel', auth, roles('organizer'), body('reason').isString().trim().isLength({ min: 5, max: 500 }).withMessage('Enter a cancellation reason of at least 5 characters.'), body('refundContact').isString().trim().isLength({ min: 5, max: 160 }).withMessage('Enter an email address, phone number, or other refund contact (5 to 160 characters).'), check, asyncRoute(async (req, res) => {
  const event = await ownedEvent(req.params.id, req.user.id);
  if (!event) return res.status(404).json({ success: false, message: 'Event not found' });
  // Admin-removed events stay hidden and read-only, but organizers must still
  // be able to cancel them so existing orders can be cancelled/refund-flagged.
  if (event.status !== 'Cancelled' || !event.cancellationReason) { event.status = 'Cancelled'; event.cancellationReason = req.body.reason.trim(); }
  event.refundContact = req.body.refundContact.trim();
  await event.save();
  const unpaid = await Order.find({ event: event.id, status: { $in: CANCELLABLE_UNPAID_STATUSES }, reservationReleased: { $ne: true } }).select('_id items').lean();
  let cancelledOrders = 0, releasedTickets = 0;
  for (const candidate of unpaid) {
    const order = await Order.findOneAndUpdate({ _id: candidate._id, status: { $in: CANCELLABLE_UNPAID_STATUSES }, reservationReleased: { $ne: true } }, {
      $set: { status: 'Cancelled', reservationReleased: true },
      $push: { statusHistory: { status: 'Cancelled', at: new Date(), by: req.user.id, note: 'Event cancelled: ' + event.cancellationReason } },
    }, { new: true });
    if (!order) continue;
    cancelledOrders += 1;
    for (const item of order.items || []) {
      const quantity = Number(item.quantity || 0); if (!quantity) continue;
      const ticketFilter = item.ticketTypeId ? { _id: item.ticketTypeId } : { name: item.name };
      const released = await Event.updateOne({ _id: event.id, tickets: { $elemMatch: { ...ticketFilter, sold: { $gte: quantity } } } }, { $inc: { 'tickets.$.sold': -quantity, __v: 1 } });
      if (released.modifiedCount) releasedTickets += quantity;
    }
  }
  const paid = await Order.updateMany({ event: event.id, status: 'Paid' }, {
    $set: { status: 'Refund Required' },
    $push: { statusHistory: { status: 'Refund Required', at: new Date(), by: req.user.id, note: 'Event cancelled: ' + event.cancellationReason } },
  });
  await Ticket.updateMany({ event: event.id, status: { $in: ['Valid','Checked In'] } }, { $set: { status: 'Cancelled' } });
  send(res, { event, cancelledOrders, refundRequiredOrders: paid.modifiedCount, releasedTickets, reason: event.cancellationReason }, 'Event cancelled. Buyers can see the cancellation in their orders and tickets.');
}));

r.patch('/:id/status', auth, roles('organizer'), asyncRoute(async (req, res) => {
  const event = await ownedEvent(req.params.id, req.user.id);
  if (!event) return res.status(404).json({ success: false, message: 'Event not found' });
  if (!ensureEditable(event, res)) return;
  if (!['Draft','Published','Completed'].includes(req.body.status)) return invalid(res, 'Invalid event status. Use the cancel event action to cancel an event.');
  event.status = req.body.status; await event.save(); send(res, event, 'Event status updated');
}));

r.post('/:eventId/ticket-types', auth, roles('organizer'), asyncRoute(async (req, res) => {
  const event = await ownedEvent(req.params.eventId, req.user.id);
  if (!event) return res.status(404).json({ success: false, message: 'Event not found' });
  if (!ensureEditable(event, res)) return;
  const ticket = { ...req.body, maxPerOrder: req.body.maxPerOrder === undefined ? Math.min(5, Number(req.body.quantity)) : req.body.maxPerOrder };
  const message = validateTicketType(ticket, { eventDate: event.date, startTime: event.startTime }); if (message) return invalid(res, message);
  if (event.tickets.some(item => item.name.trim().toLocaleLowerCase() === String(ticket.name).trim().toLocaleLowerCase())) return invalid(res, 'Ticket type names must be unique within an event.');
  const counts = await committedCounts(event), committed = event.tickets.reduce((sum, item) => sum + (counts.get(String(item._id)) || 0), 0);
  if (event.tickets.reduce((sum, item) => sum + Number(item.quantity || 0), 0) + Number(ticket.quantity) > event.capacity) return invalid(res, 'The total ticket quantities cannot exceed event capacity.', 409);
  if (committed + Number(ticket.quantity) > event.capacity) return invalid(res, 'Capacity cannot be lower than sold and reserved tickets.', 409);
  event.tickets.push({ ...ticket, name: String(ticket.name).trim(), price: Number(ticket.price), quantity: Number(ticket.quantity), maxPerOrder: Number(ticket.maxPerOrder), sold: 0, tags: Array.isArray(ticket.tags) ? ticket.tags.slice(0, 10) : [], perks: Array.isArray(ticket.perks) ? ticket.perks.slice(0, 10) : [] });
  await event.save(); send(res, event, 'Ticket type added', 201);
}));

r.put('/:eventId/ticket-types/:ticketTypeId', auth, roles('organizer'), asyncRoute(async (req, res) => {
  const event = await ownedEvent(req.params.eventId, req.user.id);
  if (!event) return res.status(404).json({ success: false, message: 'Event not found' });
  if (!ensureEditable(event, res)) return;
  const current = event.tickets.id(req.params.ticketTypeId); if (!current) return res.status(404).json({ success: false, message: 'Ticket type not found' });
  const candidate = { ...current.toObject(), ...req.body };
  if (req.body.quantity === undefined) candidate.quantity = current.quantity;
  if (req.body.maxPerOrder === undefined) candidate.maxPerOrder = Math.min(Number(current.maxPerOrder || 5), Number(candidate.quantity));
  candidate.name = String(candidate.name || '').trim();
  const message = validateTicketType(candidate, { eventDate: event.date, startTime: event.startTime }); if (message) return invalid(res, message);
  if (event.tickets.some(item => String(item._id) !== String(current._id) && item.name.trim().toLocaleLowerCase() === candidate.name.toLocaleLowerCase())) return invalid(res, 'Ticket type names must be unique within an event.');
  const counts = await committedCounts(event), committed = counts.get(String(current._id)) || 0;
  if (Number(candidate.quantity) < committed) return invalid(res, 'Ticket quantity cannot be lower than sold and reserved tickets.', 409);
  const totalQuantity = event.tickets.reduce((sum, item) => sum + (String(item._id) === String(current._id) ? Number(candidate.quantity) : Number(item.quantity || 0)), 0);
  if (totalQuantity > event.capacity) return invalid(res, 'The total ticket quantities cannot exceed event capacity.', 409);
  for (const field of ['name','description','price','quantity','maxPerOrder','salesStart','salesEnd','active','tags','perks']) if (candidate[field] !== undefined) current[field] = ['tags','perks'].includes(field) ? (Array.isArray(candidate[field]) ? candidate[field].slice(0, 10) : []) : candidate[field];
  current.name = candidate.name; current.price = Number(candidate.price); current.quantity = Number(candidate.quantity); current.maxPerOrder = Number(candidate.maxPerOrder);
  await event.save(); send(res, event, 'Ticket type updated');
}));

r.delete('/:eventId/ticket-types/:ticketTypeId', auth, roles('organizer'), asyncRoute(async (req, res) => {
  const event = await ownedEvent(req.params.eventId, req.user.id);
  if (!event) return res.status(404).json({ success: false, message: 'Event not found' });
  if (!ensureEditable(event, res)) return;
  const ticket = event.tickets.id(req.params.ticketTypeId); if (!ticket) return res.status(404).json({ success: false, message: 'Ticket type not found' });
  const counts = await committedCounts(event);
  if ((counts.get(String(ticket._id)) || 0) > 0) return invalid(res, 'This ticket type has sold or reserved tickets and cannot be deleted. Deactivate it instead.', 409);
  ticket.deleteOne(); await event.save(); send(res, event, 'Ticket type removed');
}));

export default r;
