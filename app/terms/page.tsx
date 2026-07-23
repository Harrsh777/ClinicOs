import Link from "next/link";
import { LegalPageLayout } from "@/components/legal/legal-page-layout";
import { LegalSection } from "@/components/legal/legal-section";
import { legalConfig } from "@/lib/legal/config";
import { createPageMetadata } from "@/lib/seo/metadata";

export const metadata = createPageMetadata({
  title: "Terms of Service — ClinicOS Clinic Growth Software",
  description:
    "Terms governing use of ClinicOS, India's AI-powered clinic growth software operated by EaseHawk Technologies Pvt Ltd.",
  path: "/terms",
});

const sections = [
  { id: "agreement", title: "1. Agreement to Terms" },
  { id: "about", title: "2. About ClinicOS" },
  { id: "eligibility", title: "3. Eligibility" },
  { id: "accounts", title: "4. Accounts and Security" },
  { id: "subscription", title: "5. Subscription and Billing" },
  { id: "permitted-use", title: "6. Permitted Use" },
  { id: "clinical-data", title: "7. Clinical and Patient Data" },
  { id: "ai-features", title: "8. AI-Assisted Features" },
  { id: "telemedicine", title: "9. Telemedicine" },
  { id: "intellectual-property", title: "10. Intellectual Property" },
  { id: "confidentiality", title: "11. Confidentiality" },
  { id: "availability", title: "12. Availability and Support" },
  { id: "disclaimers", title: "13. Disclaimers" },
  { id: "liability", title: "14. Limitation of Liability" },
  { id: "indemnity", title: "15. Indemnification" },
  { id: "termination", title: "16. Termination" },
  { id: "governing-law", title: "17. Governing Law and Disputes" },
  { id: "changes", title: "18. Changes to Terms" },
  { id: "contact", title: "19. Contact" },
] as const;

export default function TermsPage() {
  const { brandName, operatingCompany, jurisdiction, governingState } = legalConfig;

  return (
    <LegalPageLayout title="Terms of Service">
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

      <LegalSection id="agreement" title="1. Agreement to Terms">
        <p>
          These Terms of Service (&quot;Terms&quot;) constitute a legally binding agreement between you and{" "}
          {operatingCompany} (&quot;Company&quot;, &quot;we&quot;, &quot;us&quot;, or &quot;our&quot;) governing access to
          and use of {brandName}, including our website, web application, APIs, mobile interfaces, and related services
          (collectively, the &quot;Service&quot;).
        </p>
        <p>
          By creating an account, registering a clinic, signing in, or otherwise using the Service, you agree to these
          Terms and our <Link href="/privacy">Privacy Policy</Link>. If you do not agree, do not use the Service.
        </p>
      </LegalSection>

      <LegalSection id="about" title="2. About ClinicOS">
        <p>
          {brandName} is a software-as-a-service platform that helps clinics manage appointments, patient records,
          billing, communications, queue management, teleconsultation, and growth workflows. {brandName} is a product of{" "}
          {operatingCompany}.
        </p>
        <p className="legal-callout">
          {brandName} is a technology platform. It is not a medical provider and does not provide medical advice,
          diagnosis, or treatment.
        </p>
      </LegalSection>

      <LegalSection id="eligibility" title="3. Eligibility">
        <p>You may use the Service only if:</p>
        <ul>
          <li>You are at least 18 years old and legally capable of entering into a binding contract</li>
          <li>You are a licensed healthcare provider, clinic owner, authorised staff member, or duly authorised representative of a clinic</li>
          <li>You are not barred from using the Service under applicable law</li>
        </ul>
        <p>
          Clinic owners are responsible for ensuring that staff accounts are created only for authorised personnel and
          that users comply with these Terms.
        </p>
      </LegalSection>

      <LegalSection id="accounts" title="4. Accounts and Security">
        <p>When you register, you agree to:</p>
        <ul>
          <li>Provide accurate, current, and complete information</li>
          <li>Maintain the confidentiality of login credentials and clinic access codes</li>
          <li>Promptly update account information when it changes</li>
          <li>Notify us immediately of any unauthorised access or security incident</li>
        </ul>
        <p>
          You are responsible for all activity under your account, including actions taken by staff you authorise. We may
          suspend or terminate accounts that violate these Terms or pose a security risk.
        </p>
      </LegalSection>

      <LegalSection id="subscription" title="5. Subscription and Billing">
        <p>
          Access to certain features requires a paid subscription. Fees, plan limits, and billing cycles are described on
          our pricing page or in your order form. Unless stated otherwise:
        </p>
        <ul>
          <li>Subscriptions renew automatically until cancelled in accordance with your plan</li>
          <li>Fees are quoted in Indian Rupees unless otherwise specified</li>
          <li>Payments may be processed through third-party gateways such as Razorpay</li>
          <li>Taxes, levies, or duties applicable under Indian law may be added where required</li>
          <li>Failure to pay may result in suspension or downgrade of the Service</li>
        </ul>
        <p>
          Refund eligibility, if any, will be stated in your plan terms or separate agreement. Except where required by
          law, fees already paid are non-refundable once a billing period has commenced.
        </p>
      </LegalSection>

      <LegalSection id="permitted-use" title="6. Permitted Use">
        <p>You agree not to:</p>
        <ul>
          <li>Use the Service for unlawful, fraudulent, or harmful purposes</li>
          <li>Upload malware, attempt unauthorised access, or interfere with platform security</li>
          <li>Reverse engineer, copy, resell, or sublicense the Service except as expressly permitted</li>
          <li>Misrepresent your identity, credentials, or affiliation with a clinic</li>
          <li>Harvest patient or user data for unrelated marketing without valid consent</li>
          <li>Use the Service in a manner that infringes intellectual property or privacy rights</li>
        </ul>
        <p>We may investigate violations and cooperate with law enforcement where appropriate.</p>
      </LegalSection>

      <LegalSection id="clinical-data" title="7. Clinical and Patient Data">
        <p>
          Clinics retain ownership of patient and clinical data they upload or generate through the Service. You grant us
          a limited licence to host, process, transmit, back up, and display that data solely to provide and improve the
          Service, comply with law, and support optional features you enable.
        </p>
        <p>Clinics are solely responsible for:</p>
        <ul>
          <li>Obtaining valid patient consent and providing required notices</li>
          <li>Accuracy, completeness, and clinical appropriateness of records</li>
          <li>Compliance with applicable medical council rules, clinical establishment laws, and record-keeping obligations</li>
          <li>Staff training and supervision in the use of digital health tools</li>
        </ul>
      </LegalSection>

      <LegalSection id="ai-features" title="8. AI-Assisted Features">
        <p>
          The Service may include optional AI-assisted tools for documentation, messaging, analytics, and operational
          support. You acknowledge that:
        </p>
        <ul>
          <li>AI outputs may be incomplete, inaccurate, or inappropriate for a given clinical context</li>
          <li>Licensed professionals must review and approve all clinical outputs before use with patients</li>
          <li>AI features are assistive tools, not substitutes for professional medical judgment</li>
          <li>You remain fully responsible for clinical decisions and patient communications</li>
        </ul>
      </LegalSection>

      <LegalSection id="telemedicine" title="9. Telemedicine">
        <p>
          Where teleconsultation features are enabled, clinics must comply with applicable telemedicine guidelines,
          including patient identification, consent, prescription rules, emergency escalation procedures, and
          record-keeping requirements. {brandName} provides the technology layer only; clinics are responsible for
          clinical compliance.
        </p>
      </LegalSection>

      <LegalSection id="intellectual-property" title="10. Intellectual Property">
        <p>
          The Service, including software, design, branding, documentation, and underlying technology, is owned by the
          Company or its licensors and is protected by applicable intellectual property laws. These Terms do not transfer
          any ownership rights to you.
        </p>
        <p>
          You may not use {brandName} trademarks, logos, or branding except as permitted in writing or through approved
          white-label settings provided within the Service.
        </p>
      </LegalSection>

      <LegalSection id="confidentiality" title="11. Confidentiality">
        <p>
          Each party agrees to protect the other&apos;s confidential information using reasonable care and to use it only
          for purposes related to the Service. This obligation does not apply to information that is publicly available
          without breach, independently developed, or lawfully obtained from a third party.
        </p>
      </LegalSection>

      <LegalSection id="availability" title="12. Availability and Support">
        <p>
          We strive to maintain reliable availability but do not guarantee uninterrupted or error-free operation. The
          Service may be unavailable due to maintenance, upgrades, network issues, third-party outages, or events beyond
          our reasonable control.
        </p>
        <p>
          Planned maintenance will be communicated in advance where practicable. Support channels and response times may
          vary by subscription plan.
        </p>
      </LegalSection>

      <LegalSection id="disclaimers" title="13. Disclaimers">
        <p>
          To the maximum extent permitted by law, the Service is provided on an &quot;as is&quot; and &quot;as
          available&quot; basis without warranties of any kind, whether express, implied, or statutory, including
          warranties of merchantability, fitness for a particular purpose, non-infringement, or accuracy of clinical
          outputs.
        </p>
        <p>
          We do not warrant that the Service will meet every clinic&apos;s requirements or that AI-generated content will
          be clinically correct.
        </p>
      </LegalSection>

      <LegalSection id="liability" title="14. Limitation of Liability">
        <p>
          To the maximum extent permitted by applicable law, the Company and its directors, officers, employees, and
          suppliers shall not be liable for any indirect, incidental, special, consequential, exemplary, or punitive
          damages, or for loss of profits, revenue, data, goodwill, or business interruption, arising out of or related
          to the Service.
        </p>
        <p>
          Our total aggregate liability for any claims arising out of or relating to the Service shall not exceed the
          amount paid by you to us for the Service in the twelve (12) months preceding the event giving rise to the claim,
          except where liability cannot be limited under applicable law.
        </p>
      </LegalSection>

      <LegalSection id="indemnity" title="15. Indemnification">
        <p>
          You agree to indemnify and hold harmless the Company from claims, losses, liabilities, damages, costs, and
          expenses (including reasonable legal fees) arising from your use of the Service, your breach of these Terms,
          your violation of law, or patient claims relating to clinical care, consent, or records managed by your clinic.
        </p>
      </LegalSection>

      <LegalSection id="termination" title="16. Termination">
        <p>
          You may stop using the Service at any time. We may suspend or terminate access if you breach these Terms, fail
          to pay fees, create security or legal risk, or if required by law.
        </p>
        <p>
          Upon termination, your right to access the Service ends. Provisions that by nature should survive — including
          payment obligations, confidentiality, disclaimers, limitation of liability, indemnity, and governing law —
          will continue to apply.
        </p>
      </LegalSection>

      <LegalSection id="governing-law" title="17. Governing Law and Disputes">
        <p>
          These Terms are governed by the laws of {jurisdiction}, without regard to conflict-of-law principles. Courts
          in {governingState} shall have exclusive jurisdiction over disputes arising out of or relating to these Terms,
          subject to any mandatory consumer protection rights that cannot be waived.
        </p>
        <p>
          Before initiating formal proceedings, the parties agree to attempt good-faith resolution by contacting{" "}
          <a href={`mailto:${legalConfig.legalEmail}`}>{legalConfig.legalEmail}</a>.
        </p>
      </LegalSection>

      <LegalSection id="changes" title="18. Changes to Terms">
        <p>
          We may modify these Terms from time to time. Material changes will be notified through the Service, by email,
          or by posting an updated version on this page. Continued use after the effective date of revised Terms
          constitutes acceptance.
        </p>
      </LegalSection>

      <LegalSection id="contact" title="19. Contact">
        <p>
          For questions about these Terms, contact{" "}
          <a href={`mailto:${legalConfig.legalEmail}`}>{legalConfig.legalEmail}</a> or{" "}
          <a href={`mailto:${legalConfig.supportEmail}`}>{legalConfig.supportEmail}</a>.
        </p>
        <p>
          For data protection matters, see our <Link href="/privacy">Privacy Policy</Link>.
        </p>
      </LegalSection>
    </LegalPageLayout>
  );
}
