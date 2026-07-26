import { useEffect, useState, useRef } from "react";
import { useNavigate, Link } from "react-router";
import { useTranslation } from "react-i18next";
import Parse from "parse";
import Confetti from "react-confetti";
import {
  getBase64FromUrl,
  handleDownloadCertificate,
  handleDownloadPdf,
  handleToPrint,
  normalizeEmail,
  usertimezone,
} from "../constant/Utils";
import { emailRegex } from "../constant/const";
import { appInfo } from "../constant/appinfo";
import ModalUi from "../primitives/ModalUi";
import Loader from "../primitives/Loader";
import DownloadPdfZip from "../primitives/DownloadPdfZip";
import CheckCircle from "../primitives/CheckCircle";
import Alert from "../primitives/Alert";

const DocSuccessPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const appName = localStorage.getItem("branding_appName") || "SineSeal";
  const signed = window.location?.search?.includes("docid");
  const sent = window.location?.search?.includes("message");

  // Existing success page state
  const [isDownloading, setIsDownloading] = useState(false);
  const [isDownloadModal, setIsDownloadModal] = useState(false);
  const [pdfDetails, setPdfDetails] = useState([]);
  const [pdfBase64Url, setPdfBase64Url] = useState("");
  const [showConfetti, setShowConfetti] = useState(true);

  // Phase management: 'success' → 'signup' → 'created'
  const [phase, setPhase] = useState("success");
  const [showSignupFlow, setShowSignupFlow] = useState(false);
  const transitionCanceled = useRef(false);

  // Signup form state
  const [signerEmail, setSignerEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [company, setCompany] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [signupError, setSignupError] = useState("");

  // Password validation
  const [lengthValid, setLengthValid] = useState(false);
  const [caseDigitValid, setCaseDigitValid] = useState(false);
  const [specialCharValid, setSpecialCharValid] = useState(false);

  // Alert state
  const [alertType, setAlertType] = useState("success");
  const [alertMsg, setAlertMsg] = useState("");

  useEffect(() => {
    initialsetup();
    const timer = setTimeout(() => setShowConfetti(false), 5000);
    return () => clearTimeout(timer);
  }, []);

  // Detect guest signer without an account
  useEffect(() => {
    const isGuest = localStorage.getItem("isGuestSigner") === "true";
    const hasAccount = !!localStorage.getItem("accesstoken");
    const shouldShowSignup = isGuest && !hasAccount;
    setShowSignupFlow(shouldShowSignup);

    // Pre-fill signer info from query params or localStorage
    const urlParams = new URLSearchParams(window.location.search);
    const email =
      urlParams.get("signerEmail") ||
      localStorage.getItem("guestSignerEmail") ||
      "";
    const signerName =
      urlParams.get("signerName") ||
      localStorage.getItem("guestSignerName") ||
      "";
    setSignerEmail(email);
    setName(signerName);
  }, []);

  // Auto-transition to signup form after 4 seconds
  useEffect(() => {
    if (showSignupFlow && !transitionCanceled.current) {
      const timer = setTimeout(() => {
        if (!transitionCanceled.current) {
          setPhase("signup");
        }
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [showSignupFlow]);

  const initialsetup = async () => {
    const search = window.location.search.split("?")[1];
    if (search) {
      const urlParams = new URLSearchParams(search);
      const docId = urlParams.get("docid");
      const docUrl = urlParams.get("docurl");
      const certificate = urlParams.get("certificate");
      const completed = urlParams?.get("completed") || false;
      const details = {
        objectId: docId,
        SignedUrl: docUrl,
        CertificateUrl: certificate,
        IsCompleted: completed,
      };
      setPdfDetails([details]);
      const base64Pdf = await getBase64FromUrl(docUrl);
      if (base64Pdf) {
        setPdfBase64Url(base64Pdf);
      }
    }
  };

  const handleDownload = () => {
    if (pdfDetails?.[0]?.IsCompleted) {
      setIsDownloadModal(true);
    } else {
      handleDownloadPdf(pdfDetails, setIsDownloading, pdfBase64Url);
    }
  };

  const handlePasswordChange = (e) => {
    const val = e.target.value;
    setPassword(val);
    setLengthValid(val.length >= 8);
    setCaseDigitValid(
      /[a-z]/.test(val) && /[A-Z]/.test(val) && /\d/.test(val)
    );
    setSpecialCharValid(/[!@#$%^&*()\-_=+{};:,<.>]/.test(val));
  };

  const handleNoThanks = () => {
    transitionCanceled.current = true;
    setPhase("success");
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setSignupError("");

    if (!emailRegex.test(signerEmail)) {
      setSignupError("Please enter a valid email address.");
      return;
    }
    if (!(lengthValid && caseDigitValid && specialCharValid)) {
      return;
    }

    setIsSubmitting(true);

    try {
      // Clear any stale session
      try {
        await Parse.User.logOut();
      } catch {
        /* ignore */
      }

      // 1. Create Parse user
      const user = new Parse.User();
      user.set("name", name);
      user.set("email", signerEmail.toLowerCase().replace(/\s/g, ""));
      user.set("username", signerEmail.toLowerCase().replace(/\s/g, ""));
      user.set("normalizedEmail", normalizeEmail(signerEmail));
      user.set("password", password);

      const userRes = await user.signUp();
      if (!userRes) {
        setSignupError("Something went wrong. Please try again.");
        setIsSubmitting(false);
        return;
      }

      // 2. Create extended user record (contracts_Users + partners_Tenant)
      const params = {
        userDetails: {
          name,
          email: signerEmail.toLowerCase().replace(/\s/g, ""),
          phone: "",
          company,
          jobTitle: "",
          role: "contracts_User",
          timezone: usertimezone,
        },
      };

      const signupRes = await Parse.Cloud.run("usersignup", params);
      if (signupRes && signupRes.sessionToken) {
        // 3. Establish session
        await Parse.User.become(signupRes.sessionToken);
        localStorage.setItem("accesstoken", signupRes.sessionToken);
        const _user = JSON.parse(JSON.stringify(userRes));
        localStorage.setItem("UserInformation", JSON.stringify(_user));
        localStorage.setItem(
          "userEmail",
          signerEmail.toLowerCase().replace(/\s/g, "")
        );
        localStorage.setItem("username", name);

        // 4. Fetch extended user details
        const extUser = await Parse.Cloud.run("getUserDetails");
        if (extUser) {
          const userRole = extUser.get("UserRole");
          const menu =
            userRole &&
            appInfo.settings.find((m) => m.role === userRole);
          if (menu) {
            const _role = userRole.replace("contracts_", "");
            localStorage.setItem("_user_role", _role);
            localStorage.setItem(
              "Extand_Class",
              JSON.stringify([extUser])
            );
            const extInfo = JSON.parse(JSON.stringify(extUser));
            localStorage.setItem("userEmail", extInfo.Email);
            localStorage.setItem("username", extInfo.Name);
            if (extInfo?.TenantId) {
              localStorage.setItem(
                "TenantId",
                extInfo.TenantId.objectId || ""
              );
              localStorage.setItem(
                "TenantName",
                extInfo.TenantId.TenantName || ""
              );
            }
            localStorage.setItem("PageLanding", menu.pageId);
            localStorage.setItem("defaultmenuid", menu.menuId);
            localStorage.setItem("pageType", menu.pageType);
          }
        }

        // 5. Clear guest flags
        localStorage.removeItem("isGuestSigner");
        localStorage.removeItem("guestSignerEmail");
        localStorage.removeItem("guestSignerName");

        // 6. Show success
        setPhase("created");
      } else {
        setSignupError(
          signupRes?.message || "Something went wrong. Please try again."
        );
      }
    } catch (error) {
      console.error("Signup error:", error);
      if (error.code === 202 || error.code === 203 || error.code === 137) {
        setSignupError(
          "An account with this email already exists. Please log in instead."
        );
      } else {
        setSignupError(
          error.message || "Something went wrong. Please try again."
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoToDashboard = () => {
    const pageType = localStorage.getItem("pageType");
    const pageId = localStorage.getItem("PageLanding");
    if (pageType && pageId) {
      navigate(`/${pageType}/${pageId}`);
    } else {
      navigate("/");
    }
  };

  // ── Phase 1: Success confirmation ──────────────────────────────
  const renderSuccess = () => (
    <div className="flex flex-col items-center space-y-4">
      <CheckCircle className="text-green-500 w-12 h-12 md:w-14 md:h-14" />
      <h1 className="text-xl md:text-2xl font-semibold text-gray-800">
        {pdfDetails?.[0]?.IsCompleted
          ? t("document-has-been-signed")
          : t("document-has-been-signed-by-you")}
      </h1>
      {pdfDetails?.[0]?.IsCompleted && (
        <p className="text-sm md:text-base text-gray-600">
          {t("participant-completed-signing")}
        </p>
      )}

      {/* Action Buttons */}
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <button
          type="button"
          className="font-medium text-sm md:text-[13px] md:px-4 py-2 op-btn op-btn-primary"
          onClick={() => handleDownload()}
        >
          <i className="fa-light fa-download" aria-hidden="true"></i>
          <span>{t("download")}</span>
        </button>

        {pdfDetails?.[0]?.IsCompleted && (
          <button
            type="button"
            onClick={() =>
              handleDownloadCertificate(pdfDetails, setIsDownloading)
            }
            className="font-medium text-sm md:text-[13px] md:px-4 py-2 op-btn op-btn-secondary"
          >
            <i
              className="fa-light fa-award mx-[3px] md:mx-0"
              aria-hidden="true"
            ></i>
            <span>{t("certificate")}</span>
          </button>
        )}
        <button
          onClick={(e) => handleToPrint(e, setIsDownloading, pdfDetails)}
          type="button"
          className="font-medium text-sm md:text-[13px] px-4 py-2 op-btn op-btn-neutral"
        >
          <i className="fa-light fa-print" aria-hidden="true"></i>
          <span>{t("print")}</span>
        </button>
      </div>

      {/* Footer Message */}
      <p className="mt-4 md:mt-6 text-xs md:text-sm text-gray-500">
        {t("you-will-receive-email-shortly")}
      </p>

      {/* "Continue to signup" hint for guests */}
      {showSignupFlow && phase === "success" && (
        <button
          onClick={() => {
            transitionCanceled.current = true;
            setPhase("signup");
          }}
          className="mt-2 text-xs text-primary hover:underline cursor-pointer"
        >
          Create a free account &rarr;
        </button>
      )}
    </div>
  );

  // ── Phase 2: Signup form ───────────────────────────────────────
  const renderSignup = () => (
    <div className="flex flex-col items-center w-full">
      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mb-3">
        <i className="fa-light fa-user-plus text-primary text-lg"></i>
      </div>
      <h2 className="text-lg md:text-xl font-semibold text-gray-800 text-center">
        Want to send documents for signing too?
      </h2>
      <p className="text-xs text-gray-500 mt-1 mb-4 text-center">
        Create your free {appName} account &mdash; it only takes a moment.
      </p>

      {signupError && (
        <div className="w-full mb-3 p-2 bg-error/10 border border-error/20 rounded text-xs text-error text-center">
          {signupError}
          {signupError.includes("already exists") && (
            <>
              {" "}
              <Link
                to="/"
                className="op-link op-link-primary underline-offset-2"
              >
                Log in
              </Link>
            </>
          )}
        </div>
      )}

      <form onSubmit={handleSignup} className="w-full space-y-3 text-xs">
        {/* Email (pre-filled, disabled) */}
        <div>
          <label className="block mb-1" htmlFor="success-email">
            Email
          </label>
          <input
            id="success-email"
            type="email"
            className="op-input op-input-bordered op-input-sm focus:outline-none w-full text-xs bg-base-200"
            value={signerEmail}
            disabled
          />
        </div>

        {/* Name */}
        <div>
          <label className="block mb-1" htmlFor="success-name">
            Name <span className="text-red-500">*</span>
          </label>
          <input
            id="success-name"
            type="text"
            className="op-input op-input-bordered op-input-sm focus:outline-none hover:border-base-content w-full text-xs"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder="Your full name"
            onInvalid={(e) =>
              e.target.setCustomValidity(t("input-required"))
            }
            onInput={(e) => e.target.setCustomValidity("")}
          />
        </div>

        {/* Company */}
        <div>
          <label className="block mb-1" htmlFor="success-company">
            Company <span className="text-red-500">*</span>
          </label>
          <input
            id="success-company"
            type="text"
            className="op-input op-input-bordered op-input-sm focus:outline-none hover:border-base-content w-full text-xs"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            required
            placeholder="Your company name"
            onInvalid={(e) =>
              e.target.setCustomValidity(t("input-required"))
            }
            onInput={(e) => e.target.setCustomValidity("")}
          />
        </div>

        {/* Password */}
        <div>
          <label className="block mb-1" htmlFor="success-password">
            Password <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <input
              id="success-password"
              type={showPassword ? "text" : "password"}
              className="op-input op-input-bordered op-input-sm focus:outline-none hover:border-base-content w-full text-xs"
              value={password}
              onChange={handlePasswordChange}
              autoComplete="new-password"
              required
              onInvalid={(e) =>
                e.target.setCustomValidity(t("input-required"))
              }
              onInput={(e) => e.target.setCustomValidity("")}
            />
            <span
              className="absolute cursor-pointer top-[50%] right-[10px] -translate-y-[50%] text-base-content"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? (
                <i className="fa-light fa-eye-slash text-xs" />
              ) : (
                <i className="fa-light fa-eye text-xs" />
              )}
            </span>
          </div>
          {password.length > 0 && (
            <div className="mt-1 text-[11px]">
              <p
                className={
                  lengthValid ? "text-green-600" : "text-red-600"
                }
              >
                {lengthValid ? "\u2713" : "\u2717"} {t("password-length")}
              </p>
              <p
                className={
                  caseDigitValid ? "text-green-600" : "text-red-600"
                }
              >
                {caseDigitValid ? "\u2713" : "\u2717"}{" "}
                {t("password-case")}
              </p>
              <p
                className={
                  specialCharValid ? "text-green-600" : "text-red-600"
                }
              >
                {specialCharValid ? "\u2713" : "\u2717"}{" "}
                {t("password-special-char")}
              </p>
            </div>
          )}
        </div>

        {/* Terms & Privacy consent */}
        <div className="flex items-start gap-2 mt-2">
          <input
            type="checkbox"
            className="op-checkbox op-checkbox-sm mt-0.5"
            id="success-accept-terms"
            checked={acceptedTerms}
            onChange={(e) => setAcceptedTerms(e.target.checked)}
            required
            onInvalid={(e) =>
              e.target.setCustomValidity(
                "You must accept the Terms & Conditions and Privacy Policy to create an account."
              )
            }
            onInput={(e) => e.target.setCustomValidity("")}
          />
          <label
            htmlFor="success-accept-terms"
            className="text-xs cursor-pointer leading-relaxed"
          >
            I agree to the{" "}
            <Link
              to="/tc"
              target="_blank"
              className="op-link op-link-primary underline-offset-2"
            >
              Terms &amp; Conditions
            </Link>{" "}
            and{" "}
            <Link
              to="/privacy"
              target="_blank"
              className="op-link op-link-primary underline-offset-2"
            >
              Privacy Policy
            </Link>
          </label>
        </div>

        {/* Submit */}
        <button
          type="submit"
          className="op-btn op-btn-primary w-full mt-3 text-xs font-bold"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <span className="loading loading-spinner loading-xs mr-1"></span>
              Creating account...
            </>
          ) : (
            "Create Free Account"
          )}
        </button>
      </form>

      {/* No thanks link */}
      <button
        onClick={handleNoThanks}
        className="mt-3 text-xs text-base-content/50 hover:text-base-content/70 hover:underline cursor-pointer"
      >
        No thanks, return to download
      </button>
    </div>
  );

  // ── Phase 3: Account created ───────────────────────────────────
  const renderCreated = () => (
    <div className="flex flex-col items-center space-y-4">
      <CheckCircle className="text-green-500 w-12 h-12 md:w-14 md:h-14" />
      <h2 className="text-xl md:text-2xl font-semibold text-gray-800">
        Your account is ready!
      </h2>
      <p className="text-sm text-gray-600 text-center">
        Welcome to {appName}. You can now send documents for signing, manage
        templates, and track signature status.
      </p>

      <div className="mt-4 flex flex-col items-center gap-2 w-full">
        <button
          type="button"
          className="op-btn op-btn-primary w-full text-xs font-bold"
          onClick={handleGoToDashboard}
        >
          <i className="fa-light fa-grid-2 mr-1" aria-hidden="true"></i>
          Go to Dashboard
        </button>

        {pdfDetails?.[0]?.SignedUrl && (
          <button
            type="button"
            className="op-btn op-btn-neutral w-full text-xs"
            onClick={() => handleDownload()}
          >
            <i className="fa-light fa-download mr-1" aria-hidden="true"></i>
            Download Signed Document
          </button>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Confetti Effect */}
      {showConfetti && (
        <Confetti width={window.innerWidth} height={window.innerHeight} />
      )}
      {sent ? (
        <div className="min-h-screen flex flex-col items-center justify-center p-3 md:p-8 text-center">
          <div className="max-w-lg md:max-w-2xl bg-white rounded-lg shadow-lg p-3 md:p-10">
            {t("doc-sent")}
          </div>
        </div>
      ) : signed ? (
        <>
          <div className="min-h-screen flex flex-col items-center justify-center p-3 md:p-8 text-center">
            <div className="max-w-lg md:max-w-2xl bg-white rounded-lg shadow-lg p-3 md:p-10 w-full">
              {phase === "success" && renderSuccess()}
              {phase === "signup" && renderSignup()}
              {phase === "created" && renderCreated()}
            </div>
          </div>
          {isDownloading === "pdf" && (
            <div className="fixed z-[1000] inset-0 flex justify-center items-center bg-black bg-opacity-30">
              <Loader />
            </div>
          )}
          <ModalUi
            isOpen={
              isDownloading === "certificate" ||
              isDownloading === "certificate_err"
            }
            title={
              isDownloading === "certificate" ||
              isDownloading === "certificate_err"
                ? t("generating-certificate")
                : t("pdf-download")
            }
            handleClose={() => setIsDownloading("")}
          >
            <div className="p-3 md:p-5 text-sm md:text-base text-center text-base-content">
              {isDownloading === "certificate" ? (
                <p>{t("generate-certificate-alert")}</p>
              ) : (
                <p>{t("generate-certificate-err")}</p>
              )}
            </div>
          </ModalUi>
          <DownloadPdfZip
            setIsDownloadModal={setIsDownloadModal}
            isDownloadModal={isDownloadModal}
            pdfDetails={pdfDetails}
            isDocId={true}
            pdfBase64={pdfBase64Url}
          />
        </>
      ) : (
        <></>
      )}
      {alertMsg && <Alert type={alertType}>{alertMsg}</Alert>}
    </>
  );
};

export default DocSuccessPage;
