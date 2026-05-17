import mongoose from 'mongoose';

const CallCenterUserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, default: 'agent' },
  createdAt: { type: Date, default: Date.now },
});

// Prevent overwrite error when model is already compiled (hot reload)
export default mongoose.models.CallCenterUser ||
  mongoose.model('CallCenterUser', CallCenterUserSchema);
