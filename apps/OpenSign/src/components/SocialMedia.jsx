import React from "react";
import { useBranding } from "../../../../plugins/branding/frontend/BrandingProvider";

const SocialMedia = () => {
  const { socialLinks, appName } = useBranding();

  // Filter out links with no URL and reject non-http(s) schemes (e.g. javascript:)
  const activeLinks = (socialLinks || [])
    .filter((link) => link.url && link.url.trim())
    .filter((link) => /^https?:\/\//i.test(link.url))
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

  if (activeLinks.length === 0) return null;

  return (
    <React.Fragment>
      {activeLinks.map((link, idx) => (
        <a
          key={`${link.title}-${idx}`}
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
          title={link.title}
        >
          <i aria-hidden="true" className={link.icon}></i>
          <span className="fa-sr-only">
            {appName}&apos;s {link.title}
          </span>
        </a>
      ))}
    </React.Fragment>
  );
};

export default SocialMedia;
