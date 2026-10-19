import { appInfo } from "./appinfo";

// <img src> for the branded email logo (branding emailLogoUrl, else logoUrl).
// Uploaded logos are Parse files whose cached URLs carry an expiring token, so emails
// use the server's stable /branding/email-logo route instead.
export function getEmailLogoSrc() {
  let url = "";
  try {
    const branding = JSON.parse(localStorage.getItem("branding") || "{}");
    url = branding.emailLogoUrl || branding.logoUrl || "";
  } catch {
    // corrupt branding cache: no logo
  }
  if (!url || !/\/files\//.test(url.split("?")[0])) return url;
  const name = url.split("?")[0].split("/").pop();
  const root = appInfo.baseUrl.replace(/\/+$/, "").replace(/\/app$/, "");
  return `${root}/branding/email-logo?v=${encodeURIComponent(name)}`;
}
