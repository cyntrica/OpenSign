export default function UsageBar({ label, current, max, icon, formatValue }) {
  const fmt = formatValue || ((v) => String(v));
  const isUnlimited = max === -1 || max === undefined || max === null;
  const percentage = isUnlimited ? 0 : Math.min(100, Math.round((current / max) * 100));
  const isNearLimit = percentage >= 80;
  const isAtLimit = percentage >= 100;

  return (
    <div className="op-card bg-base-100 shadow">
      <div className="op-card-body p-4">
        <div className="flex items-center gap-2 mb-2">
          <i className={`${icon} text-lg`} />
          <span className="font-medium text-sm">{label}</span>
        </div>
        <div className="flex justify-between text-sm mb-1">
          <span className="font-semibold">{fmt(current)}</span>
          <span className="text-base-content/60">
            {isUnlimited ? "Unlimited" : `of ${fmt(max)}`}
          </span>
        </div>
        {!isUnlimited && (
          <progress
            className={`op-progress w-full ${
              isAtLimit
                ? "op-progress-error"
                : isNearLimit
                ? "op-progress-warning"
                : "op-progress-primary"
            }`}
            value={current}
            max={max}
          />
        )}
      </div>
    </div>
  );
}
