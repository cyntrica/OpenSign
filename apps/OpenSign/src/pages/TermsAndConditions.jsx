import { useEffect } from "react";
import { Link } from "react-router";

const TermsAndConditions = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = "Terms and Conditions — SineSeal";
  }, []);

  const appName = localStorage.getItem("branding_appName") || "SineSeal";
  const effectiveDate = "March 3, 2026";
  const contactEmail = "legal@sineseal.com";
  const companyName = "Cyntrica LLC";
  const websiteUrl = "https://sineseal.com";
  const jurisdiction = "the State of Texas";

  return (
    <div className="min-h-screen bg-base-200">
      {/* Header */}
      <header className="bg-base-100 shadow-sm border-b border-base-300">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="text-xl font-bold text-base-content hover:opacity-80">
            {appName}
          </Link>
          <nav className="flex gap-4 text-sm">
            <Link to="/privacy" className="link link-hover">Privacy Policy</Link>
            <Link to="/" className="link link-hover">Home</Link>
          </nav>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-6 py-10">
        <div className="bg-base-100 rounded-box shadow p-8 md:p-12">
          <article className="prose prose-sm md:prose-base max-w-none">
            <h1>Terms and Conditions</h1>
            <p className="text-sm text-base-content/60">
              Effective Date: {effectiveDate}
            </p>

            <p>
              These Terms and Conditions (&quot;Terms&quot;) govern your access to and use of
              the {appName} electronic document signing platform operated by {companyName}{" "}
              (&quot;{appName},&quot; &quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) at{" "}
              <a href={websiteUrl}>{websiteUrl}</a>.
            </p>
            <p>
              By creating an account or using {appName}, you agree to be bound by these
              Terms. If you do not agree, do not use our services.
            </p>

            {/* -------------------------------------------------------- */}
            <h2>1. Description of Service</h2>
            <p>
              {appName} is a cloud-based electronic document signing platform that
              enables users to:
            </p>
            <ul>
              <li>Upload, create, and manage documents for electronic signature.</li>
              <li>Send documents to one or more recipients for signature.</li>
              <li>Apply legally binding electronic signatures to documents.</li>
              <li>Track document signing progress and maintain audit trails.</li>
              <li>
                Receive notifications via email and SMS about document signing activity.
              </li>
              <li>Store and retrieve signed documents.</li>
            </ul>

            {/* -------------------------------------------------------- */}
            <h2>2. Account Registration</h2>

            <h3>2.1 Eligibility</h3>
            <p>
              You must be at least 18 years of age and capable of entering into a binding
              agreement to use {appName}. By registering, you represent that you meet
              these requirements.
            </p>

            <h3>2.2 Account Responsibilities</h3>
            <ul>
              <li>
                You are responsible for maintaining the confidentiality of your account
                credentials.
              </li>
              <li>
                You are responsible for all activities that occur under your account.
              </li>
              <li>
                You must provide accurate and complete information during registration
                and keep it updated.
              </li>
              <li>
                You must notify us immediately at{" "}
                <a href={`mailto:${contactEmail}`}>{contactEmail}</a> if you suspect
                unauthorized access to your account.
              </li>
            </ul>

            {/* -------------------------------------------------------- */}
            <h2>3. Acceptable Use</h2>
            <p>You agree not to use {appName} to:</p>
            <ul>
              <li>
                Violate any applicable local, state, national, or international law or
                regulation.
              </li>
              <li>
                Upload, transmit, or store content that is unlawful, harmful,
                threatening, defamatory, obscene, or otherwise objectionable.
              </li>
              <li>
                Impersonate any person or entity, or falsely claim an affiliation with
                any person or entity.
              </li>
              <li>
                Interfere with or disrupt the integrity or performance of {appName} or
                its infrastructure.
              </li>
              <li>
                Attempt to gain unauthorized access to any part of {appName}, other
                accounts, or systems connected to {appName}.
              </li>
              <li>
                Use automated means (bots, scrapers, etc.) to access {appName} without
                our written permission.
              </li>
              <li>
                Transmit viruses, malware, or any other malicious code.
              </li>
              <li>
                Use {appName} to send unsolicited communications (spam).
              </li>
            </ul>

            {/* -------------------------------------------------------- */}
            <h2>4. Electronic Signatures</h2>

            <h3>4.1 Legal Validity</h3>
            <p>
              Electronic signatures applied through {appName} are intended to comply with
              applicable electronic signature laws, including the United States Electronic
              Signatures in Global and National Commerce Act (ESIGN Act, 15 U.S.C.
              &sect; 7001 et seq.) and the Uniform Electronic Transactions Act (UETA).
            </p>

            <h3>4.2 Consent to Electronic Transactions</h3>
            <p>
              By using {appName} to sign a document, you consent to conducting
              transactions electronically and acknowledge that your electronic signature
              has the same legal effect as a handwritten signature.
            </p>

            <h3>4.3 Audit Trails</h3>
            <p>
              {appName} creates and maintains audit trails for signed documents,
              including timestamps, IP addresses, and signer identification. These
              records serve as evidence of the signing process.
            </p>

            <h3>4.4 Limitations</h3>
            <p>
              Certain types of documents may not be legally enforceable with electronic
              signatures under applicable law (e.g., wills, certain family law documents,
              court orders). It is your responsibility to determine whether an electronic
              signature is appropriate for your specific document and jurisdiction.
              {appName} does not provide legal advice.
            </p>

            {/* -------------------------------------------------------- */}
            <h2>5. SMS Communications</h2>

            <h3>5.1 Consent</h3>
            <p>
              By opting in to SMS notifications, you consent to receive text messages
              from {appName} related to your document signing activity. Consent to
              receive SMS messages is not a condition of purchasing or using {appName}
              services.
            </p>

            <h3>5.2 Message Types and Frequency</h3>
            <p>
              SMS messages may include signing requests, signature notifications,
              completion alerts, signing reminders, and verification codes. Message
              frequency varies based on your document activity.
            </p>

            <h3>5.3 Costs</h3>
            <p>
              Message and data rates may apply. Consult your wireless carrier for details
              about your messaging plan.
            </p>

            <h3>5.4 Opting Out</h3>
            <p>
              You may opt out of SMS messages at any time by replying <strong>STOP</strong>{" "}
              to any message, by adjusting your SMS Preferences within your account, or
              by contacting us at{" "}
              <a href={`mailto:${contactEmail}`}>{contactEmail}</a>. Reply{" "}
              <strong>HELP</strong> for assistance. Opting out of SMS does not affect your
              ability to use {appName} or receive email notifications.
            </p>

            <h3>5.5 Carrier Disclaimer</h3>
            <p>
              Wireless carriers are not liable for delayed or undelivered messages.
            </p>

            {/* -------------------------------------------------------- */}
            <h2>6. Subscription Plans and Payment</h2>

            <h3>6.1 Plans</h3>
            <p>
              {appName} offers service plans with varying features and usage limits. Plan
              details, pricing, and limits are available within the application and may
              change from time to time.
            </p>

            <h3>6.2 Billing</h3>
            <p>
              Paid subscriptions are billed in advance on a recurring basis (monthly or
              annually, depending on the plan selected). Payment is processed through
              our third-party payment processor.
            </p>

            <h3>6.3 Cancellation</h3>
            <p>
              You may cancel your subscription at any time through your account settings.
              Cancellation takes effect at the end of the current billing period. No
              refunds are provided for partial billing periods.
            </p>

            <h3>6.4 Usage Limits</h3>
            <p>
              Your plan may include limits on documents per month, templates, storage,
              and team members. If you exceed your plan limits, certain features may be
              restricted until the next billing period or until you upgrade.
            </p>

            {/* -------------------------------------------------------- */}
            <h2>7. Intellectual Property</h2>

            <h3>7.1 Our Property</h3>
            <p>
              {appName}, including its software, design, logos, trademarks, and
              documentation, is the property of {companyName} and is protected by
              copyright, trademark, and other intellectual property laws. You may not
              copy, modify, distribute, or create derivative works of {appName} without
              our written permission.
            </p>

            <h3>7.2 Your Content</h3>
            <p>
              You retain ownership of all documents, data, and content you upload to{" "}
              {appName} (&quot;Your Content&quot;). By using {appName}, you grant us a
              limited, non-exclusive license to process, store, and transmit Your Content
              solely for the purpose of providing the service. We do not access, use, or
              share Your Content for any other purpose.
            </p>

            {/* -------------------------------------------------------- */}
            <h2>8. Data and Privacy</h2>
            <p>
              Your use of {appName} is also governed by our{" "}
              <Link to="/privacy">Privacy Policy</Link>, which describes how we collect,
              use, and protect your personal information, including SMS messaging
              practices. The Privacy Policy is incorporated into these Terms by
              reference.
            </p>

            {/* -------------------------------------------------------- */}
            <h2>9. Third-Party Integrations</h2>
            <p>
              {appName} may integrate with third-party services (e.g., payment
              processors, communication providers). Your use of such third-party
              services is subject to their own terms and privacy policies. We are not
              responsible for the practices or content of third-party services.
            </p>

            {/* -------------------------------------------------------- */}
            <h2>10. Service Availability</h2>
            <p>
              We strive to maintain high availability of {appName} but do not guarantee
              uninterrupted or error-free service. We may temporarily suspend access
              for maintenance, upgrades, or circumstances beyond our control. We will
              make reasonable efforts to provide advance notice of planned downtime.
            </p>

            {/* -------------------------------------------------------- */}
            <h2>11. Disclaimer of Warranties</h2>
            <p>
              {appName.toUpperCase()} IS PROVIDED &quot;AS IS&quot; AND &quot;AS
              AVAILABLE&quot; WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED,
              INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS
              FOR A PARTICULAR PURPOSE, TITLE, AND NON-INFRINGEMENT. WE DO NOT WARRANT
              THAT {appName.toUpperCase()} WILL BE UNINTERRUPTED, SECURE, OR ERROR-FREE,
              OR THAT DEFECTS WILL BE CORRECTED.
            </p>
            <p>
              {appName.toUpperCase()} DOES NOT PROVIDE LEGAL, TAX, OR COMPLIANCE ADVICE.
              YOU ARE SOLELY RESPONSIBLE FOR DETERMINING WHETHER ELECTRONIC SIGNATURES
              AND ELECTRONIC DOCUMENTS ARE APPROPRIATE AND LEGALLY VALID FOR YOUR
              SPECIFIC USE CASE AND JURISDICTION.
            </p>

            {/* -------------------------------------------------------- */}
            <h2>12. Limitation of Liability</h2>
            <p>
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, {companyName.toUpperCase()} AND
              ITS OFFICERS, DIRECTORS, EMPLOYEES, AND AGENTS SHALL NOT BE LIABLE FOR ANY
              INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES,
              INCLUDING BUT NOT LIMITED TO LOSS OF PROFITS, DATA, BUSINESS OPPORTUNITIES,
              OR GOODWILL, ARISING OUT OF OR IN CONNECTION WITH YOUR USE OF{" "}
              {appName.toUpperCase()}, REGARDLESS OF THE THEORY OF LIABILITY.
            </p>
            <p>
              OUR TOTAL AGGREGATE LIABILITY FOR ALL CLAIMS ARISING OUT OF OR RELATING TO
              THESE TERMS OR YOUR USE OF {appName.toUpperCase()} SHALL NOT EXCEED THE
              GREATER OF (A) THE AMOUNT YOU PAID TO US IN THE TWELVE (12) MONTHS
              PRECEDING THE CLAIM, OR (B) ONE HUNDRED DOLLARS ($100).
            </p>

            {/* -------------------------------------------------------- */}
            <h2>13. Indemnification</h2>
            <p>
              You agree to indemnify, defend, and hold harmless {companyName}, its
              officers, directors, employees, and agents from and against any claims,
              liabilities, damages, losses, and expenses (including reasonable
              attorneys&apos; fees) arising out of or related to: (a) your use of{" "}
              {appName}; (b) your violation of these Terms; (c) your violation of any
              third-party rights; or (d) Your Content.
            </p>

            {/* -------------------------------------------------------- */}
            <h2>14. Termination</h2>

            <h3>14.1 By You</h3>
            <p>
              You may terminate your account at any time by contacting us at{" "}
              <a href={`mailto:${contactEmail}`}>{contactEmail}</a> or through your
              account settings. Upon termination, your right to use {appName} ceases
              immediately.
            </p>

            <h3>14.2 By Us</h3>
            <p>
              We may suspend or terminate your account at any time if you violate these
              Terms, engage in fraudulent activity, or for any other reason at our sole
              discretion, with or without notice.
            </p>

            <h3>14.3 Effect of Termination</h3>
            <p>
              Upon termination, we may delete your account data after a reasonable
              retention period, except where retention is required by law (e.g., signed
              document audit trails). Sections that by their nature should survive
              termination (including Intellectual Property, Limitation of Liability,
              Indemnification, and Governing Law) shall survive.
            </p>

            {/* -------------------------------------------------------- */}
            <h2>15. Governing Law and Dispute Resolution</h2>

            <h3>15.1 Governing Law</h3>
            <p>
              These Terms shall be governed by and construed in accordance with the laws
              of {jurisdiction}, without regard to its conflict of law provisions.
            </p>

            <h3>15.2 Dispute Resolution</h3>
            <p>
              Any dispute arising out of or relating to these Terms or your use of{" "}
              {appName} shall first be attempted to be resolved through good-faith
              negotiation. If the dispute cannot be resolved within thirty (30) days, it
              shall be submitted to binding arbitration in accordance with the rules of
              the American Arbitration Association, conducted in {jurisdiction}. Judgment
              on the arbitration award may be entered in any court of competent
              jurisdiction.
            </p>

            <h3>15.3 Class Action Waiver</h3>
            <p>
              You agree that any dispute resolution proceedings will be conducted only on
              an individual basis and not in a class, consolidated, or representative
              action.
            </p>

            {/* -------------------------------------------------------- */}
            <h2>16. Modifications to Terms</h2>
            <p>
              We reserve the right to modify these Terms at any time. When we make
              material changes, we will update the effective date at the top of this page
              and may notify you through the {appName} application or by email. Your
              continued use of {appName} after changes are posted constitutes acceptance
              of the modified Terms.
            </p>

            {/* -------------------------------------------------------- */}
            <h2>17. General Provisions</h2>
            <ul>
              <li>
                <strong>Entire agreement</strong> — These Terms, together with the
                Privacy Policy, constitute the entire agreement between you and{" "}
                {companyName} regarding {appName}.
              </li>
              <li>
                <strong>Severability</strong> — If any provision of these Terms is found
                to be unenforceable, the remaining provisions shall remain in full force
                and effect.
              </li>
              <li>
                <strong>Waiver</strong> — Our failure to enforce any provision of these
                Terms shall not constitute a waiver of that provision.
              </li>
              <li>
                <strong>Assignment</strong> — You may not assign or transfer your rights
                under these Terms without our written consent. We may assign our rights
                and obligations without restriction.
              </li>
              <li>
                <strong>Force majeure</strong> — We shall not be liable for any failure
                or delay in performance resulting from circumstances beyond our
                reasonable control.
              </li>
            </ul>

            {/* -------------------------------------------------------- */}
            <h2>18. Contact Us</h2>
            <p>
              If you have questions about these Terms, please contact us:
            </p>
            <ul>
              <li>
                <strong>Email:</strong>{" "}
                <a href={`mailto:${contactEmail}`}>{contactEmail}</a>
              </li>
              <li>
                <strong>Company:</strong> {companyName}
              </li>
              <li>
                <strong>Website:</strong>{" "}
                <a href={websiteUrl}>{websiteUrl}</a>
              </li>
            </ul>
          </article>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-base-300 text-base-content text-center text-sm py-4">
        <p>
          &copy; {new Date().getFullYear()} {appName}. All rights reserved.
          {" | "}
          <Link to="/privacy" className="link link-hover">Privacy Policy</Link>
          {" | "}
          <Link to="/tc" className="link link-hover">Terms &amp; Conditions</Link>
        </p>
      </footer>
    </div>
  );
};

export default TermsAndConditions;
