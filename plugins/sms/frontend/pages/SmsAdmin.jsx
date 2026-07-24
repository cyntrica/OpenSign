import { useState, useEffect, useCallback } from "react";
import MessageLogTable from "../components/MessageLogTable";

const DEFAULT_SETTINGS = {
  twilioAccountSid: "",
  twilioAuthToken: "",
  twilioPhoneNumber: "",
  twilioVerifyServiceSid: "",
  enabled: false,
  notifySignersOnSend: true,
  notifyCreatorOnSign: true,
  notifyAllOnComplete: true,
  enableSmsOtp: false,
  enableReminders: false,
  fromNumber: "",
  templates: {},
};

const TEMPLATE_FIELDS = [
  {
    key: "sign_request",
    label: "Sign Request",
    desc: "Sent to signers when a document is created for signing.",
    default:
      '{{sender_name}} sent you "{{document_title}}" to sign: {{signing_url}}',
  },
  {
    key: "sign_notify",
    label: "Signature Notification",
    desc: "Sent to document creator when a signer signs.",
    default:
      '{{signer_name}} signed "{{document_title}}". {{remaining}} signer(s) remaining.',
  },
  {
    key: "completed",
    label: "Completion",
    desc: "Sent to all parties when document is fully signed.",
    default:
      'All parties signed "{{document_title}}". View: {{document_url}}',
  },
  {
    key: "reminder",
    label: "Reminder",
    desc: "Sent to unsigned signers as a reminder.",
    default:
      'Reminder: "{{document_title}}" awaits your signature: {{signing_url}}',
  },
];

const TEMPLATE_VARIABLES = [
  "sender_name",
  "signer_name",
  "receiver_name",
  "document_title",
  "signing_url",
  "document_url",
  "remaining",
  "company_name",
  "expiry_date",
];

// Credential field keys — these get special masking treatment
const CREDENTIAL_KEYS = [
  "twilioAccountSid",
  "twilioAuthToken",
  "twilioPhoneNumber",
  "twilioVerifyServiceSid",
];

export default function SmsAdmin() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeTab, setActiveTab] = useState("config");
  const [form, setForm] = useState({ ...DEFAULT_SETTINGS });

  // Credential masking: store masked hints separately and track dirty fields
  const [credentialHints, setCredentialHints] = useState({});
  const [dirtyCredentials, setDirtyCredentials] = useState(new Set());

  // Test SMS state
  const [testPhone, setTestPhone] = useState("");
  const [testSending, setTestSending] = useState(false);
  const [testResult, setTestResult] = useState(null);

  // Message log state
  const [messages, setMessages] = useState([]);
  const [logTotal, setLogTotal] = useState(0);
  const [logPage, setLogPage] = useState(0);
  const [logLoading, setLogLoading] = useState(false);
  const [logFilter, setLogFilter] = useState({ event: "", status: "" });

  // Client-side admin check (backend enforces server-side)
  useEffect(() => {
    try {
      const extClass = JSON.parse(
        localStorage.getItem("Extand_Class") || "[]"
      );
      const role = extClass?.[0]?.UserRole || "";
      setIsAdmin(
        role === "contracts_Admin" || role === "contracts_OrgAdmin"
      );
    } catch {
      setIsAdmin(false);
    }
  }, []);

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const sessionToken = localStorage.getItem("accesstoken");
      const result = await Parse.Cloud.run(
        "sms_getSettings",
        {},
        { sessionToken }
      );
      if (result) {
        // Store masked credential values as placeholder hints — never put them in form state
        const hints = {};
        for (const key of CREDENTIAL_KEYS) {
          const masked = result[key] || "";
          hints[key] = masked; // e.g. "••••••••d162" or ""
        }
        setCredentialHints(hints);
        setDirtyCredentials(new Set());

        // Credential form values start empty — only user-typed values go here
        setForm({
          twilioAccountSid: "",
          twilioAuthToken: "",
          twilioPhoneNumber: "",
          twilioVerifyServiceSid: "",
          enabled: result.enabled ?? DEFAULT_SETTINGS.enabled,
          notifySignersOnSend:
            result.notifySignersOnSend ??
            DEFAULT_SETTINGS.notifySignersOnSend,
          notifyCreatorOnSign:
            result.notifyCreatorOnSign ??
            DEFAULT_SETTINGS.notifyCreatorOnSign,
          notifyAllOnComplete:
            result.notifyAllOnComplete ??
            DEFAULT_SETTINGS.notifyAllOnComplete,
          enableSmsOtp:
            result.enableSmsOtp ?? DEFAULT_SETTINGS.enableSmsOtp,
          enableReminders:
            result.enableReminders ?? DEFAULT_SETTINGS.enableReminders,
          fromNumber: result.fromNumber || "",
          templates: result.templates || {},
        });
      }
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  }, []);

  const fetchLog = useCallback(
    async (page = 0) => {
      setLogLoading(true);
      try {
        const sessionToken = localStorage.getItem("accesstoken");
        const result = await Parse.Cloud.run(
          "sms_getMessageLog",
          {
            skip: page * 25,
            limit: 25,
            event: logFilter.event || undefined,
            status: logFilter.status || undefined,
          },
          { sessionToken }
        );
        setMessages(result?.messages || []);
        setLogTotal(result?.total || 0);
        setLogPage(page);
      } catch (err) {
        setError(err.message);
      }
      setLogLoading(false);
    },
    [logFilter]
  );

  useEffect(() => {
    if (isAdmin) fetchSettings();
    else setLoading(false);
  }, [isAdmin, fetchSettings]);

  useEffect(() => {
    if (isAdmin && activeTab === "log") fetchLog(0);
  }, [isAdmin, activeTab, fetchLog]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      // Build payload: only include credential fields the user actually typed into
      const payload = { ...form };
      for (const key of CREDENTIAL_KEYS) {
        if (!dirtyCredentials.has(key)) {
          delete payload[key]; // Omit unchanged credentials entirely
        }
      }
      const sessionToken = localStorage.getItem("accesstoken");
      await Parse.Cloud.run("sms_saveSettings", payload, { sessionToken });
      setSuccess("SMS settings saved.");
      setTimeout(() => setSuccess(null), 4000);
      // Re-fetch to update masked hints (e.g. if user entered a new credential)
      if (dirtyCredentials.size > 0) {
        fetchSettings();
      }
    } catch (err) {
      setError(err.message);
    }
    setSaving(false);
  };

  const handleTestSms = async () => {
    if (!testPhone.trim()) return;
    setTestSending(true);
    setTestResult(null);
    setError(null);
    try {
      const sessionToken = localStorage.getItem("accesstoken");
      const result = await Parse.Cloud.run(
        "sms_sendTestSms",
        { to: testPhone },
        { sessionToken }
      );
      setTestResult(result);
    } catch (err) {
      setError(err.message);
    }
    setTestSending(false);
  };

  const updateForm = (key, value) =>
    setForm((f) => ({ ...f, [key]: value }));

  const updateTemplate = (key, value) =>
    setForm((f) => ({
      ...f,
      templates: { ...f.templates, [key]: value },
    }));

  // Access denied
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
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">SMS Notifications</h1>
        {activeTab !== "log" && activeTab !== "test" && (
          <button
            className="op-btn op-btn-primary op-btn-sm"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? (
              <span className="op-loading op-loading-spinner op-loading-sm" />
            ) : (
              <>
                <i className="fa-light fa-floppy-disk mr-1" /> Save Changes
              </>
            )}
          </button>
        )}
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

      {/* Tabs */}
      <div className="op-tabs op-tabs-bordered mb-6">
        {[
          { id: "config", label: "Configuration", icon: "fa-light fa-gear" },
          {
            id: "templates",
            label: "Templates",
            icon: "fa-light fa-message-lines",
          },
          { id: "log", label: "Message Log", icon: "fa-light fa-list" },
          { id: "test", label: "Test", icon: "fa-light fa-flask" },
        ].map((tab) => (
          <button
            key={tab.id}
            className={`op-tab op-tab-bordered ${
              activeTab === tab.id ? "op-tab-active" : ""
            }`}
            onClick={() => setActiveTab(tab.id)}
          >
            <i className={`${tab.icon} mr-1`} /> {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="op-card bg-base-100 shadow p-6">
        {activeTab === "config" && (
          <ConfigTab
            form={form}
            updateForm={updateForm}
            credentialHints={credentialHints}
            dirtyCredentials={dirtyCredentials}
            onCredentialChange={(key, value) => {
              updateForm(key, value);
              setDirtyCredentials((prev) => new Set(prev).add(key));
            }}
          />
        )}
        {activeTab === "templates" && (
          <TemplatesTab
            templates={form.templates}
            updateTemplate={updateTemplate}
          />
        )}
        {activeTab === "log" && (
          <LogTab
            messages={messages}
            total={logTotal}
            page={logPage}
            loading={logLoading}
            filter={logFilter}
            setFilter={setLogFilter}
            onPageChange={fetchLog}
          />
        )}
        {activeTab === "test" && (
          <TestTab
            phone={testPhone}
            setPhone={setTestPhone}
            sending={testSending}
            result={testResult}
            onSend={handleTestSms}
          />
        )}
      </div>
    </div>
  );
}

// ── Tab Components ──

function ConfigTab({
  form,
  updateForm,
  credentialHints,
  dirtyCredentials,
  onCredentialChange,
}) {
  const credentialFields = [
    {
      key: "twilioAccountSid",
      label: "Account SID",
      emptyPlaceholder: "ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
      type: "text",
      desc: "Your Twilio Account SID (starts with AC).",
    },
    {
      key: "twilioAuthToken",
      label: "Auth Token",
      emptyPlaceholder: "Enter auth token",
      type: "password",
      desc: "Your Twilio Auth Token.",
    },
    {
      key: "twilioPhoneNumber",
      label: "Phone Number",
      emptyPlaceholder: "+15551234567",
      type: "text",
      desc: "Default Twilio phone number for sending SMS (E.164 format).",
    },
    {
      key: "twilioVerifyServiceSid",
      label: "Verify Service SID",
      emptyPlaceholder: "VAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
      type: "text",
      desc: "Twilio Verify Service SID for OTP (starts with VA).",
    },
  ];

  const toggles = [
    {
      key: "enabled",
      label: "Enable SMS Notifications",
      desc: "Master switch for all SMS features.",
    },
    {
      key: "notifySignersOnSend",
      label: "Notify Signers on Document Send",
      desc: "SMS signers when a document is sent for signing.",
    },
    {
      key: "notifyCreatorOnSign",
      label: "Notify Creator on Signature",
      desc: "SMS the document creator when a signer signs.",
    },
    {
      key: "notifyAllOnComplete",
      label: "Notify All on Completion",
      desc: "SMS all parties when the document is fully signed.",
    },
    {
      key: "enableSmsOtp",
      label: "SMS OTP Verification",
      desc: "Use Twilio Verify for OTP codes instead of email.",
    },
    {
      key: "enableReminders",
      label: "SMS Reminders",
      desc: "Send SMS reminders for unsigned documents.",
    },
  ];

  return (
    <div className="space-y-4">
      {/* Twilio Credentials */}
      <div>
        <h3 className="text-lg font-semibold mb-1">
          <i className="fa-light fa-key mr-2 text-base-content/60" />
          Twilio Credentials
        </h3>
        <p className="text-xs text-base-content/50 mb-4">
          Enter your Twilio account credentials. These are stored securely
          per-tenant.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {credentialFields.map(
            ({ key, label, emptyPlaceholder, type, desc }) => {
              const hint = credentialHints[key] || "";
              const hasSaved = hint.length > 0;
              const isDirty = dirtyCredentials.has(key);
              // Show masked hint as placeholder when value is saved but user hasn't typed
              const placeholder = hasSaved && !isDirty
                ? `${hint}  \u2014 saved`
                : emptyPlaceholder;

              return (
                <div key={key} className="op-form-control">
                  <label className="label">
                    <span className="label-text font-medium text-sm">
                      {label}
                    </span>
                    {hasSaved && !isDirty && (
                      <span className="label-text-alt text-success text-xs">
                        <i className="fa-light fa-circle-check mr-1" />
                        Configured
                      </span>
                    )}
                  </label>
                  <input
                    type={type}
                    className="op-input op-input-bordered w-full text-sm"
                    value={form[key] || ""}
                    onChange={(e) => onCredentialChange(key, e.target.value)}
                    placeholder={placeholder}
                    autoComplete="off"
                  />
                  <label className="label">
                    <span className="label-text-alt text-base-content/40">
                      {desc}
                    </span>
                    {isDirty && (
                      <span className="label-text-alt text-warning text-xs">
                        Modified
                      </span>
                    )}
                  </label>
                </div>
              );
            }
          )}
        </div>
      </div>

      <div className="op-divider" />

      {/* Feature Toggles */}
      <div>
        <h3 className="text-lg font-semibold mb-3">
          <i className="fa-light fa-sliders mr-2 text-base-content/60" />
          Features
        </h3>
        <div className="space-y-4">
          {toggles.map(({ key, label, desc }) => (
            <div key={key} className="flex items-start gap-3">
              <input
                type="checkbox"
                className="op-toggle op-toggle-primary mt-1"
                checked={form[key] || false}
                onChange={(e) => updateForm(key, e.target.checked)}
              />
              <div>
                <p className="font-medium text-sm">{label}</p>
                <p className="text-xs text-base-content/50">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="op-divider" />

      {/* From Number Override */}
      <div>
        <h3 className="text-lg font-semibold mb-3">
          <i className="fa-light fa-phone mr-2 text-base-content/60" />
          Sender Override
        </h3>
        <div className="op-form-control">
          <label className="label">
            <span className="label-text font-medium">
              From Phone Number (Override)
            </span>
          </label>
          <input
            type="text"
            className="op-input op-input-bordered w-full max-w-md"
            value={form.fromNumber}
            onChange={(e) => updateForm("fromNumber", e.target.value)}
            placeholder="+15551234567 (leave blank to use default above)"
          />
          <label className="label">
            <span className="label-text-alt text-base-content/50">
              Optional override for the sender number. Leave blank to use the
              Twilio Phone Number configured above.
            </span>
          </label>
        </div>
      </div>
    </div>
  );
}

function TemplatesTab({ templates, updateTemplate }) {
  return (
    <div className="space-y-6">
      <p className="text-sm text-base-content/60">
        Customize SMS message templates. Leave blank to use the default.
        Templates support variable placeholders.
      </p>

      <div className="flex flex-wrap gap-1 mb-2">
        <span className="text-xs text-base-content/50 mr-1">Variables:</span>
        {TEMPLATE_VARIABLES.map((v) => (
          <code
            key={v}
            className="text-xs bg-base-200 px-1.5 py-0.5 rounded"
          >
            {`{{${v}}}`}
          </code>
        ))}
      </div>

      {TEMPLATE_FIELDS.map(({ key, label, desc, default: defaultText }) => (
        <div key={key} className="op-form-control">
          <label className="label">
            <span className="label-text font-medium">{label}</span>
          </label>
          <textarea
            className="op-textarea op-textarea-bordered w-full"
            rows={2}
            value={templates[key] || ""}
            onChange={(e) => updateTemplate(key, e.target.value)}
            placeholder={defaultText}
          />
          <label className="label">
            <span className="label-text-alt text-base-content/50">
              {desc}
            </span>
            <span className="label-text-alt text-base-content/40">
              {(templates[key] || "").length}/320
            </span>
          </label>
        </div>
      ))}
    </div>
  );
}

function LogTab({
  messages,
  total,
  page,
  loading,
  filter,
  setFilter,
  onPageChange,
}) {
  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <select
          className="op-select op-select-bordered op-select-sm"
          value={filter.event}
          onChange={(e) =>
            setFilter((f) => ({ ...f, event: e.target.value }))
          }
        >
          <option value="">All Events</option>
          <option value="sign_request">Sign Request</option>
          <option value="sign_notify">Sign Notify</option>
          <option value="completed">Completed</option>
          <option value="reminder">Reminder</option>
          <option value="test">Test</option>
        </select>
        <select
          className="op-select op-select-bordered op-select-sm"
          value={filter.status}
          onChange={(e) =>
            setFilter((f) => ({ ...f, status: e.target.value }))
          }
        >
          <option value="">All Statuses</option>
          <option value="delivered">Delivered</option>
          <option value="sent">Sent</option>
          <option value="queued">Queued</option>
          <option value="failed">Failed</option>
          <option value="undelivered">Undelivered</option>
        </select>
        <button
          className="op-btn op-btn-outline op-btn-sm"
          onClick={() => onPageChange(0)}
        >
          <i className="fa-light fa-arrows-rotate mr-1" /> Refresh
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <span className="op-loading op-loading-spinner op-loading-md" />
        </div>
      ) : (
        <MessageLogTable
          messages={messages}
          total={total}
          page={page}
          pageSize={25}
          onPageChange={onPageChange}
        />
      )}
    </div>
  );
}

function TestTab({ phone, setPhone, sending, result, onSend }) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-base-content/60">
        Send a test SMS to verify your Twilio configuration is working.
      </p>

      <div className="flex gap-2 items-end">
        <div className="op-form-control flex-1 max-w-md">
          <label className="label">
            <span className="label-text font-medium">Phone Number</span>
          </label>
          <input
            type="text"
            className="op-input op-input-bordered w-full"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+15551234567"
          />
          <label className="label">
            <span className="label-text-alt text-base-content/40">
              E.164 format: +[country code][number] (e.g. +15551234567)
            </span>
            {phone.trim() && !/^\+?[1-9]\d{6,14}$/.test(phone.replace(/[\s\-()]/g, "")) && (
              <span className="label-text-alt text-error">Invalid phone number</span>
            )}
          </label>
        </div>
        <button
          className="op-btn op-btn-primary op-btn-sm"
          onClick={onSend}
          disabled={sending || !phone.trim() || !/^\+?[1-9]\d{6,14}$/.test(phone.replace(/[\s\-()]/g, ""))}
        >
          {sending ? (
            <span className="op-loading op-loading-spinner op-loading-sm" />
          ) : (
            <>
              <i className="fa-light fa-paper-plane mr-1" /> Send Test
            </>
          )}
        </button>
      </div>

      {result && (
        <div className="op-alert op-alert-success">
          <div>
            <p className="font-medium">Test SMS sent successfully!</p>
            <p className="text-sm">
              SID: <code className="text-xs">{result.sid}</code> | Status:{" "}
              <code className="text-xs">{result.status}</code>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
