import { useEffect, useMemo } from "react";

// Fallback favicon is an SVG data URI; uploaded ones are usually PNG.
export const iconType = (src) =>
  src?.startsWith("data:image/svg") || /\.svg(\?|$)/i.test(src || "")
    ? "image/svg+xml"
    : "image/png";

export function useManifestUrl(appName, logo) {
  const url = useMemo(() => {
    const start_url = window.location.origin || ".";
    const manifest = {
      short_name: appName,
      name: appName,
      start_url: start_url,
      display: "standalone",
      theme_color: "#000000",
      background_color: "#ffffff",
      ...(logo && {
        icons: [
          { src: logo, type: iconType(logo), sizes: "64x64 32x32 24x24 16x16" },
          { src: logo, type: iconType(logo), sizes: "192x192" },
          { src: logo, type: iconType(logo), sizes: "512x512" }
        ]
      })
    };
    const blob = new Blob([JSON.stringify(manifest)], {
      type: "application/json"
    });
    return URL.createObjectURL(blob);
  }, [appName, logo]);

  useEffect(() => {
    // cleanup when unmounting or when url changes
    return () => {
      URL.revokeObjectURL(url);
    };
  }, [url]);

  return url;
}
