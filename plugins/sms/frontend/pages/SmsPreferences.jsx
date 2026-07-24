import { useState, useEffect, useCallback } from "react";

const DEFAULT_PREFS = {
  signRequests: true,
  signNotifications: true,
  completions: true,
  reminders: true,
};

const PREF_FIELDS = [
  {
    key: "signRequests",
    label: "Sign Requests",
    desc: "Receive SMS when a document is sent to you for signing.",
    icon: "fa-light fa-file-signature",
  },
  {
    key: "signNotifications",
    label: "Signature Notifications",
    desc: "Receive SMS when someone signs your document.",
    icon: "fa-light fa-bell",
  },
  {
    key: "completions",
    label: "Completions",
    desc: "Receive SMS when a document is fully completed by all signers.",
    icon: "fa-light fa-circle-check",
  },
  {
    key: "reminders",
    label: "Reminders",
    desc: "Receive SMS reminders for documents awaiting your signature.",
    icon: "fa-light fa-clock",
  },
];

export default function SmsPreferences() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [prefs, setPrefs] = useState({ ...DEFAULT_PREFS });

  const fetchPrefs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const sessionToken = localStorage.getItem("accesstoken");
      const result = await Parse.Cloud.run(
        "sms_getSmsPreferences",
        {},
        { sessionToken }
      );
      if (result) {
        setPrefs({
          signRequests: result.signRequests ?? DEFAULT_PREFS.signRequests,
          signNotifications:
            result.signNotifications ?? DEFAULT_PREFS.signNotifications,
          completions: result.completions ?? DEFAULT_PREFS.completions,
          reminders: result.reminders ?? DEFAULT_PREFS.reminders,
        });
      }
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchPrefs();
  }, [fetchPrefs]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const sessionToken = localStorage.getItem("accesstoken");
      await Parse.Cloud.run(
        "sms_saveSmsPreferences",
        { ...prefs },
        { sessionToken }
      );
      setSuccess("SMS preferences saved.");
      setTimeout(() => setSuccess(null), 4000);
    } catch (err) {
      setError(err.message);
    }
    setSaving(false);
  };

  const updatePref = (key, value) =>
    setPrefs((p) => ({ ...p, [key]: value }));

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <span className="op-loading op-loading-infinity op-loading-lg" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">SMS Preferences</h1>
          <p className="text-sm text-base-content/60 mt-1">
            Choose which SMS notifications you want to receive.
          </p>
        </div>
        <button
          className="op-btn op-btn-primary op-btn-sm"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? (
            <span className="op-loading op-loading-spinner op-loading-sm" />
          ) : (
            <>
              <i className="fa-light fa-floppy-disk mr-1" /> Save
            </>
          )}
        </button>
      </div>

      {/* Alerts */}
      {error && (
        <div className="op-alert op-alert-error mb-4">
          <i className="fa-light fa-circle-exclamation" />
          <span>{error}</span>
          <button
            className="op-btn op-btn-ghost op-btn-xs"
            onClick={() => setError(null)}
          >
            <i className="fa-light fa-xmark" />
          </button>
        </div>
      )}
      {success && (
        <div className="op-alert op-alert-success mb-4">
          <i className="fa-light fa-circle-check" />
          <span>{success}</span>
          <button
            className="op-btn op-btn-ghost op-btn-xs"
            onClick={() => setSuccess(null)}
          >
            <i className="fa-light fa-xmark" />
          </button>
        </div>
      )}

      <div className="op-card bg-base-100 shadow p-6">
        <div className="space-y-5">
          {PREF_FIELDS.map(({ key, label, desc, icon }) => (
            <div key={key} className="flex items-start gap-3">
              <input
                type="checkbox"
                className="op-toggle op-toggle-primary mt-1"
                checked={prefs[key] || false}
                onChange={(e) => updatePref(key, e.target.checked)}
              />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <i className={`${icon} text-base-content/60`} />
                  <p className="font-medium text-sm">{label}</p>
                </div>
                <p className="text-xs text-base-content/50 mt-0.5">{desc}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="op-divider" />

        <p className="text-xs text-base-content/40">
          <i className="fa-light fa-info-circle mr-1" />
          SMS notifications require a valid phone number on your account and SMS
          consent from your organization admin.
        </p>
      </div>
    </div>
  );
}
