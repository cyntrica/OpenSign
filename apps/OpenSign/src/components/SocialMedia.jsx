import React from "react";
import { NavLink } from "react-router";
import { useBranding } from "../../../../plugins/branding/frontend/BrandingProvider";

const SocialMedia = () => {
  const { socialLinks, appName } = useBranding();

  // Filter out links with no URL
  const activeLinks = (socialLinks || [])
    .filter((link) => link.url && link.url.trim())
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

  if (activeLinks.length === 0) return null;

  return (
    <React.Fragment>
      {activeLinks.map((link, idx) => (
        <NavLink
          key={`${link.title}-${idx}`}
          to={link.url}
          target="_blank"
          rel="noopener noreferrer"
          title={link.title}
        >
          <i aria-hidden="true" className={link.icon}></i>
          <span className="fa-sr-only">
            {appName}&apos;s {link.title}
          </span>
        </NavLink>
      ))}
    </React.Fragment>
  );
};

export default SocialMedia;
