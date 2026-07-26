import React, { useEffect, useState } from "react";
import { Link } from "react-router";
import Package from "../../package.json";
import axios from "axios";
import { openInNewTab } from "../constant/Utils";
import { useTranslation } from "react-i18next";
import { useBranding } from "../../../../plugins/branding/frontend/BrandingProvider";
const Footer = () => {
  const { appName, footerText, footerUrl } = useBranding();
  const { t } = useTranslation();
  const [showButton, setShowButton] = useState(false);
  const [version, setVersion] = useState("");
  useEffect(() => {
    axios
      .get("/version.txt")
      .then((response) => {
        setVersion(response.data);
      })
      .catch((error) => {
        console.error("Error reading the file:", error);
      });
  }, []);

  const handleScroll = () => {
    if (window.pageYOffset >= 50) {
      setShowButton(true);
    } else {
      setShowButton(false);
    }
  };

  const scrollToTop = () => {
    window.scrollTo(0, 0);
    setShowButton(false);
  };

  useEffect(() => {
    window.addEventListener("scroll", handleScroll);

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  const openUrl = () => {
    if (footerUrl && /^https?:\/\//i.test(footerUrl)) {
      openInNewTab(footerUrl);
    }
  };

  const displayText = footerText || `${t("all-right")} \u00A9 ${new Date().getFullYear()} ${appName}`;

  return (
    <>
      <footer className="op-footer op-footer-center py-3 bg-base-300 text-base-content text-center text-[13px]">
        <aside>
          <p>
            {footerUrl ? (
              <span onClick={openUrl} className="hover:underline cursor-pointer">
                {displayText}
              </span>
            ) : (
              <span>{displayText}</span>
            )}
            {version && (
              <span className="ml-1 text-base-content/50">
                ({t("version")}: {version || Package.version})
              </span>
            )}
          </p>
          <p className="mt-1 text-base-content/50">
            <Link to="/privacy" className="hover:underline cursor-pointer">{t("privacy-policy")}</Link>
            {" | "}
            <Link to="/tc" className="hover:underline cursor-pointer">{t("terms-conditions")}</Link>
          </p>
        </aside>
      </footer>
      <button
        className={`${
          showButton ? "block" : "hidden"
        } fixed bottom-4 right-4 px-3 p-2 text-xl op-bg-secondary text-white rounded focus:outline-none`}
        onClick={scrollToTop}
      >
        <i className="fa-light fa-angle-up"></i>
      </button>
    </>
  );
};

export default Footer;
