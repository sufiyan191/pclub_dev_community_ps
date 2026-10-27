"use client";
import { timeAgo } from "../lib/format";

export default function NotificationsPopover({ open, notifications, onClose }) {
  return (
    <>
      {open && <div className="fixed inset-0 z-40" onClick={onClose} aria-hidden="true" />}
      <section
        aria-label="Notifications"
        aria-hidden={!open}
        className={`glass fixed z-50 flex max-h-[min(26rem,60dvh)] flex-col rounded-3xl transition duration-300 ease-spatial
          inset-x-3 bottom-[calc(5.5rem+env(safe-area-inset-bottom))]
          lg:inset-x-auto lg:bottom-auto lg:left-[6.5rem] lg:top-[9.5rem] lg:w-80 ${
            open
              ? "translate-y-0 opacity-100"
              : "pointer-events-none translate-y-3 opacity-0 lg:-translate-x-3 lg:translate-y-0"
          }`}
      >
        <h2 className="px-5 pb-2 pt-4 text-sm font-semibold">Notifications</h2>
        <div className="space-y-1.5 overflow-y-auto px-3 pb-3">
          {notifications.length === 0 ? (
            <p className="px-2 py-6 text-center text-sm text-white/60">
              Nothing yet. You’ll be told here when someone answers your question or accepts your answer.
            </p>
          ) : (
            notifications.map((n) => (
              <div
                key={n._id}
                className={`rounded-2xl px-3 py-2.5 text-sm ${n.isRead ? "bg-white/5 text-white/75" : "bg-white/12 text-white"}`}
              >
                <p>{n.message}</p>
                <p className="mt-0.5 text-xs text-white/50">{timeAgo(n.createdAt)}</p>
              </div>
            ))
          )}
        </div>
      </section>
    </>
  );
}
