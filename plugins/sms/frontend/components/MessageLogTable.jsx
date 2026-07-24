// Paginated SMS message log table.
// Displays delivery status, event type, recipient, and timestamps.

const STATUS_BADGES = {
  delivered: "op-badge-success",
  sent: "op-badge-warning",
  sending: "op-badge-warning",
  queued: "op-badge-ghost",
  failed: "op-badge-error",
  undelivered: "op-badge-error",
  accepted: "op-badge-ghost",
};

const EVENT_LABELS = {
  sign_request: "Sign Request",
  sign_notify: "Sign Notify",
  completed: "Completed",
  reminder: "Reminder",
  test: "Test",
};

function formatDate(dateStr) {
  if (!dateStr) return "-";
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return dateStr;
  }
}

export default function MessageLogTable({
  messages,
  total,
  page,
  pageSize,
  onPageChange,
}) {
  const totalPages = Math.ceil(total / pageSize);

  if (!messages || messages.length === 0) {
    return (
      <div className="text-center py-8 text-base-content/50">
        <i className="fa-light fa-inbox text-3xl mb-2" />
        <p>No messages found.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="op-table op-table-sm w-full">
          <thead>
            <tr>
              <th>Date</th>
              <th>To</th>
              <th>Event</th>
              <th>Status</th>
              <th>Error</th>
            </tr>
          </thead>
          <tbody>
            {messages.map((msg, idx) => (
              <tr key={msg.objectId}>
                <td className="text-xs whitespace-nowrap">
                  {formatDate(msg.sentAt?.iso || msg.sentAt)}
                </td>
                <td className="font-mono text-xs">{msg.to || "-"}</td>
                <td>
                  <span className="text-xs">
                    {EVENT_LABELS[msg.event] || msg.event || "-"}
                  </span>
                </td>
                <td>
                  <span
                    className={`op-badge op-badge-sm ${
                      STATUS_BADGES[msg.status] || "op-badge-ghost"
                    }`}
                  >
                    {msg.status || "unknown"}
                  </span>
                </td>
                <td className="text-xs text-error max-w-[200px] truncate">
                  {msg.errorCode
                    ? `${msg.errorCode}: ${msg.errorMessage || ""}`
                    : "-"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-between items-center mt-4">
          <span className="text-xs text-base-content/50">
            {total} message{total !== 1 ? "s" : ""} total
          </span>
          <div className="op-btn-group">
            <button
              className="op-btn op-btn-sm"
              disabled={page <= 0}
              onClick={() => onPageChange(page - 1)}
            >
              <i className="fa-light fa-chevron-left" />
            </button>
            <button className="op-btn op-btn-sm op-btn-disabled">
              {page + 1} / {totalPages}
            </button>
            <button
              className="op-btn op-btn-sm"
              disabled={page >= totalPages - 1}
              onClick={() => onPageChange(page + 1)}
            >
              <i className="fa-light fa-chevron-right" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
