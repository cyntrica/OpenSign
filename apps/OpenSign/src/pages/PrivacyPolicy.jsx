import { useEffect } from "react";
import { Link } from "react-router";

const PrivacyPolicy = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = "Privacy Policy — SineSeal";
  }, []);

  const appName = localStorage.getItem("branding_appName") || "SineSeal";
  const effectiveDate = "March 3, 2026";
  const contactEmail = "privacy@sineseal.com";
  const companyName = "Cyntrica LLC";
  const websiteUrl = "https://sineseal.com";

  return (
    <div className="min-h-screen bg-base-200">
      {/* Header */}
      <header className="bg-base-100 shadow-sm border-b border-base-300">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="text-xl font-bold text-base-content hover:opacity-80">
            {appName}
          </Link>
          <nav className="flex gap-4 text-sm">
            <Link to="/tc" className="link link-hover">Terms &amp; Conditions</Link>
            <Link to="/" className="link link-hover">Home</Link>
          </nav>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-6 py-10">
        <div className="bg-base-100 rounded-box shadow p-8 md:p-12">
          <article className="prose prose-sm md:prose-base max-w-none">
            <h1>Privacy Policy</h1>
            <p className="text-sm text-base-content/60">
              Effective Date: {effectiveDate}
            </p>

            <p>
              {companyName} (&quot;{appName},&quot; &quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) operates
              the {appName} electronic document signing platform at{" "}
              <a href={websiteUrl}>{websiteUrl}</a>. This Privacy Policy describes
              how we collect, use, disclose, and protect your personal information when
              you use our services.
            </p>
            <p>
              By accessing or using {appName}, you agree to the collection and use of
              information in accordance with this policy. If you do not agree, please do
              not use our services.
            </p>

            {/* -------------------------------------------------------- */}
            <h2>1. Information We Collect</h2>

            <h3>1.1 Information You Provide</h3>
            <ul>
              <li>
                <strong>Account information</strong> — name, email address, phone
                number, organization name, and password when you create an account.
              </li>
              <li>
                <strong>Document data</strong> — documents you upload, create, or sign
                through {appName}, including document content, signatures, form field
                entries, and related metadata.
              </li>
              <li>
                <strong>Contact information</strong> — names, email addresses, and phone
                numbers of individuals you invite to sign or receive documents.
              </li>
              <li>
                <strong>Payment information</strong> — billing details processed through
                our third-party payment processor (we do not store full credit card
                numbers on our servers).
              </li>
              <li>
                <strong>Communications</strong> — correspondence you send to us,
                including support requests and feedback.
              </li>
            </ul>

            <h3>1.2 Information Collected Automatically</h3>
            <ul>
              <li>
                <strong>Usage data</strong> — pages visited, features used, timestamps,
                and interaction patterns.
              </li>
              <li>
                <strong>Device and browser information</strong> — IP address, browser
                type, operating system, and device identifiers.
              </li>
              <li>
                <strong>Cookies and similar technologies</strong> — session cookies for
                authentication and preferences (see Section 7).
              </li>
            </ul>

            {/* -------------------------------------------------------- */}
            <h2>2. How We Use Your Information</h2>
            <p>We use the information we collect to:</p>
            <ul>
              <li>Provide, maintain, and improve {appName} services.</li>
              <li>
                Process and deliver document signing workflows, including sending
                notifications to signers.
              </li>
              <li>
                Send transactional communications — signing requests, signature
                confirmations, completion notifications, and signing reminders via email
                and SMS.
              </li>
              <li>
                Verify identity through one-time passcodes (OTP) delivered by email or
                SMS.
              </li>
              <li>Process payments and manage subscriptions.</li>
              <li>
                Respond to support requests and communicate with you about your account.
              </li>
              <li>
                Detect, prevent, and address fraud, abuse, security incidents, and
                technical issues.
              </li>
              <li>
                Comply with legal obligations, including maintaining audit trails for
                electronic signatures.
              </li>
            </ul>

            {/* -------------------------------------------------------- */}
            <h2>3. SMS and Text Messaging</h2>
            <p>
              {appName} may send SMS text messages to your mobile phone number when
              enabled for your account. This section describes our SMS messaging
              practices.
            </p>

            <h3>3.1 Consent</h3>
            <p>
              We will only send you SMS messages if you have provided your express
              consent to receive them. Consent to receive SMS messages is not a condition
              of purchasing or using {appName} services. You may use {appName} without
              opting in to SMS notifications.
            </p>

            <h3>3.2 Types of Messages</h3>
            <p>If you opt in, you may receive the following types of SMS messages:</p>
            <ul>
              <li>
                <strong>Signing requests</strong> — notification that a document has been
                sent to you for signature.
              </li>
              <li>
                <strong>Signature notifications</strong> — notification that a signer has
                signed your document.
              </li>
              <li>
                <strong>Completion alerts</strong> — notification that all parties have
                signed a document.
              </li>
              <li>
                <strong>Signing reminders</strong> — periodic reminders for documents
                awaiting your signature.
              </li>
              <li>
                <strong>Verification codes</strong> — one-time passcodes (OTP) for
                identity verification during the signing process.
              </li>
            </ul>

            <h3>3.3 Message Frequency</h3>
            <p>
              Message frequency varies based on your document signing activity. You may
              receive multiple messages per day during periods of active document
              signing. Verification codes are sent only when you initiate a signing
              session that requires SMS-based authentication.
            </p>

            <h3>3.4 Message and Data Rates</h3>
            <p>
              Message and data rates may apply. Please consult your wireless carrier for
              details about your messaging plan.
            </p>

            <h3>3.5 Opting Out</h3>
            <p>You can opt out of SMS messages at any time by:</p>
            <ul>
              <li>
                Replying <strong>STOP</strong> to any SMS message you receive from us.
              </li>
              <li>
                Managing your notification preferences in the SMS Preferences page
                within your {appName} account.
              </li>
              <li>
                Contacting us at{" "}
                <a href={`mailto:${contactEmail}`}>{contactEmail}</a>.
              </li>
            </ul>
            <p>
              After opting out, you will receive a confirmation message and no further
              SMS messages will be sent (except for any pending messages already in
              transit). Opting out of SMS does not affect email notifications or your
              ability to use {appName}.
            </p>

            <h3>3.6 Help</h3>
            <p>
              For help with SMS messages, reply <strong>HELP</strong> to any message or
              contact us at <a href={`mailto:${contactEmail}`}>{contactEmail}</a>.
            </p>

            <h3>3.7 Phone Number Privacy</h3>
            <p>
              We do not sell, rent, or share your phone number with third parties for
              their marketing or promotional purposes. Your phone number is used solely
              for delivering {appName} service-related notifications as described above.
              Phone numbers are shared only with our SMS delivery provider (Twilio) for
              the purpose of transmitting messages on our behalf.
            </p>

            <h3>3.8 Carrier Disclaimer</h3>
            <p>
              Wireless carriers are not liable for delayed or undelivered messages.
              Message delivery is subject to effective transmission from your wireless
              carrier.
            </p>

            {/* -------------------------------------------------------- */}
            <h2>4. How We Share Your Information</h2>
            <p>We do not sell your personal information. We may share information with:</p>
            <ul>
              <li>
                <strong>Document participants</strong> — names and email addresses of
                signers are visible to all parties on a shared document, as necessary to
                complete the signing workflow.
              </li>
              <li>
                <strong>Service providers</strong> — third-party vendors who assist in
                delivering our services, including:
                <ul>
                  <li>Twilio (SMS delivery and phone verification)</li>
                  <li>Stripe (payment processing)</li>
                  <li>Cloud hosting providers (infrastructure)</li>
                  <li>Email delivery services (transactional emails)</li>
                </ul>
                These providers access only the information necessary to perform their
                functions and are bound by contractual obligations to protect your data.
              </li>
              <li>
                <strong>Legal compliance</strong> — when required by law, subpoena, court
                order, or other legal process, or when we believe in good faith that
                disclosure is necessary to protect our rights, your safety, or the
                safety of others.
              </li>
              <li>
                <strong>Business transfers</strong> — in connection with a merger,
                acquisition, or sale of assets, your information may be transferred as
                part of the transaction. We will notify you of any such change.
              </li>
            </ul>

            {/* -------------------------------------------------------- */}
            <h2>5. Data Retention</h2>
            <p>
              We retain your personal information for as long as your account is active
              or as needed to provide you services. Specifically:
            </p>
            <ul>
              <li>
                <strong>Account data</strong> — retained until you delete your account.
              </li>
              <li>
                <strong>Document data</strong> — retained for the duration of your
                account plus any legally required retention period for electronic
                signature records.
              </li>
              <li>
                <strong>SMS message logs</strong> — delivery records retained for up to
                12 months for audit and troubleshooting purposes.
              </li>
              <li>
                <strong>Usage data</strong> — aggregated and anonymized data may be
                retained indefinitely for analytics.
              </li>
            </ul>
            <p>
              You may request deletion of your account and associated personal data by
              contacting us at{" "}
              <a href={`mailto:${contactEmail}`}>{contactEmail}</a>. Certain
              information may be retained as required by law (e.g., signed document
              audit trails).
            </p>

            {/* -------------------------------------------------------- */}
            <h2>6. Data Security</h2>
            <p>
              We implement industry-standard security measures to protect your personal
              information, including:
            </p>
            <ul>
              <li>Encryption in transit (TLS/HTTPS) for all data transmission.</li>
              <li>Encryption at rest for stored documents and sensitive data.</li>
              <li>Access controls limiting employee access to personal data.</li>
              <li>Regular security assessments and code audits.</li>
              <li>
                Secure credential storage with one-way hashing for passwords and
                masking for API keys.
              </li>
            </ul>
            <p>
              While we strive to protect your data, no method of transmission over the
              Internet or electronic storage is completely secure. We cannot guarantee
              absolute security.
            </p>

            {/* -------------------------------------------------------- */}
            <h2>7. Cookies and Tracking</h2>
            <p>{appName} uses the following types of cookies:</p>
            <ul>
              <li>
                <strong>Essential cookies</strong> — required for authentication, session
                management, and core functionality. These cannot be disabled.
              </li>
              <li>
                <strong>Preference cookies</strong> — store your settings and preferences
                (e.g., theme, language).
              </li>
            </ul>
            <p>
              We do not use third-party advertising or analytics tracking cookies. We do
              not engage in cross-site tracking.
            </p>

            {/* -------------------------------------------------------- */}
            <h2>8. Your Rights</h2>
            <p>Depending on your jurisdiction, you may have the right to:</p>
            <ul>
              <li>Access the personal information we hold about you.</li>
              <li>Correct inaccurate or incomplete information.</li>
              <li>
                Request deletion of your personal information (subject to legal
                retention requirements).
              </li>
              <li>
                Object to or restrict certain processing of your information.
              </li>
              <li>Data portability — receive your data in a structured format.</li>
              <li>
                Withdraw consent — where processing is based on consent, you may
                withdraw it at any time.
              </li>
            </ul>
            <p>
              To exercise these rights, contact us at{" "}
              <a href={`mailto:${contactEmail}`}>{contactEmail}</a>. We will respond
              within 30 days.
            </p>

            {/* -------------------------------------------------------- */}
            <h2>9. Children&#39;s Privacy</h2>
            <p>
              {appName} is not directed at children under the age of 13. We do not
              knowingly collect personal information from children under 13. If we become
              aware that we have inadvertently collected such information, we will take
              steps to delete it promptly.
            </p>

            {/* -------------------------------------------------------- */}
            <h2>10. International Data Transfers</h2>
            <p>
              {appName} is operated from the United States. If you access our services
              from outside the United States, your information may be transferred to,
              stored, and processed in the United States or other countries where our
              service providers operate. By using {appName}, you consent to such
              transfers.
            </p>

            {/* -------------------------------------------------------- */}
            <h2>11. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. When we make material
              changes, we will notify you by posting the updated policy on this page with
              a revised effective date. Your continued use of {appName} after changes are
              posted constitutes acceptance of the updated policy.
            </p>

            {/* -------------------------------------------------------- */}
            <h2>12. Contact Us</h2>
            <p>
              If you have questions or concerns about this Privacy Policy or our data
              practices, please contact us:
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

export default PrivacyPolicy;
