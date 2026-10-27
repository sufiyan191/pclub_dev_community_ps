// Holds the single Socket.io instance so REST controllers can push live events
// (for example notifications) without importing index.js and creating a cycle.
let ioInstance = null;

export const setIO = (io) => {
  ioInstance = io;
};

export const userRoom = (userId) => `user_${userId}`;

// Persist-then-push helper: the notification is already stored in MongoDB by the
// caller; this only delivers it to the recipient if they are online right now.
export const pushToUser = (userId, event, payload) => {
  ioInstance?.to(userRoom(userId)).emit(event, payload);
};
