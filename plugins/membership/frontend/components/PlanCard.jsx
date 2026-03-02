function formatStorage(bytes) {
  if (bytes === -1) return "Unlimited";
  if (bytes >= 1073741824) return `${(bytes / 1073741824).toFixed(0)} GB`;
  return `${(bytes / 1048576).toFixed(0)} MB`;
}

function formatLimit(value) {
  if (value === -1) return "Unlimited";
  return String(value);
}

export default function PlanCard({ plan, isCurrent, onUpgrade }) {
  const limits = plan.limits || {};

  return (
    <div className={`op-card bg-base-100 shadow ${isCurrent ? "ring-2 ring-primary" : ""}`}>
      <div className="op-card-body">
        <h3 className="op-card-title">{plan.name}</h3>
        <p className="text-2xl font-bold mt-1">
          {plan.price === 0 ? "Free" : `$${(plan.price / 100).toFixed(0)}/mo`}
        </p>
        <ul className="mt-3 space-y-1 text-sm">
          <li>
            <i className="fa-light fa-check mr-1 text-success" />
            {formatLimit(limits.documentsPerMonth)} docs/month
          </li>
          <li>
            <i className="fa-light fa-check mr-1 text-success" />
            {formatLimit(limits.templates)} templates
          </li>
          <li>
            <i className="fa-light fa-check mr-1 text-success" />
            {formatStorage(limits.storageBytes)} storage
          </li>
          <li>
            <i className="fa-light fa-check mr-1 text-success" />
            {formatLimit(limits.seats)} team seat{limits.seats !== 1 ? "s" : ""}
          </li>
        </ul>
        <div className="op-card-actions mt-4">
          {isCurrent ? (
            <button className="op-btn op-btn-disabled w-full" disabled>
              Current Plan
            </button>
          ) : (
            <button className="op-btn op-btn-primary w-full" onClick={onUpgrade}>
              {plan.price === 0 ? "Downgrade" : "Upgrade"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
