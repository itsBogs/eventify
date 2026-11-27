import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  type: { type: String, enum: ['event_removed', 'event_restored'], required: true },
  event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', default: null },
  eventTitle: { type: String, required: true },
  reason: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now, index: true },
});

export default mongoose.model('Notification', notificationSchema);
