import mongoose from 'mongoose';

const lineSchema = new mongoose.Schema({
  ticketTypeId: mongoose.Schema.Types.ObjectId,
  name: String,
  quantity: Number,
  unitPrice: Number,
});

const paymentSchema = new mongoose.Schema({
  method: { type: String, enum: ['GCash', 'Maya', 'Bank Transfer', 'Other', ''] , default: '' },
  referenceNumber: { type: String, trim: true, default: '' },
  receiptUrl: { type: String, default: '' },
  receiptPublicId: { type: String, default: '' },
  submittedAt: Date,
  reviewedAt: Date,
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  rejectionReason: { type: String, default: '' },
  hostNote: { type: String, default: '' },
}, { _id: false });

const historySchema = new mongoose.Schema({
  status: String,
  at: { type: Date, default: Date.now },
  by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  note: { type: String, default: '' },
}, { _id: false });

const orderSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
  items: [lineSchema],
  subtotal: Number,
  fees: Number,
  total: Number,
  // `Pending` remains accepted so older documents remain readable.
  status: { type: String, enum: ['Pending Payment', 'Pending Verification', 'Paid', 'Rejected', 'Expired', 'Cancelled', 'Pending', 'Refunded'], default: 'Pending Payment' },
  payment: { type: paymentSchema, default: () => ({}) },
  expiresAt: { type: Date, default: () => new Date(Date.now() + 24 * 60 * 60 * 1000) },
  statusHistory: { type: [historySchema], default: [] },
  reservationReleased: { type: Boolean, default: false },
  paymentReference: String,
}, { timestamps: true });

export default mongoose.model('Order', orderSchema);
