// Twilio message status ordering.
// Status callbacks may arrive out of order. This utility ensures
// we never downgrade a message status (e.g., from 'delivered' back to 'sent').

const STATUS_RANK = {
  accepted: 0,
  queued: 1,
  sending: 2,
  sent: 3,
  delivered: 4,
  undelivered: 5,
  failed: 6,
};

/**
 * Returns true if `newStatus` should replace `currentStatus`.
 * Terminal statuses (delivered, undelivered, failed) always rank highest.
 */
export function shouldUpdateStatus(currentStatus, newStatus) {
  const currentRank = STATUS_RANK[currentStatus] ?? -1;
  const newRank = STATUS_RANK[newStatus] ?? -1;
  return newRank > currentRank;
}

/**
 * Returns true if the status is terminal (no further updates expected).
 */
export function isTerminalStatus(status) {
  return ['delivered', 'undelivered', 'failed'].includes(status);
}
