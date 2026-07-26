import { useState, useEffect } from "react";
import Parse from "parse";
import { NavLink, useNavigate, Link } from "react-router";
import { useBranding } from "../../../../plugins/branding/frontend/BrandingProvider";
import { appInfo } from "../constant/appinfo";
import {
  getAppLogo,
  normalizeEmail,
  saveLanguageInLocal,
  usertimezone
} from "../constant/Utils";
import { emailRegex } from "../constant/const";
import { useDispatch } from "react-redux";
import { fetchAppInfo } from "../redux/reducers/infoReducer";
import { showTenant } from "../redux/reducers/ShowTenant";
import Loader from "../primitives/Loader";
import Alert from "../primitives/Alert";
import { useTranslation } from "react-i18next";

function Signup() {
  const appName = localStorage.getItem("branding_appName") || "SineSeal";
  const branding = useBranding();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [company, setCompany] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [image, setImage] = useState();
  const [alertType, setAlertType] = useState("success");
  const [alertMsg, setAlertMsg] = useState("");

  // Password validation
  const [lengthValid, setLengthValid] = useState(false);
  const [caseDigitValid, setCaseDigitValid] = useState(false);
  const [specialCharValid, setSpecialCharValid] = useState(false);

  useEffect(() => {
    initPage();
    // eslint-disable-next-line
  }, []);

  useEffect(() => {
    if (branding.logoUrl) {
      setImage(branding.logoUrl);
    }
  }, [branding.logoUrl]);

  const initPage = async () => {
    const app = await getAppLogo();
    if (branding.logoUrl) {
      setImage(branding.logoUrl);
    } else if (app?.logo) {
      setImage(app.logo);
    } else {
      setImage(appInfo?.applogo || undefined);
    }
    dispatch(fetchAppInfo());

    // If already logged in, redirect
    if (localStorage.getItem("accesstoken")) {
      navigate("/");
    }
  };

  const showToast = (type, msg) => {
    setAlertType(type);
    setAlertMsg(msg);
    setTimeout(() => setAlertMsg(""), 3000);
  };

  const handlePasswordChange = (e) => {
    const val = e.target.value;
    setPassword(val);
    setLengthValid(val.length >= 8);
    setCaseDigitValid(/[a-z]/.test(val) && /[A-Z]/.test(val) && /\d/.test(val));
    setSpecialCharValid(/[!@#$%^&*()\-_=+{};:,<.>]/.test(val));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!emailRegex.test(email)) {
      alert(t("valid-email-alert"));
      return;
    }
    if (!(lengthValid && caseDigitValid && specialCharValid)) {
      return;
    }

    setLoading(true);

    try {
      // Clear any stale session
      try { await Parse.User.logOut(); } catch { /* ignore */ }

      // Create Parse user
      const user = new Parse.User();
      user.set("name", name);
      user.set("email", email.toLowerCase().replace(/\s/g, ""));
      user.set("username", email.toLowerCase().replace(/\s/g, ""));
      user.set("normalizedEmail", normalizeEmail(email));
      user.set("password", password);
      if (phone) user.set("phone", phone);

      const userRes = await user.signUp();
      if (!userRes) {
        showToast("danger", t("something-went-wrong-mssg"));
        setLoading(false);
        return;
      }

      // Create extended user record
      const params = {
        userDetails: {
          name,
          email: email.toLowerCase().replace(/\s/g, ""),
          phone: phone || "",
          company,
          jobTitle,
          role: "contracts_User",
          timezone: usertimezone,
        },
      };

      const signupRes = await Parse.Cloud.run("usersignup", params);
      if (signupRes && signupRes.sessionToken) {
        // Login with the new session
        await Parse.User.become(signupRes.sessionToken);
        localStorage.setItem("accesstoken", signupRes.sessionToken);
        const _user = JSON.parse(JSON.stringify(userRes));
        localStorage.setItem("UserInformation", JSON.stringify(_user));
        localStorage.setItem("userEmail", email.toLowerCase());
        localStorage.setItem("username", name);
        if (_user.ProfilePic) {
          localStorage.setItem("profileImg", _user.ProfilePic);
        }

        // Get extended user details and redirect
        const userSettings = appInfo.settings;
        const extUser = await Parse.Cloud.run("getUserDetails");
        if (extUser) {
          const userRole = extUser.get("UserRole");
          const menu = userRole && userSettings.find((m) => m.role === userRole);
          if (menu) {
            const _role = userRole.replace("contracts_", "");
            localStorage.setItem("_user_role", _role);
            localStorage.setItem("Extand_Class", JSON.stringify([extUser]));
            const extInfo = JSON.parse(JSON.stringify(extUser));
            localStorage.setItem("userEmail", extInfo.Email);
            localStorage.setItem("username", extInfo.Name);
            if (extInfo?.TenantId) {
              const tenant = {
                Id: extInfo.TenantId.objectId || "",
                Name: extInfo.TenantId.TenantName || "",
              };
              localStorage.setItem("TenantId", tenant.Id);
              dispatch(showTenant(tenant.Name));
              localStorage.setItem("TenantName", tenant.Name);
            }
            localStorage.setItem("PageLanding", menu.pageId);
            localStorage.setItem("defaultmenuid", menu.menuId);
            localStorage.setItem("pageType", menu.pageType);
            navigate(`/${menu.pageType}/${menu.pageId}`);
            return;
          }
        }
        // Fallback — go to home
        navigate("/");
      } else {
        showToast("danger", signupRes?.message || t("something-went-wrong-mssg"));
      }
    } catch (error) {
      console.error("Signup error:", error);
      if (error.code === 202 || error.code === 203 || error.code === 137) {
        showToast("danger", "An account with this email already exists. Please log in instead.");
      } else {
        showToast("danger", error.message || t("something-went-wrong-mssg"));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {loading && (
        <div className="fixed w-full h-full flex justify-center items-center bg-black bg-opacity-30 z-50">
          <Loader />
        </div>
      )}
      <div className="min-h-screen bg-base-200 flex flex-col items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">
          <div className="bg-base-100 text-base-content op-card shadow-md p-6">
            {/* Logo */}
            <div className="flex justify-center mb-4">
              <div className="w-[200px] h-[53px] overflow-hidden">
                {image && (
                  <img src={image} className="object-contain h-full mx-auto" alt="logo" />
                )}
              </div>
            </div>

            <h1 className="text-2xl font-semibold text-center mb-1">Create Account</h1>
            <p className="text-xs text-center text-base-content/60 mb-4">
              Sign up for {appName} to start sending documents for signature.
            </p>

            <form onSubmit={handleSubmit}>
              <div className="space-y-3 text-xs">
                {/* Name */}
                <div>
                  <label className="block mb-1" htmlFor="signup-name">
                    Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="signup-name"
                    type="text"
                    className="op-input op-input-bordered op-input-sm focus:outline-none hover:border-base-content w-full text-xs"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    onInvalid={(e) => e.target.setCustomValidity(t("input-required"))}
                    onInput={(e) => e.target.setCustomValidity("")}
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="block mb-1" htmlFor="signup-email">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="signup-email"
                    type="email"
                    className="op-input op-input-bordered op-input-sm focus:outline-none hover:border-base-content w-full text-xs"
                    value={email}
                    onChange={(e) => setEmail(e.target.value.toLowerCase().replace(/\s/g, ""))}
                    autoComplete="email"
                    required
                    onInvalid={(e) => e.target.setCustomValidity(t("input-required"))}
                    onInput={(e) => e.target.setCustomValidity("")}
                  />
                </div>

                {/* Phone */}
                <div>
                  <label className="block mb-1" htmlFor="signup-phone">
                    Phone
                  </label>
                  <input
                    id="signup-phone"
                    type="tel"
                    className="op-input op-input-bordered op-input-sm focus:outline-none hover:border-base-content w-full text-xs"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>

                {/* Company */}
                <div>
                  <label className="block mb-1" htmlFor="signup-company">
                    Company <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="signup-company"
                    type="text"
                    className="op-input op-input-bordered op-input-sm focus:outline-none hover:border-base-content w-full text-xs"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    required
                    onInvalid={(e) => e.target.setCustomValidity(t("input-required"))}
                    onInput={(e) => e.target.setCustomValidity("")}
                  />
                </div>

                {/* Job Title */}
                <div>
                  <label className="block mb-1" htmlFor="signup-jobtitle">
                    Job Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="signup-jobtitle"
                    type="text"
                    className="op-input op-input-bordered op-input-sm focus:outline-none hover:border-base-content w-full text-xs"
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                    required
                    onInvalid={(e) => e.target.setCustomValidity(t("input-required"))}
                    onInput={(e) => e.target.setCustomValidity("")}
                  />
                </div>

                {/* Password */}
                <div>
                  <label className="block mb-1" htmlFor="signup-password">
                    Password <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      id="signup-password"
                      type={showPassword ? "text" : "password"}
                      className="op-input op-input-bordered op-input-sm focus:outline-none hover:border-base-content w-full text-xs"
                      value={password}
                      onChange={handlePasswordChange}
                      autoComplete="new-password"
                      required
                      onInvalid={(e) => e.target.setCustomValidity(t("input-required"))}
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
                      <p className={lengthValid ? "text-green-600" : "text-red-600"}>
                        {lengthValid ? "\u2713" : "\u2717"} {t("password-length")}
                      </p>
                      <p className={caseDigitValid ? "text-green-600" : "text-red-600"}>
                        {caseDigitValid ? "\u2713" : "\u2717"} {t("password-case")}
                      </p>
                      <p className={specialCharValid ? "text-green-600" : "text-red-600"}>
                        {specialCharValid ? "\u2713" : "\u2717"} {t("password-special-char")}
                      </p>
                    </div>
                  )}
                </div>

                {/* Terms & Privacy consent */}
                <div className="flex items-start gap-2 mt-2">
                  <input
                    type="checkbox"
                    className="op-checkbox op-checkbox-sm mt-0.5"
                    id="accept-terms"
                    checked={acceptedTerms}
                    onChange={(e) => setAcceptedTerms(e.target.checked)}
                    required
                    onInvalid={(e) => e.target.setCustomValidity("You must accept the Terms & Conditions and Privacy Policy to create an account.")}
                    onInput={(e) => e.target.setCustomValidity("")}
                  />
                  <label htmlFor="accept-terms" className="text-xs cursor-pointer leading-relaxed">
                    I agree to the{" "}
                    <Link to="/tc" target="_blank" className="op-link op-link-primary underline-offset-2">
                      Terms &amp; Conditions
                    </Link>{" "}
                    and{" "}
                    <Link to="/privacy" target="_blank" className="op-link op-link-primary underline-offset-2">
                      Privacy Policy
                    </Link>
                    , including consent to receive transactional SMS notifications related to document signing.
                  </label>
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                className="op-btn op-btn-primary w-full mt-4 text-xs font-bold"
                disabled={loading}
              >
                {loading ? t("loading") : "Create Account"}
              </button>
            </form>

            {/* Login link */}
            <p className="text-xs text-center mt-4 text-base-content/60">
              Already have an account?{" "}
              <NavLink to="/" className="op-link op-link-primary underline-offset-2">
                Log in
              </NavLink>
            </p>
          </div>

          {/* Legal footer */}
          <p className="text-[11px] text-center text-base-content/40 mt-3">
            By using {appName}, you agree to our{" "}
            <Link to="/tc" className="underline hover:text-base-content/60">Terms &amp; Conditions</Link>
            {" "}and{" "}
            <Link to="/privacy" className="underline hover:text-base-content/60">Privacy Policy</Link>.
          </p>
        </div>
      </div>
      {alertMsg && <Alert type={alertType}>{alertMsg}</Alert>}
    </>
  );
}

export default Signup;
