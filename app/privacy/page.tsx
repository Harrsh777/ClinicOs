import Link from "next/link";
import { LegalPageLayout } from "@/components/legal/legal-page-layout";
import { LegalSection } from "@/components/legal/legal-section";
import { legalConfig } from "@/lib/legal/config";
import { createPageMetadata } from "@/lib/seo/metadata";

export const metadata = createPageMetadata({
  title: "Privacy Policy — ClinicOS Clinic Growth Software",
  description:
    "Privacy policy for ClinicOS. Learn how EaseHawk Technologies Pvt Ltd collects, uses, stores, and protects clinic and patient data on India's clinic growth platform.",
  path: "/privacy",
});

const sections = [
  { id: "introduction", title: "1. Introduction" },
  { id: "who-we-are", title: "2. Who We Are" },
  { id: "scope", title: "3. Scope" },
  { id: "information-we-collect", title: "4. Information We Collect" },
  { id: "how-we-use", title: "5. How We Use Information" },
  { id: "legal-basis", title: "6. Legal Basis for Processing" },
  { id: "ai-processing", title: "7. AI and Automated Processing" },
  { id: "sharing", title: "8. How We Share Information" },
  { id: "storage-transfers", title: "9. Storage and International Transfers" },
  { id: "retention", title: "10. Data Retention" },
  { id: "security", title: "11. Security" },
  { id: "your-rights", title: "12. Your Rights" },
  { id: "clinic-responsibilities", title: "13. Clinic and Patient Responsibilities" },
  { id: "cookies", title: "14. Cookies and Analytics" },
  { id: "children", title: "15. Children's Privacy" },
  { id: "grievance", title: "16. Grievance Officer" },
  { id: "changes", title: "17. Changes to This Policy" },
  { id: "contact", title: "18. Contact Us" },
] as const;

export default function PrivacyPage() {
  const { brandName, operatingCompany, jurisdiction, grievanceOfficer } = legalConfig;

  return (
    <LegalPageLayout title="Privacy Policy">
      <nav className="legal-toc" aria-label="Table of contents">
        <h2>Contents</h2>
        <ol>
          {sections.map((section) => (
            <li key={section.id}>
              <a href={`#${section.id}`}>{section.title}</a>
            </li>
          ))}
        </ol>
      </nav>

      <LegalSection id="introduction" title="1. Introduction">
        <p>
          This Privacy Policy explains how {operatingCompany} (&quot;we&quot;, &quot;us&quot;, or &quot;our&quot;) collects,
          uses, discloses, stores, and protects personal data when you use {brandName} — our cloud-based clinic growth and
          practice management platform available at {legalConfig.website} and related applications (collectively, the
          &quot;Service&quot;).
        </p>
        <p>
          We are committed to handling personal data responsibly and in accordance with applicable laws in {jurisdiction},
          including the Digital Personal Data Protection Act, 2023 (&quot;DPDP Act&quot;), the Information Technology Act,
          2000, and applicable rules issued thereunder, as well as recognised healthcare data protection principles.
        </p>
      </LegalSection>

      <LegalSection id="who-we-are" title="2. Who We Are">
        <p>
          <strong>Data Fiduciary:</strong> {operatingCompany}
          <br />
          <strong>Product:</strong> {brandName}
          <br />
          <strong>Registered office:</strong> {legalConfig.city}, {legalConfig.governingState}, {jurisdiction}
          <br />
          <strong>Privacy contact:</strong>{" "}
          <a href={`mailto:${legalConfig.privacyEmail}`}>{legalConfig.privacyEmail}</a>
        </p>
        <p>
          {brandName} is provided to licensed clinics, hospitals, diagnostic centres, and their authorised staff. We process
          personal data on behalf of subscribing clinics and, for certain activities, as a data fiduciary with respect to
          account and platform usage data.
        </p>
      </LegalSection>

      <LegalSection id="scope" title="3. Scope">
        <p>This policy applies to:</p>
        <ul>
          <li>Clinic owners, administrators, doctors, nurses, receptionists, and other staff who create or use accounts</li>
          <li>Visitors to our website, demo requests, and marketing forms</li>
          <li>Patient data entered into the Service by clinics, including through booking portals, check-in flows, and teleconsultation</li>
        </ul>
        <p>
          This policy does not cover third-party websites, payment pages operated by payment gateways, or services that
          clinics choose to integrate independently. Those services are governed by their own privacy policies.
        </p>
      </LegalSection>

      <LegalSection id="information-we-collect" title="4. Information We Collect">
        <h3>4.1 Account and clinic information</h3>
        <ul>
          <li>Name, email address, phone number, role, and professional credentials</li>
          <li>Clinic name, address, registration details, branding, and subscription plan</li>
          <li>Login credentials, authentication logs, and staff permissions</li>
        </ul>

        <h3>4.2 Patient and clinical information</h3>
        <p>
          Clinics may store patient health records in the Service, including demographics, medical history, vitals,
          prescriptions, lab results, consultation notes, billing records, appointment history, insurance details, and
          communications such as reminders or follow-up messages.
        </p>

        <h3>4.3 Usage and technical information</h3>
        <ul>
          <li>Device type, browser, IP address, timestamps, and audit logs</li>
          <li>Feature usage, error reports, and performance diagnostics</li>
          <li>Cookies and similar technologies as described in Section 14</li>
        </ul>

        <h3>4.4 Communications and support</h3>
        <ul>
          <li>Messages sent through support channels, demo requests, and feedback</li>
          <li>Call, chat, email, or WhatsApp metadata where clinics enable those channels</li>
        </ul>
      </LegalSection>

      <LegalSection id="how-we-use" title="5. How We Use Information">
        <p>We use personal data to:</p>
        <ul>
          <li>Provide, operate, maintain, and improve the Service</li>
          <li>Authenticate users, enforce role-based access, and protect accounts</li>
          <li>Process appointments, queue management, billing, prescriptions, and clinic workflows</li>
          <li>Send transactional notifications such as OTPs, appointment confirmations, and account alerts</li>
          <li>Enable optional AI-assisted features requested by the clinic</li>
          <li>Provide customer support, onboarding, and training</li>
          <li>Comply with legal obligations, respond to lawful requests, and prevent fraud or abuse</li>
          <li>Analyse aggregated, de-identified usage to improve reliability and product quality</li>
        </ul>
        <p className="legal-callout">
          We do not sell patient health information. We do not use patient clinical records for unrelated advertising.
        </p>
      </LegalSection>

      <LegalSection id="legal-basis" title="6. Legal Basis for Processing">
        <p>Depending on the context, we process personal data based on one or more of the following:</p>
        <ul>
          <li>
            <strong>Performance of a contract</strong> — to deliver the Service to subscribing clinics and their users
          </li>
          <li>
            <strong>Consent</strong> — where required for marketing communications, optional integrations, or specific
            patient-facing features enabled by the clinic
          </li>
          <li>
            <strong>Legitimate interests</strong> — to secure the platform, prevent misuse, and improve functionality,
            balanced against individual rights
          </li>
          <li>
            <strong>Legal obligation</strong> — to meet regulatory, tax, accounting, or law-enforcement requirements
          </li>
        </ul>
        <p>
          Clinics are responsible for obtaining valid patient consent and providing required notices before collecting or
          uploading patient data into {brandName}.
        </p>
      </LegalSection>

      <LegalSection id="ai-processing" title="7. AI and Automated Processing">
        <p>
          {brandName} may offer optional AI-assisted tools such as clinical documentation support, follow-up message
          drafting, billing insights, and operational recommendations. When enabled by a clinic:
        </p>
        <ul>
          <li>Relevant clinic and patient data may be processed to generate suggested outputs</li>
          <li>Outputs are assistive only and must be reviewed by qualified professionals before clinical use</li>
          <li>We implement access controls and logging for AI-related processing</li>
          <li>We do not use identifiable patient records to train public third-party models without explicit agreement</li>
        </ul>
      </LegalSection>

      <LegalSection id="sharing" title="8. How We Share Information">
        <p>We may share personal data only as necessary with:</p>
        <ul>
          <li>
            <strong>Infrastructure and hosting providers</strong> — for secure cloud hosting, database, storage, and
            backups
          </li>
          <li>
            <strong>Communication providers</strong> — for email, SMS, and WhatsApp delivery where configured by the
            clinic
          </li>
          <li>
            <strong>Payment processors</strong> — such as Razorpay, to process subscription and clinic billing payments
          </li>
          <li>
            <strong>Professional advisers</strong> — lawyers, auditors, or insurers under confidentiality obligations
          </li>
          <li>
            <strong>Authorities</strong> — when required by applicable law, court order, or to protect rights, safety, and
            security
          </li>
        </ul>
        <p>
          All subprocessors are required to implement appropriate technical and organisational safeguards and process data
          only on our documented instructions or as otherwise permitted by law.
        </p>
      </LegalSection>

      <LegalSection id="storage-transfers" title="9. Storage and International Transfers">
        <p>
          Data is primarily stored on secure cloud infrastructure. Where data is transferred outside India, we take
          reasonable steps to ensure an adequate level of protection consistent with applicable law, including contractual
          safeguards with service providers.
        </p>
      </LegalSection>

      <LegalSection id="retention" title="10. Data Retention">
        <p>
          We retain personal data for as long as necessary to provide the Service, fulfil contractual obligations, resolve
          disputes, and comply with legal requirements. Medical records uploaded by clinics may be subject to statutory
          retention periods under applicable healthcare laws; clinics should configure retention in line with their
          regulatory obligations.
        </p>
        <p>
          When a clinic terminates its subscription, we delete or anonymise account data within a reasonable period,
          except where retention is required by law or for legitimate business purposes such as billing records and audit
          logs.
        </p>
      </LegalSection>

      <LegalSection id="security" title="11. Security">
        <p>We implement administrative, technical, and physical safeguards designed to protect personal data, including:</p>
        <ul>
          <li>Encryption in transit using TLS</li>
          <li>Encryption at rest for stored data where supported by infrastructure</li>
          <li>Role-based access controls and multi-tenant data isolation</li>
          <li>Authentication, session management, and activity logging</li>
          <li>Regular backups, monitoring, and incident response procedures</li>
        </ul>
        <p>
          No method of transmission or storage is completely secure. Clinics must also protect staff credentials, devices,
          and internal access policies.
        </p>
      </LegalSection>

      <LegalSection id="your-rights" title="12. Your Rights">
        <p>Subject to applicable law, data principals may have the right to:</p>
        <ul>
          <li>Access personal data we hold about them</li>
          <li>Request correction of inaccurate or incomplete data</li>
          <li>Withdraw consent where processing is consent-based</li>
          <li>Request erasure, subject to legal and medical-record retention requirements</li>
          <li>Nominate another individual to exercise rights in certain circumstances</li>
          <li>Lodge a complaint with the relevant authority</li>
        </ul>
        <p>
          Clinic staff and account holders may submit requests to{" "}
          <a href={`mailto:${legalConfig.privacyEmail}`}>{legalConfig.privacyEmail}</a>. Patients should contact their
          treating clinic first for health-record requests, as the clinic is typically the primary custodian of medical
          records.
        </p>
      </LegalSection>

      <LegalSection id="clinic-responsibilities" title="13. Clinic and Patient Responsibilities">
        <p>Subscribing clinics are responsible for:</p>
        <ul>
          <li>Determining the lawful basis for collecting and processing patient data</li>
          <li>Providing patients with required privacy notices and obtaining consent where needed</li>
          <li>Ensuring data entered into the Service is accurate and clinically appropriate</li>
          <li>Managing staff access, offboarding, and internal confidentiality obligations</li>
          <li>Complying with telemedicine, clinical establishment, and professional council requirements</li>
        </ul>
      </LegalSection>

      <LegalSection id="cookies" title="14. Cookies and Analytics">
        <p>
          We use essential cookies and similar technologies to keep you signed in, remember preferences, and protect the
          Service. We may use analytics tools to understand how the website and product are used. You can control
          non-essential cookies through your browser settings, although some features may not function correctly if
          essential cookies are disabled.
        </p>
      </LegalSection>

      <LegalSection id="children" title="15. Children's Privacy">
        <p>
          The Service is intended for use by licensed healthcare providers and their authorised staff. It is not directed
          at children under 18 for independent account creation. Where minors&apos; health data is processed, it must be
          entered by the clinic with appropriate guardian consent as required by law.
        </p>
      </LegalSection>

      <LegalSection id="grievance" title="16. Grievance Officer">
        <p>
          In accordance with applicable Indian law, you may contact our Grievance Officer for privacy-related concerns:
        </p>
        <p>
          <strong>{grievanceOfficer.name}</strong>
          <br />
          Email: <a href={`mailto:${grievanceOfficer.email}`}>{grievanceOfficer.email}</a>
          <br />
          We aim to acknowledge complaints within 7 days and resolve them within {grievanceOfficer.responseDays} days,
          subject to complexity and legal requirements.
        </p>
      </LegalSection>

      <LegalSection id="changes" title="17. Changes to This Policy">
        <p>
          We may update this Privacy Policy from time to time. Material changes will be communicated through the Service,
          by email to account holders, or by posting an updated version on this page with a revised effective date.
          Continued use of the Service after changes become effective constitutes acceptance of the updated policy.
        </p>
      </LegalSection>

      <LegalSection id="contact" title="18. Contact Us">
        <p>
          For privacy questions, data requests, or security concerns, contact us at{" "}
          <a href={`mailto:${legalConfig.privacyEmail}`}>{legalConfig.privacyEmail}</a> or{" "}
          <a href={`mailto:${legalConfig.contactEmail}`}>{legalConfig.contactEmail}</a>.
        </p>
        <p>
          For contractual matters, see our <Link href="/terms">Terms of Service</Link>.
        </p>
      </LegalSection>
    </LegalPageLayout>
  );
}
