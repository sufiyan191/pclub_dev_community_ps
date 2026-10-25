import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema(
  {
    recipientUserId: { type: Number, required: true, index: true }, // PostgreSQL user.id
    actorUsername: { type: String, required: true },
    type: {
      type: String,
      enum: ['COMMENT_ADDED', 'ANSWER_ACCEPTED', 'UPVOTE_RECEIVED', 'MENTION'],
      required: true,
    },
    message: { type: String, required: true },
    postId: { type: Number, default: null },
    groupId: { type: Number, default: null },
    isRead: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const Notification = mongoose.model('Notification', notificationSchema);