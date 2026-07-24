import { useState, useEffect, useCallback } from "react";
import SocialLinkEditor from "../components/SocialLinkEditor";

// DaisyUI color tokens for the theme editor
const THEME_TOKENS = [
  { key: "primary", label: "Primary" },
  { key: "primary-content", label: "Primary Content" },
  { key: "secondary", label: "Secondary" },
  { key: "secondary-content", label: "Secondary Content" },
  { key: "accent", label: "Accent" },
  { key: "accent-content", label: "Accent Content" },
  { key: "neutral", label: "Neutral" },
  { key: "neutral-content", label: "Neutral Content" },
  { key: "base-100", label: "Base 100" },
  { key: "base-200", label: "Base 200" },
  { key: "base-300", label: "Base 300" },
  { key: "base-content", label: "Base Content" },
  { key: "info", label: "Info" },
  { key: "success", label: "Success" },
  { key: "warning", label: "Warning" },
  { key: "error", label: "Error" },
];

// Default values: authoritative source is plugins/branding/backend/lib/defaults.js
// These must be kept in sync if changed.
const DEFAULT_FORM = {
  appName: "SineSeal",
  logoUrl: "",
  logoDarkUrl: "",
  faviconUrl: "",
  footerText: "",
  footerUrl: "",
  emailLogoUrl: "",
  loginImageUrl: "",
  socialLinks: [],
  themeLight: {},
  themeDark: {},
};

export default function BrandingAdmin() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeTab, setActiveTab] = useState("general");
  const [form, setForm] = useState({ ...DEFAULT_FORM });
  const [uploading, setUploading] = useState(null);

  // NOTE: This client-side role check is for UI gating only.
  // All mutations are enforced server-side by requireAdmin().
  // A user who modifies localStorage can see this page but cannot save changes.
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

  // Fetch current branding settings
  const fetchSettings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const sessionToken = localStorage.getItem("accesstoken");
      const result = await Parse.Cloud.run(
        "branding_getSettings",
        {},
        { sessionToken }
      );
      if (result) {
        setForm({
          appName: result.appName || DEFAULT_FORM.appName,
          logoUrl: result.logoUrl || "",
          logoDarkUrl: result.logoDarkUrl || "",
          faviconUrl: result.faviconUrl || "",
          footerText: result.footerText || "",
          footerUrl: result.footerUrl || "",
          emailLogoUrl: result.emailLogoUrl || "",
          loginImageUrl: result.loginImageUrl || "",
          socialLinks: Array.isArray(result.socialLinks)
            ? result.socialLinks
            : [],
          themeLight: result.themeLight || {},
          themeDark: result.themeDark || {},
        });
      }
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (isAdmin) fetchSettings();
    else setLoading(false);
  }, [isAdmin, fetchSettings]);

  // Save all settings
  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const sessionToken = localStorage.getItem("accesstoken");
      await Parse.Cloud.run("branding_saveSettings", { ...form }, { sessionToken });
      setSuccess("Branding settings saved. Refresh the page to see changes.");
      // Update localStorage cache for immediate effect
      localStorage.setItem("branding_appName", form.appName);
      try {
        localStorage.setItem("branding", JSON.stringify(form));
      } catch { /* ignore */ }
    } catch (err) {
      setError(err.message);
    }
    setSaving(false);
  };

  // Upload logo file
  const handleUpload = async (type, file) => {
    if (!file) return;
    setUploading(type);
    setError(null);
    try {
      const reader = new FileReader();
      const base64Promise = new Promise((resolve, reject) => {
        reader.onload = () => {
          // Extract base64 data after the comma
          const base64 = reader.result.split(",")[1];
          resolve(base64);
        };
        reader.onerror = reject;
      });
      reader.readAsDataURL(file);
      const base64 = await base64Promise;

      const sessionToken = localStorage.getItem("accesstoken");
      const result = await Parse.Cloud.run(
        "branding_uploadLogo",
        { type, fileName: file.name, base64 },
        { sessionToken }
      );

      // Update form with new URL
      const fieldMap = { light: "logoUrl", dark: "logoDarkUrl", favicon: "faviconUrl", email: "emailLogoUrl", loginImage: "loginImageUrl" };
      setForm((f) => ({ ...f, [fieldMap[type]]: result.url }));
      setSuccess(`${type} logo uploaded.`);
    } catch (err) {
      setError(err.message);
    }
    setUploading(null);
  };

  const updateForm = (key, value) =>
    setForm((f) => ({ ...f, [key]: value }));

  const updateTheme = (theme, key, value) =>
    setForm((f) => ({
      ...f,
      [theme]: { ...f[theme], [key]: value },
    }));

  const resetThemeColor = (theme, key) =>
    setForm((f) => {
      const newTheme = { ...f[theme] };
      delete newTheme[key];
      return { ...f, [theme]: newTheme };
    });

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

  // Loading
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
        <h1 className="text-2xl font-bold">Branding</h1>
        <button
          className="op-btn op-btn-primary op-btn-sm"
          onClick={handleSave}
          disabled={saving || !form.appName}
        >
          {saving ? (
            <span className="op-loading op-loading-spinner op-loading-sm" />
          ) : (
            <>
              <i className="fa-light fa-floppy-disk mr-1" /> Save Changes
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

      {/* Tabs */}
      <div className="op-tabs op-tabs-bordered mb-6">
        {[
          { id: "general", label: "General", icon: "fa-light fa-gear" },
          { id: "logos", label: "Logo & Favicon", icon: "fa-light fa-image" },
          { id: "theme", label: "Theme Colors", icon: "fa-light fa-palette" },
          { id: "social", label: "Social Media", icon: "fa-light fa-share-nodes" },
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
        {activeTab === "general" && (
          <GeneralTab form={form} updateForm={updateForm} />
        )}
        {activeTab === "logos" && (
          <LogoTab
            form={form}
            updateForm={updateForm}
            handleUpload={handleUpload}
            uploading={uploading}
          />
        )}
        {activeTab === "theme" && (
          <ThemeTab
            form={form}
            updateTheme={updateTheme}
            resetThemeColor={resetThemeColor}
          />
        )}
        {activeTab === "social" && (
          <SocialTab
            links={form.socialLinks}
            onChange={(links) => updateForm("socialLinks", links)}
          />
        )}
      </div>
    </div>
  );
}

// ── Tab Components ──

function GeneralTab({ form, updateForm }) {
  return (
    <div className="space-y-4">
      <div className="op-form-control">
        <label className="label">
          <span className="label-text font-medium">App Name</span>
        </label>
        <input
          type="text"
          className="op-input op-input-bordered w-full max-w-md"
          value={form.appName}
          onChange={(e) => updateForm("appName", e.target.value)}
          placeholder="SineSeal"
        />
        <label className="label">
          <span className="label-text-alt text-base-content/50">
            Replaces &quot;OpenSign&quot; across the entire application.
          </span>
        </label>
      </div>

      <div className="op-divider" />

      <div className="op-form-control">
        <label className="label">
          <span className="label-text font-medium">Footer Text</span>
        </label>
        <input
          type="text"
          className="op-input op-input-bordered w-full max-w-md"
          value={form.footerText}
          onChange={(e) => updateForm("footerText", e.target.value)}
          placeholder="Leave blank for default: All rights reserved © {appName}"
        />
      </div>

      <div className="op-form-control">
        <label className="label">
          <span className="label-text font-medium">Footer URL</span>
        </label>
        <input
          type="text"
          className="op-input op-input-bordered w-full max-w-md"
          value={form.footerUrl}
          onChange={(e) => updateForm("footerUrl", e.target.value)}
          placeholder="https://your-website.com"
        />
        <label className="label">
          <span className="label-text-alt text-base-content/50">
            Footer text will link to this URL. Leave blank for no link.
          </span>
        </label>
      </div>
    </div>
  );
}

function LogoTab({ form, updateForm, handleUpload, uploading }) {
  const logoTypes = [
    {
      type: "light",
      label: "Light Mode Logo",
      field: "logoUrl",
      accept: "image/png,image/jpeg,image/svg+xml",
      desc: "Used in the header bar when light theme is active.",
    },
    {
      type: "dark",
      label: "Dark Mode Logo",
      field: "logoDarkUrl",
      accept: "image/png,image/jpeg,image/svg+xml",
      desc: "Used in the header bar when dark theme is active.",
    },
    {
      type: "favicon",
      label: "Favicon",
      field: "faviconUrl",
      accept: "image/png,image/x-icon,image/vnd.microsoft.icon",
      desc: "Browser tab icon (recommended: 32x32 or 64x64 PNG).",
    },
    {
      type: "loginImage",
      label: "Login Illustration",
      field: "loginImageUrl",
      accept: "image/png,image/jpeg,image/svg+xml",
      desc: "Right-side illustration on the login page.",
    },
  ];

  return (
    <div className="space-y-6">
      {logoTypes.map(({ type, label, field, accept, desc }) => (
        <div key={type} className="flex items-start gap-4">
          {/* Preview */}
          <div className="w-24 h-16 bg-base-200 rounded flex items-center justify-center overflow-hidden shrink-0">
            {form[field] ? (
              <img
                src={form[field]}
                alt={label}
                className="max-w-full max-h-full object-contain"
              />
            ) : (
              <i className="fa-light fa-image text-2xl text-base-content/30" />
            )}
          </div>

          <div className="flex-1">
            <p className="font-medium text-sm">{label}</p>
            <p className="text-xs text-base-content/50 mb-2">{desc}</p>
            <div className="flex items-center gap-2">
              <label className="op-btn op-btn-outline op-btn-xs cursor-pointer">
                {uploading === type ? (
                  <span className="op-loading op-loading-spinner op-loading-xs" />
                ) : (
                  <>
                    <i className="fa-light fa-upload mr-1" /> Upload
                  </>
                )}
                <input
                  type="file"
                  className="hidden"
                  accept={accept}
                  onChange={(e) => handleUpload(type, e.target.files[0])}
                  disabled={uploading === type}
                />
              </label>
              {form[field] && (
                <button
                  className="op-btn op-btn-ghost op-btn-xs text-error"
                  onClick={() => updateForm(field, "")}
                  title="Remove"
                >
                  <i className="fa-light fa-xmark" /> Clear
                </button>
              )}
            </div>
            {form[field] && (
              <p className="text-xs text-base-content/40 mt-1 truncate max-w-xs">
                {form[field]}
              </p>
            )}
          </div>
        </div>
      ))}

      <div className="op-divider" />

      <div className="op-form-control">
        <label className="label">
          <span className="label-text font-medium">Email Logo URL</span>
        </label>
        <input
          type="text"
          className="op-input op-input-bordered w-full max-w-md"
          value={form.emailLogoUrl}
          onChange={(e) => updateForm("emailLogoUrl", e.target.value)}
          placeholder="https://your-cdn.com/logo.png"
        />
        <label className="label">
          <span className="label-text-alt text-base-content/50">
            Must be a publicly accessible URL. Used in email notifications.
          </span>
        </label>
      </div>
    </div>
  );
}

function ThemeTab({ form, updateTheme, resetThemeColor }) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-base-content/60">
        Override DaisyUI theme colors. Leave blank to use the default color.
        Changes apply immediately on save after page refresh.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ThemeColumn
          title="Light Theme"
          themeKey="themeLight"
          values={form.themeLight}
          updateTheme={updateTheme}
          resetThemeColor={resetThemeColor}
        />
        <ThemeColumn
          title="Dark Theme"
          themeKey="themeDark"
          values={form.themeDark}
          updateTheme={updateTheme}
          resetThemeColor={resetThemeColor}
        />
      </div>
    </div>
  );
}

function ThemeColumn({ title, themeKey, values, updateTheme, resetThemeColor }) {
  return (
    <div>
      <h3 className="font-medium text-sm mb-3">{title}</h3>
      <div className="space-y-2">
        {THEME_TOKENS.map(({ key, label }) => (
          <div key={key} className="flex items-center gap-2">
            <input
              type="color"
              className="w-8 h-8 rounded cursor-pointer border border-base-300"
              value={values[key] || "#000000"}
              onChange={(e) => updateTheme(themeKey, key, e.target.value)}
            />
            <span className="text-xs flex-1">{label}</span>
            {values[key] && (
              <>
                <code className="text-xs text-base-content/50">
                  {values[key]}
                </code>
                <button
                  className="op-btn op-btn-ghost op-btn-xs"
                  onClick={() => resetThemeColor(themeKey, key)}
                  title="Reset to default"
                >
                  <i className="fa-light fa-rotate-left" />
                </button>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function SocialTab({ links, onChange }) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-base-content/60">
        Configure social media icons shown in the sidebar footer. Links with
        empty URLs are hidden. Use Font Awesome icon classes (e.g.,{" "}
        <code className="text-xs">fa-brands fa-github</code>).
      </p>
      <SocialLinkEditor links={links} onChange={onChange} />
    </div>
  );
}
