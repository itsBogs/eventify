import Order from '../models/Order.js';
import Event from '../models/Event.js';

export const ORDER_EXPIRY_HOURS = Number(process.env.ORDER_EXPIRY_HOURS) || 24;
const unpaidStatuses = ['Pending Payment', 'Pending Verification', 'Rejected', 'Pending'];

export async function expireOverdueOrders() {
  const now = new Date();
  const cutoff = new Date(now.getTime() - ORDER_EXPIRY_HOURS * 60 * 60 * 1000);
  const due = { $or: [{ expiresAt: { $lte: now } }, { expiresAt: { $exists: false }, createdAt: { $lte: cutoff } }] };
  const expired = await Order.find({ status: { $in: unpaidStatuses }, ...due, reservationReleased: { $ne: true } }).select('_id user event items');
  for (const candidate of expired) {
    const order = await Order.findOneAndUpdate(
      { _id: candidate._id, status: { $in: unpaidStatuses }, ...due, reservationReleased: { $ne: true } },
      { $set: { status: 'Expired', reservationReleased: true }, $push: { statusHistory: { status: 'Expired', at: new Date(), note: 'Payment window expired; ticket reservation released.' } } },
      { new: true },
    );
    if (!order) continue;
    const increments = new Map();
    for (const item of order.items) increments.set(String(item.ticketTypeId), (increments.get(String(item.ticketTypeId)) || 0) + Number(item.quantity || 0));
    const event = await Event.findById(order.event);
    if (event) {
      for (const [ticketId, quantity] of increments) await Event.updateOne({ _id: event._id, 'tickets._id': ticketId }, { $inc: { 'tickets.$.sold': -quantity, __v: 1 } });
    }
  }
  return expired.length;
}
