import mongoose from "mongoose";

// Must stay in sync with the Adamas backend's User schema —
// this maps to the same `users` collection.
const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, default: "agent" },
  tokenVersion: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  settings: { type: mongoose.Schema.Types.Mixed, default: {} },
  twilio: {
    accountSid: { type: String, default: "" },
    authToken: { type: String, default: "" },
    phoneNumber: { type: String, default: "" },
  },
});

// Prevent overwrite error when model is already compiled (hot reload)
export default mongoose.models.User || mongoose.model("User", UserSchema);
