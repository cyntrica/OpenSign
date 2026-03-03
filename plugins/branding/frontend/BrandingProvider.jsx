// BrandingProvider — React Context for runtime branding
// Wraps the app tree. Loads branding from server, caches in localStorage.
// Provides useBranding() hook for all consumers.

import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { applyThemeOverrides } from "./lib/applyThemeOverrides";

const STORAGE_KEY = "branding";
const APPNAME_KEY = "branding_appName";

const DEFAULTS = {
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

// Read cached branding from localStorage (synchronous, avoids flash)
function readCache() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // Corrupt cache — ignore
  }
  return null;
}

function writeCache(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    localStorage.setItem(APPNAME_KEY, data.appName || DEFAULTS.appName);
  } catch {
    // localStorage full or unavailable
  }
}

const BrandingContext = createContext({ ...DEFAULTS, loading: true });

export function BrandingProvider({ children }) {
  const [branding, setBranding] = useState(() => {
    const cached = readCache();
    return cached || { ...DEFAULTS };
  });
  const [loading, setLoading] = useState(true);

  // Fetch branding from server
  const fetchBranding = useCallback(async () => {
    try {
      // Parse may not be initialized yet on very first render
      if (typeof Parse === "undefined" || !Parse.Cloud) {
        setLoading(false);
        return;
      }
      const result = await Parse.Cloud.run("branding_getSettings");
      if (result) {
        const data = {
          appName: result.appName || DEFAULTS.appName,
          logoUrl: result.logoUrl || "",
          logoDarkUrl: result.logoDarkUrl || "",
          faviconUrl: result.faviconUrl || "",
          footerText: result.footerText || "",
          footerUrl: result.footerUrl || "",
          emailLogoUrl: result.emailLogoUrl || "",
          loginImageUrl: result.loginImageUrl || "",
          socialLinks: Array.isArray(result.socialLinks) ? result.socialLinks : [],
          themeLight: result.themeLight || {},
          themeDark: result.themeDark || {},
        };
        setBranding(data);
        writeCache(data);
      }
    } catch (err) {
      console.warn("[branding] Failed to fetch settings:", err.message);
      // Continue with cached or default values
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchBranding();
  }, [fetchBranding]);

  // Apply theme overrides whenever they change
  useEffect(() => {
    applyThemeOverrides(branding.themeLight, branding.themeDark);
  }, [branding.themeLight, branding.themeDark]);

  // Write appName to localStorage for synchronous access by non-component code
  useEffect(() => {
    if (branding.appName) {
      localStorage.setItem(APPNAME_KEY, branding.appName);
    }
  }, [branding.appName]);

  const value = { ...branding, loading, refetch: fetchBranding };

  return (
    <BrandingContext.Provider value={value}>
      {children}
    </BrandingContext.Provider>
  );
}

export function useBranding() {
  return useContext(BrandingContext);
}

export default BrandingProvider;
