import Link from "next/link";
import { ClinicOsWordmark } from "@/components/brand/clinicos-wordmark";
import { legalConfig } from "@/lib/legal/config";

type LegalPageLayoutProps = {
  title: string;
  children: React.ReactNode;
};

export function LegalPageLayout({ title, children }: LegalPageLayoutProps) {
  return (
    <div className="legal-page">
      <header className="legal-page-header">
        <div className="legal-page-header-inner">
          <Link href="/" className="legal-page-brand">
            <span className="legal-page-logo" aria-hidden>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
                <path d="M12 4v16M4 12h16" />
              </svg>
            </span>
            <ClinicOsWordmark clinicClassName="text-[var(--text-primary)]" osClassName="text-[var(--brand-600)]" />
          </Link>
          <Link href="/" className="legal-page-back">
            Back to home
          </Link>
        </div>
      </header>

      <main className="legal-page-main">
        <div className="legal-page-intro">
          <h1>{title}</h1>
          <p className="legal-page-meta">
            Effective date: {legalConfig.effectiveDate} · Last updated: {legalConfig.lastUpdated}
          </p>
        </div>
        <article className="legal-doc">{children}</article>
      </main>

      <footer className="legal-page-footer">
        <div className="legal-page-footer-inner">
          <span>
            © {new Date().getFullYear()} {legalConfig.operatingCompany}. {legalConfig.brandName} is a product of{" "}
            {legalConfig.operatingCompany}.
          </span>
          <nav className="legal-page-footer-nav" aria-label="Legal">
            <Link href="/privacy">Privacy Policy</Link>
            <Link href="/terms">Terms of Service</Link>
            <a href={legalConfig.contactEmail.startsWith("http") ? legalConfig.contactEmail : `mailto:${legalConfig.contactEmail}`}>
              Contact
            </a>
            <a href="https://harshsrivastava.in/" target="_blank" rel="noopener noreferrer">
              Founded by Harsh Srivastava
            </a>
          </nav>
        </div>
      </footer>
    </div>
  );
}
