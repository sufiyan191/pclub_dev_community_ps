import mongoose from 'mongoose';

const groupMessageSchema = new mongoose.Schema(
  {
    groupId: { type: Number, required: true, index: true }, // Links to PostgreSQL groups.id
    senderId: { type: Number, required: true },            // Links to PostgreSQL users.id
    senderUsername: { type: String, required: true },
    senderAvatar: { type: String, default: '' },
    content: { type: String, required: true, maxlength: 2000 },
    codeSnippet: { type: String, default: '' },
  },
  { timestamps: true }
);

export const GroupMessage = mongoose.model('GroupMessage', groupMessageSchema);