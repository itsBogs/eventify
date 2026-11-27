import mongoose from 'mongoose';

const adminLogSchema = new mongoose.Schema({
  admin: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  action: { type: String, enum: ['remove', 'restore', 'delete'], required: true },
  targetType: { type: String, default: 'event' },
  targetId: { type: mongoose.Schema.Types.ObjectId, required: true },
  targetTitle: { type: String, required: true },
  reason: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now, index: true },
});

export default mongoose.model('AdminLog', adminLogSchema);
