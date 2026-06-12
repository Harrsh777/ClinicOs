import Link from "next/link";
import {
  Activity, Calendar, Users, ListOrdered, Video, Sparkles,
  Receipt, Shield, Stethoscope, MessageSquare, BarChart3, Check,
} from "lucide-react";

const FEATURES = [
  { icon: Users, title: "Patient Management", desc: "Complete EMR with vitals, allergies, documents, and health risk detection" },
  { icon: Calendar, title: "Smart Appointments", desc: "Book, approve, reschedule — plus AI WhatsApp booking bot" },
  { icon: ListOrdered, title: "Live Queue", desc: "Real-time token updates with QR check-in and TV display" },
  { icon: Stethoscope, title: "AI Medical Scribe", desc: "Dictate consultations — AI structures notes and Rx drafts" },
  { icon: Video, title: "Telemedicine", desc: "HD video consultations with waiting room and session management" },
  { icon: Receipt, title: "Billing & Insurance", desc: "Invoices, UPI payments, insurance claims, and AI billing assistant" },
  { icon: Sparkles, title: "AI Insights", desc: "Billing alerts, follow-up agents, and population health risks" },
  { icon: BarChart3, title: "Accounting & P&L", desc: "Income tracking, expenses, doctor commissions, and exports" },
];

const PLANS = [
  {
    name: "Starter",
    price: "₹2,999",
    period: "/month",
    features: ["Up to 500 patients", "Appointments & Queue", "Basic billing", "2 staff accounts"],
  },
  {
    name: "Pro",
    price: "₹7,999",
    period: "/month",
    popular: true,
    features: ["Unlimited patients", "AI Scribe (500 min/mo)", "Telemedicine", "Lab & Pharmacy", "WhatsApp bot"],
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "",
    features: ["White-label branding", "Unlimited AI usage", "Custom domain", "Priority support", "API access"],
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[var(--surface-1)]">
      {/* Nav */}
      <header className="sticky top-0 z-50 border-b border-[var(--border)] bg-[var(--surface-0)]/80 backdrop-blur-lg">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-md)] bg-gradient-to-br from-[var(--brand-500)] to-[var(--accent-500)]">
              <Activity className="h-5 w-5 text-white" />
            </div>
            <span className="text-lg font-bold text-[var(--text-primary)]">ClinicOS</span>
          </div>
          <nav className="hidden items-center gap-8 md:flex">
            <a href="#features" className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">Features</a>
            <a href="#pricing" className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">Pricing</a>
            <Link href="/privacy" className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">Privacy</Link>
          </nav>
          <div className="flex items-center gap-3">
            <Link href="/login" className="clinic-btn clinic-btn-ghost clinic-btn-sm hidden sm:inline-flex">Sign In</Link>
            <Link href="/login" className="clinic-btn clinic-btn-primary clinic-btn-sm">Get Started</Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[var(--brand-50)] via-transparent to-[var(--accent-50)]" />
        <div className="absolute top-20 right-0 h-96 w-96 rounded-full bg-[var(--brand-200)] opacity-20 blur-3xl" />
        <div className="absolute bottom-0 left-0 h-64 w-64 rounded-full bg-[var(--accent-200)] opacity-20 blur-3xl" />

        <div className="relative mx-auto max-w-6xl px-6 py-24 text-center lg:py-32">
          <div className="inline-flex items-center gap-2 rounded-full border border-[var(--brand-200)] bg-[var(--brand-50)] px-4 py-1.5 text-sm text-[var(--brand-700)] mb-6">
            <Sparkles className="h-4 w-4" />
            AI-powered clinic operations for India
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-[var(--text-primary)] sm:text-6xl lg:text-7xl">
            Run your clinic on{" "}
            <span className="bg-gradient-to-r from-[var(--brand-600)] to-[var(--accent-600)] bg-clip-text text-transparent">
              autopilot
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-[var(--text-secondary)] leading-relaxed">
            Patients, appointments, live queue, AI scribe, telemedicine, billing, and accounting —
            one beautiful platform built for Indian clinics.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row justify-center gap-4">
            <Link href="/login" className="clinic-btn clinic-btn-primary clinic-btn-lg shadow-[var(--shadow-brand)]">
              Start Free Trial
            </Link>
            <a href="#features" className="clinic-btn clinic-btn-secondary clinic-btn-lg">
              Explore Features
            </a>
          </div>
          <div className="mt-12 flex flex-wrap justify-center gap-8 text-sm text-[var(--text-muted)]">
            <span className="flex items-center gap-2"><Shield className="h-4 w-4 text-[var(--success-500)]" /> HIPAA-ready architecture</span>
            <span className="flex items-center gap-2"><MessageSquare className="h-4 w-4 text-[var(--brand-500)]" /> WhatsApp integration</span>
            <span className="flex items-center gap-2"><Check className="h-4 w-4 text-[var(--success-500)]" /> Multi-tenant SaaS</span>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto max-w-6xl px-6 py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-[var(--text-primary)]">Everything your clinic needs</h2>
          <p className="mt-2 text-[var(--text-secondary)]">From patient check-in to P&L reports — end to end</p>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f) => (
            <div key={f.title} className="clinic-card p-6 clinic-card-hover group">
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-[var(--radius-md)] bg-[var(--brand-50)] text-[var(--brand-600)] group-hover:bg-[var(--brand-500)] group-hover:text-white transition-colors">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="font-semibold text-[var(--text-primary)]">{f.title}</h3>
              <p className="mt-2 text-sm text-[var(--text-muted)] leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* AI Highlight */}
      <section className="bg-gradient-to-r from-[var(--brand-600)] to-[var(--accent-600)] py-20">
        <div className="mx-auto max-w-6xl px-6 grid gap-12 lg:grid-cols-2 items-center">
          <div className="text-white">
            <h2 className="text-3xl font-bold">AI that works alongside your doctors</h2>
            <p className="mt-4 text-white/80 leading-relaxed">
              Medical scribe captures consultations in real-time. WhatsApp bot books appointments 24/7.
              Billing assistant catches missing charges. Follow-up agent checks medicine adherence.
            </p>
            <Link href="/login" className="clinic-btn mt-8 bg-white text-[var(--brand-700)] hover:bg-white/90 clinic-btn-lg">
              See AI in Action
            </Link>
          </div>
          <div className="clinic-card p-6 bg-white/10 backdrop-blur border-white/20 text-white">
            <div className="space-y-4 text-sm">
              <div className="rounded-lg bg-white/10 p-4">
                <p className="font-medium mb-1">AI Scribe Output</p>
                <p className="text-white/70">Symptoms: Persistent cough, low-grade fever for 3 days...</p>
                <p className="text-white/70 mt-1">Diagnosis: Upper respiratory tract infection</p>
              </div>
              <div className="rounded-lg bg-white/10 p-4">
                <p className="font-medium mb-1">WhatsApp Bot</p>
                <p className="text-white/70">&quot;Book appointment tomorrow&quot; → Confirmed for 10:00 AM ✓</p>
              </div>
              <div className="rounded-lg bg-white/10 p-4">
                <p className="font-medium mb-1">Billing Alert</p>
                <p className="text-white/70">3 consultations without invoices — ₹4,500 unbilled</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="mx-auto max-w-6xl px-6 py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-[var(--text-primary)]">Simple, transparent pricing</h2>
          <p className="mt-2 text-[var(--text-secondary)]">Start free, scale as you grow</p>
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          {PLANS.map((plan) => (
            <div
              key={plan.name}
              className={`clinic-card p-8 relative ${plan.popular ? "ring-2 ring-[var(--brand-500)] shadow-[var(--shadow-brand)]" : ""}`}
            >
              {plan.popular && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[var(--brand-500)] px-3 py-1 text-xs font-medium text-white">
                  Most Popular
                </span>
              )}
              <h3 className="text-xl font-bold">{plan.name}</h3>
              <div className="mt-4 mb-6">
                <span className="text-4xl font-bold">{plan.price}</span>
                <span className="text-[var(--text-muted)]">{plan.period}</span>
              </div>
              <ul className="space-y-3 mb-8">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                    <Check className="h-4 w-4 text-[var(--success-500)] shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href="/login"
                className={`clinic-btn w-full clinic-btn-lg ${plan.popular ? "clinic-btn-primary" : "clinic-btn-secondary"}`}
              >
                Get Started
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-6 pb-20">
        <div className="clinic-card p-12 text-center bg-gradient-to-br from-[var(--surface-0)] to-[var(--brand-50)]">
          <h2 className="text-3xl font-bold text-[var(--text-primary)]">Ready to modernize your clinic?</h2>
          <p className="mt-3 text-[var(--text-secondary)] max-w-lg mx-auto">
            Join clinics across India using ClinicOS for smarter operations.
          </p>
          <Link href="/login" className="clinic-btn clinic-btn-primary clinic-btn-lg mt-8 shadow-[var(--shadow-brand)]">
            Start Your Free Trial
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[var(--border)] bg-[var(--surface-0)]">
        <div className="mx-auto max-w-6xl px-6 py-10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-[var(--brand-500)]" />
            <span className="font-semibold">ClinicOS</span>
          </div>
          <div className="flex gap-6 text-sm text-[var(--text-muted)]">
            <Link href="/privacy" className="hover:text-[var(--text-primary)]">Privacy</Link>
            <Link href="/terms" className="hover:text-[var(--text-primary)]">Terms</Link>
            <a href="mailto:support@clinicos.ai" className="hover:text-[var(--text-primary)]">Contact</a>
          </div>
          <p className="text-sm text-[var(--text-muted)]">© 2026 ClinicOS. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
