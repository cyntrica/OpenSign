import { useState, useEffect, useCallback } from "react";

const EMPTY_PLAN = {
  name: "",
  slug: "",
  price: 0,
  currency: "usd",
  isActive: true,
  sortOrder: 0,
  stripePriceId: "",
  stripeProductId: "",
  limits: {
    documentsPerMonth: 5,
    templates: 3,
    storageMB: 100,
    seats: 1,
  },
};

function formatStorage(bytes) {
  if (bytes === -1) return "Unlimited";
  if (bytes >= 1073741824) return `${(bytes / 1073741824).toFixed(0)} GB`;
  return `${(bytes / 1048576).toFixed(0)} MB`;
}

function formatLimit(v) {
  return v === -1 ? "Unlimited" : String(v);
}

export default function PlanAdmin() {
  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState([]);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_PLAN });
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);

  // Admin role check
  useEffect(() => {
    try {
      const extClass = JSON.parse(localStorage.getItem("Extand_Class") || "[]");
      const role = extClass?.[0]?.UserRole || "";
      setIsAdmin(role === "contracts_Admin" || role === "contracts_OrgAdmin");
    } catch {
      setIsAdmin(false);
    }
  }, []);

  const fetchPlans = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const sessionToken = localStorage.getItem("accesstoken");
      const result = await Parse.Cloud.run("membership_getPlans", { includeInactive: true }, { sessionToken });
      setPlans(Array.isArray(result) ? result : []);
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (isAdmin) fetchPlans();
    else setLoading(false);
  }, [isAdmin, fetchPlans]);

  const openCreate = () => {
    setEditingId(null);
    setForm({ ...EMPTY_PLAN, limits: { ...EMPTY_PLAN.limits } });
    setModalOpen(true);
  };

  const openEdit = (plan) => {
    setEditingId(plan.objectId);
    const limits = plan.limits || {};
    setForm({
      name: plan.name || "",
      slug: plan.slug || "",
      price: plan.price ?? 0,
      currency: plan.currency || "usd",
      isActive: plan.isActive ?? true,
      sortOrder: plan.sortOrder ?? 0,
      stripePriceId: plan.stripePriceId || "",
      stripeProductId: plan.stripeProductId || "",
      limits: {
        documentsPerMonth: limits.documentsPerMonth ?? 5,
        templates: limits.templates ?? 3,
        storageMB: limits.storageBytes === -1 ? -1 : Math.round((limits.storageBytes || 0) / 1048576),
        seats: limits.seats ?? 1,
      },
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const sessionToken = localStorage.getItem("accesstoken");
      const payload = {
        name: form.name,
        slug: form.slug,
        price: Number(form.price) || 0,
        currency: form.currency || "usd",
        isActive: form.isActive,
        sortOrder: Number(form.sortOrder) || 0,
        stripePriceId: form.stripePriceId || null,
        stripeProductId: form.stripeProductId || null,
        limits: {
          documentsPerMonth: Number(form.limits.documentsPerMonth),
          templates: Number(form.limits.templates),
          storageBytes: form.limits.storageMB === -1 ? -1 : Number(form.limits.storageMB) * 1048576,
          seats: Number(form.limits.seats),
        },
      };
      if (editingId) payload.objectId = editingId;
      await Parse.Cloud.run("membership_savePlan", payload, { sessionToken });
      setModalOpen(false);
      setSuccess(editingId ? "Plan updated." : "Plan created.");
      await fetchPlans();
    } catch (err) {
      setError(err.message);
    }
    setSaving(false);
  };

  const handleDelete = async (plan) => {
    if (!confirm(`Delete plan "${plan.name}"? This cannot be undone.`)) return;
    setDeleting(plan.objectId);
    setError(null);
    setSuccess(null);
    try {
      const sessionToken = localStorage.getItem("accesstoken");
      await Parse.Cloud.run("membership_deletePlan", { objectId: plan.objectId }, { sessionToken });
      setSuccess(`Plan "${plan.name}" deleted.`);
      await fetchPlans();
    } catch (err) {
      setError(err.message);
    }
    setDeleting(null);
  };

  const updateForm = (key, value) => setForm((f) => ({ ...f, [key]: value }));
  const updateLimit = (key, value) =>
    setForm((f) => ({ ...f, limits: { ...f.limits, [key]: value } }));

  // Auto-generate slug from name
  const handleNameChange = (value) => {
    updateForm("name", value);
    if (!editingId) {
      updateForm("slug", value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-+$/, ""));
    }
  };

  if (!isAdmin) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="text-center">
          <i className="fa-light fa-lock text-4xl text-base-content/30 mb-4" />
          <p className="text-base-content/60">Admin access required.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <span className="op-loading op-loading-infinity op-loading-lg" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Plan Management</h1>
        <button className="op-btn op-btn-primary op-btn-sm" onClick={openCreate}>
          <i className="fa-light fa-plus mr-1" /> Add Plan
        </button>
      </div>

      {error && (
        <div className="op-alert op-alert-error mb-4">
          <i className="fa-light fa-circle-exclamation" />
          <span>{error}</span>
          <button className="op-btn op-btn-ghost op-btn-xs" onClick={() => setError(null)}>
            <i className="fa-light fa-xmark" />
          </button>
        </div>
      )}

      {success && (
        <div className="op-alert op-alert-success mb-4">
          <i className="fa-light fa-circle-check" />
          <span>{success}</span>
          <button className="op-btn op-btn-ghost op-btn-xs" onClick={() => setSuccess(null)}>
            <i className="fa-light fa-xmark" />
          </button>
        </div>
      )}

      {/* Plans Table */}
      <div className="op-card bg-base-100 shadow overflow-x-auto">
        <table className="op-table op-table-zebra w-full">
          <thead>
            <tr>
              <th>Name</th>
              <th>Slug</th>
              <th>Price</th>
              <th>Docs/mo</th>
              <th>Templates</th>
              <th>Storage</th>
              <th>Seats</th>
              <th>Active</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {plans.length === 0 && (
              <tr>
                <td colSpan={9} className="text-center text-base-content/60 py-8">
                  No plans found.
                </td>
              </tr>
            )}
            {plans.map((plan) => {
              const lim = plan.limits || {};
              return (
                <tr key={plan.objectId}>
                  <td className="font-medium">{plan.name}</td>
                  <td className="text-sm text-base-content/60">{plan.slug}</td>
                  <td>{plan.price === 0 ? "Free" : `$${(plan.price / 100).toFixed(2)}/mo`}</td>
                  <td>{formatLimit(lim.documentsPerMonth)}</td>
                  <td>{formatLimit(lim.templates)}</td>
                  <td>{formatStorage(lim.storageBytes)}</td>
                  <td>{formatLimit(lim.seats)}</td>
                  <td>
                    {plan.isActive ? (
                      <span className="op-badge op-badge-success op-badge-sm">Yes</span>
                    ) : (
                      <span className="op-badge op-badge-ghost op-badge-sm">No</span>
                    )}
                  </td>
                  <td>
                    <div className="flex gap-1">
                      <button
                        className="op-btn op-btn-ghost op-btn-xs"
                        onClick={() => openEdit(plan)}
                        title="Edit"
                      >
                        <i className="fa-light fa-pencil" />
                      </button>
                      <button
                        className="op-btn op-btn-ghost op-btn-xs text-error"
                        onClick={() => handleDelete(plan)}
                        disabled={plan.slug === "free" || deleting === plan.objectId}
                        title={plan.slug === "free" ? "Cannot delete free plan" : "Delete"}
                      >
                        {deleting === plan.objectId ? (
                          <span className="op-loading op-loading-spinner op-loading-xs" />
                        ) : (
                          <i className="fa-light fa-trash" />
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Edit/Create Modal */}
      {modalOpen && (
        <dialog className="op-modal op-modal-open">
          <div className="op-modal-box max-w-lg">
            <h3 className="font-bold text-lg mb-4">
              {editingId ? "Edit Plan" : "Create Plan"}
            </h3>

            <div className="space-y-3">
              {/* Name */}
              <div className="op-form-control">
                <label className="label">
                  <span className="label-text">Name</span>
                </label>
                <input
                  type="text"
                  className="op-input op-input-bordered w-full"
                  value={form.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="e.g. Professional"
                />
              </div>

              {/* Slug */}
              <div className="op-form-control">
                <label className="label">
                  <span className="label-text">Slug</span>
                </label>
                <input
                  type="text"
                  className="op-input op-input-bordered w-full"
                  value={form.slug}
                  onChange={(e) => updateForm("slug", e.target.value)}
                  placeholder="e.g. professional"
                  disabled={editingId && form.slug === "free"}
                />
              </div>

              {/* Price */}
              <div className="op-form-control">
                <label className="label">
                  <span className="label-text">
                    Price (cents){" "}
                    <span className="text-base-content/50">
                      {form.price > 0 ? `= $${(form.price / 100).toFixed(2)}/mo` : "= Free"}
                    </span>
                  </span>
                </label>
                <input
                  type="number"
                  className="op-input op-input-bordered w-full"
                  value={form.price}
                  onChange={(e) => updateForm("price", e.target.value)}
                  min="0"
                />
              </div>

              {/* Limits */}
              <div className="op-divider text-sm">Usage Limits</div>
              <p className="text-xs text-base-content/50 -mt-2">
                Use -1 for unlimited
              </p>

              <div className="grid grid-cols-2 gap-3">
                <div className="op-form-control">
                  <label className="label">
                    <span className="label-text text-sm">Docs/month</span>
                  </label>
                  <input
                    type="number"
                    className="op-input op-input-bordered op-input-sm w-full"
                    value={form.limits.documentsPerMonth}
                    onChange={(e) => updateLimit("documentsPerMonth", e.target.value)}
                    min="-1"
                  />
                </div>
                <div className="op-form-control">
                  <label className="label">
                    <span className="label-text text-sm">Templates</span>
                  </label>
                  <input
                    type="number"
                    className="op-input op-input-bordered op-input-sm w-full"
                    value={form.limits.templates}
                    onChange={(e) => updateLimit("templates", e.target.value)}
                    min="-1"
                  />
                </div>
                <div className="op-form-control">
                  <label className="label">
                    <span className="label-text text-sm">Storage (MB)</span>
                  </label>
                  <input
                    type="number"
                    className="op-input op-input-bordered op-input-sm w-full"
                    value={form.limits.storageMB}
                    onChange={(e) => updateLimit("storageMB", e.target.value)}
                    min="-1"
                  />
                </div>
                <div className="op-form-control">
                  <label className="label">
                    <span className="label-text text-sm">Seats</span>
                  </label>
                  <input
                    type="number"
                    className="op-input op-input-bordered op-input-sm w-full"
                    value={form.limits.seats}
                    onChange={(e) => updateLimit("seats", e.target.value)}
                    min="-1"
                  />
                </div>
              </div>

              {/* Stripe IDs */}
              <div className="op-divider text-sm">Stripe (optional)</div>

              <div className="grid grid-cols-2 gap-3">
                <div className="op-form-control">
                  <label className="label">
                    <span className="label-text text-sm">Price ID</span>
                  </label>
                  <input
                    type="text"
                    className="op-input op-input-bordered op-input-sm w-full"
                    value={form.stripePriceId}
                    onChange={(e) => updateForm("stripePriceId", e.target.value)}
                    placeholder="price_..."
                  />
                </div>
                <div className="op-form-control">
                  <label className="label">
                    <span className="label-text text-sm">Product ID</span>
                  </label>
                  <input
                    type="text"
                    className="op-input op-input-bordered op-input-sm w-full"
                    value={form.stripeProductId}
                    onChange={(e) => updateForm("stripeProductId", e.target.value)}
                    placeholder="prod_..."
                  />
                </div>
              </div>

              {/* Active + Sort Order */}
              <div className="flex items-center gap-6 mt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    className="op-checkbox op-checkbox-sm op-checkbox-primary"
                    checked={form.isActive}
                    onChange={(e) => updateForm("isActive", e.target.checked)}
                  />
                  <span className="text-sm">Active</span>
                </label>
                <div className="op-form-control flex-row items-center gap-2">
                  <span className="text-sm">Sort order:</span>
                  <input
                    type="number"
                    className="op-input op-input-bordered op-input-xs w-16"
                    value={form.sortOrder}
                    onChange={(e) => updateForm("sortOrder", e.target.value)}
                    min="0"
                  />
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="op-modal-action">
              <button
                className="op-btn op-btn-ghost"
                onClick={() => setModalOpen(false)}
                disabled={saving}
              >
                Cancel
              </button>
              <button
                className="op-btn op-btn-primary"
                onClick={handleSave}
                disabled={saving || !form.name || !form.slug}
              >
                {saving ? (
                  <span className="op-loading op-loading-spinner op-loading-sm" />
                ) : editingId ? (
                  "Save Changes"
                ) : (
                  "Create Plan"
                )}
              </button>
            </div>
          </div>
          <form method="dialog" className="op-modal-backdrop">
            <button onClick={() => setModalOpen(false)}>close</button>
          </form>
        </dialog>
      )}
    </div>
  );
}
