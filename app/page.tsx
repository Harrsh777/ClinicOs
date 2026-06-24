"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";

// ─── Inline style helpers ────────────────────────────────────────────────────
const COLORS = {
  bg: "#F8FAFC",
  primary: "#0F172A",
  accent: "#14B8A6",
  accent2: "#06B6D4",
  white: "#FFFFFF",
  border: "#E2E8F0",
  muted: "#64748B",
  light: "#F1F5F9",
  dark: "#020617",
};

// ─── Tiny animation hook ─────────────────────────────────────────────────────
function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, visible };
}

// ─── Floating pill badge ─────────────────────────────────────────────────────
function Badge({ children, color = COLORS.accent }: { children: React.ReactNode; color?: string }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 6,
      padding: "4px 12px", borderRadius: 999,
      background: `${color}18`, border: `1px solid ${color}40`,
      color, fontSize: 12, fontWeight: 600, letterSpacing: "0.04em",
      fontFamily: "Inter, sans-serif",
    }}>{children}</span>
  );
}

// ─── Section wrapper with fade-in ────────────────────────────────────────────
function Section({ children, style = {} }: { children: React.ReactNode; style?: React.CSSProperties }) {
  const { ref, visible } = useInView();
  return (
    <div ref={ref} style={{
      opacity: visible ? 1 : 0,
      transform: visible ? "translateY(0)" : "translateY(32px)",
      transition: "opacity 0.7s ease, transform 0.7s ease",
      ...style,
    }}>{children}</div>
  );
}

// ─── Mini sparkline svg ───────────────────────────────────────────────────────
function Sparkline({ color = COLORS.accent }: { color?: string }) {
  const pts = [20, 35, 28, 45, 38, 55, 42, 60, 50, 70, 58, 65];
  const max = Math.max(...pts), min = Math.min(...pts);
  const w = 120, h = 40;
  const coords = pts.map((p, i) => `${(i / (pts.length - 1)) * w},${h - ((p - min) / (max - min)) * h}`).join(" ");
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} fill="none">
      <polyline points={coords} stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" fill="none" />
      <polygon points={`0,${h} ${coords} ${w},${h}`} fill={`url(#sp-${color.replace('#', '')})`} />
      <defs>
        <linearGradient id={`sp-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop stopColor={color} stopOpacity="0.25" />
          <stop offset="1" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
    </svg>
  );
}

// ─── Hero dashboard preview ───────────────────────────────────────────────────
function HeroDashboard() {
  const metrics = [
    { label: "Active patients", value: "12,847", delta: "+8.2%" },
    { label: "Avg wait time", value: "4m 12s", delta: "-23%" },
    { label: "AI accuracy", value: "98.7%", delta: "+1.4%" },
  ];

  return (
    <div style={{ width: "100%", maxWidth: 940, margin: "0 auto", position: "relative" }}>
      <div style={{
        position: "absolute", inset: "18% -7% -12%", borderRadius: 36,
        background: `radial-gradient(circle at 18% 28%, ${COLORS.accent}28, transparent 28%),
                     radial-gradient(circle at 82% 18%, ${COLORS.accent2}22, transparent 26%),
                     linear-gradient(135deg, rgba(15,23,42,0.16), rgba(20,184,166,0.08))`,
        filter: "blur(26px)", opacity: 0.75,
      }} />

      <div className="hero-preview" style={{
        position: "relative", background: "rgba(255,255,255,0.92)",
        backdropFilter: "blur(28px)", border: "1px solid rgba(255,255,255,0.82)",
        borderRadius: 24, padding: 18,
        boxShadow: "0 30px 80px rgba(15,23,42,0.18), 0 16px 44px rgba(20,184,166,0.14)",
      }}>
        <div className="hero-dashboard-shell" style={{
          display: "grid", gridTemplateColumns: "minmax(112px, 164px) 1fr",
          minHeight: 350, overflow: "hidden", borderRadius: 18,
          background: COLORS.white, border: `1px solid ${COLORS.border}`,
        }}>
          <aside className="hero-sidebar" style={{ background: "#F8FBFA", borderRight: `1px solid ${COLORS.border}`, padding: 18 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 24 }}>
              <div style={{ width: 24, height: 24, borderRadius: 8, background: `${COLORS.accent}18`, display: "grid", placeItems: "center", color: COLORS.accent, fontWeight: 900, fontSize: 13 }}>+</div>
              <span style={{ fontSize: 13, fontWeight: 800, color: COLORS.primary, fontFamily: "Geist, Inter, sans-serif" }}>Clinicos</span>
            </div>
            {["Overview", "Diagnostics", "Prescriptions", "Analytics"].map((item, index) => (
              <div key={item} style={{
                padding: "10px 11px", borderRadius: 10, marginBottom: 7,
                background: index === 0 ? COLORS.light : "transparent",
                color: index === 0 ? COLORS.primary : COLORS.muted,
                fontSize: 11, fontWeight: 700, fontFamily: "Inter, sans-serif",
              }}>
                {item}
              </div>
            ))}
          </aside>

          <main style={{ padding: 24, position: "relative" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, marginBottom: 22 }}>
              <div>
                <p style={{ fontSize: 12, fontWeight: 800, color: COLORS.primary, fontFamily: "Geist, Inter, sans-serif", marginBottom: 4 }}>Workspace</p>
                <p style={{ fontSize: 10, color: COLORS.muted, fontFamily: "Inter, sans-serif" }}>Clinic command center</p>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 7, color: COLORS.accent, fontSize: 10, fontWeight: 700, fontFamily: "Inter, sans-serif" }}>
                <span style={{ width: 7, height: 7, borderRadius: "50%", background: COLORS.accent, boxShadow: `0 0 10px ${COLORS.accent}` }} />
                Online
              </div>
            </div>

            <div className="hero-metrics" style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 12, marginBottom: 18 }}>
              {metrics.map((metric) => (
                <div key={metric.label} style={{ border: `1px solid ${COLORS.border}`, borderRadius: 14, padding: "14px 12px", background: "#FCFEFD" }}>
                  <p style={{ fontSize: 10, color: COLORS.muted, fontWeight: 700, fontFamily: "Inter, sans-serif", marginBottom: 7 }}>{metric.label}</p>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                    <span style={{ fontSize: 21, fontWeight: 850, color: COLORS.primary, fontFamily: "Geist, Inter, sans-serif", letterSpacing: "-0.04em" }}>{metric.value}</span>
                    <span style={{ fontSize: 10, fontWeight: 800, color: COLORS.accent, fontFamily: "Inter, sans-serif" }}>{metric.delta}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="hero-dashboard-bottom" style={{ display: "grid", gridTemplateColumns: "1.35fr .9fr", gap: 14 }}>
              <div style={{ border: `1px solid ${COLORS.border}`, borderRadius: 16, padding: 18, background: "#FCFEFD", minHeight: 130 }}>
                <p style={{ fontSize: 11, fontWeight: 800, color: COLORS.primary, fontFamily: "Inter, sans-serif", marginBottom: 14 }}>Patient throughput (30 days)</p>
                <svg viewBox="0 0 280 92" width="100%" height="92" fill="none">
                  <path d="M0 70 C30 30 55 42 82 58 C112 78 131 13 162 28 C198 44 198 92 232 72 C251 60 260 36 280 22" stroke={COLORS.accent} strokeWidth="3" strokeLinecap="round" />
                  <path d="M0 70 C30 30 55 42 82 58 C112 78 131 13 162 28 C198 44 198 92 232 72 C251 60 260 36 280 22 V92 H0 Z" fill="url(#heroChart)" opacity=".12" />
                  <defs>
                    <linearGradient id="heroChart" x1="0" y1="0" x2="0" y2="1">
                      <stop stopColor={COLORS.accent} />
                      <stop offset="1" stopColor={COLORS.accent} stopOpacity="0" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>

              <div style={{ border: `1px solid ${COLORS.border}`, borderRadius: 16, padding: 16, background: "#FCFEFD" }}>
                <p style={{ fontSize: 11, fontWeight: 800, color: COLORS.primary, fontFamily: "Inter, sans-serif", marginBottom: 14 }}>Today&apos;s schedule</p>
                {[
                  ["Maya Hernandez", "Cardiology consult"],
                  ["Daniel Park", "Follow-up diabetes"],
                ].map(([name, note]) => (
                  <div key={name} style={{ padding: "10px 0", borderTop: `1px solid ${COLORS.border}` }}>
                    <p style={{ fontSize: 11, fontWeight: 800, color: COLORS.primary, fontFamily: "Inter, sans-serif" }}>{name}</p>
                    <p style={{ fontSize: 10, color: COLORS.muted, fontFamily: "Inter, sans-serif", marginTop: 3 }}>{note}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="hero-ai-card" style={{
              position: "absolute", top: 74, right: 22, maxWidth: 210,
              borderRadius: 18, padding: 14,
              background: `linear-gradient(145deg, ${COLORS.primary}, #073d38)`,
              boxShadow: "0 20px 44px rgba(15,23,42,0.22)",
              color: COLORS.white,
            }}>
              <p style={{ color: COLORS.accent, fontSize: 10, fontWeight: 900, letterSpacing: "0.08em", fontFamily: "Inter, sans-serif", marginBottom: 8 }}>AI DIAGNOSIS INSIGHT</p>
              <p style={{ fontSize: 12, lineHeight: 1.5, fontWeight: 650, fontFamily: "Inter, sans-serif", marginBottom: 12 }}>
                Patient risk trend is improving. Recommend a follow-up this week.
              </p>
              <div style={{ display: "flex", gap: 8 }}>
                <span style={{ background: COLORS.accent, color: COLORS.primary, borderRadius: 8, padding: "6px 12px", fontSize: 10, fontWeight: 900, fontFamily: "Inter, sans-serif" }}>Apply</span>
                <span style={{ border: "1px solid rgba(255,255,255,0.25)", borderRadius: 8, padding: "6px 12px", fontSize: 10, fontWeight: 800, fontFamily: "Inter, sans-serif" }}>Review</span>
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

// ─── Module card ──────────────────────────────────────────────────────────────
function ModuleCard({ icon, name, desc }: { icon: string; name: string; desc: string }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: COLORS.white, borderRadius: 20, padding: "28px 24px",
        border: `1px solid ${hovered ? COLORS.accent + "60" : COLORS.border}`,
        boxShadow: hovered ? `0 20px 60px rgba(20,184,166,0.12), 0 4px 16px rgba(15,23,42,0.06)` : "0 2px 12px rgba(15,23,42,0.04)",
        transform: hovered ? "translateY(-4px)" : "translateY(0)",
        transition: "all 0.25s cubic-bezier(0.4,0,0.2,1)",
        cursor: "pointer",
      }}
    >
      <div style={{
        width: 48, height: 48, borderRadius: 14,
        background: hovered ? `linear-gradient(135deg, ${COLORS.accent}20, ${COLORS.accent2}20)` : COLORS.light,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 22, marginBottom: 16,
        border: `1px solid ${hovered ? COLORS.accent + "40" : COLORS.border}`,
        transition: "all 0.25s",
      }}>{icon}</div>
      <div style={{ fontSize: 15, fontWeight: 700, color: COLORS.primary, marginBottom: 6, fontFamily: "Geist, Inter, sans-serif", letterSpacing: "-0.01em" }}>{name}</div>
      <div style={{ fontSize: 13, color: COLORS.muted, lineHeight: 1.6, fontFamily: "Inter, sans-serif" }}>{desc}</div>
    </div>
  );
}

// ─── Role card ────────────────────────────────────────────────────────────────
function RoleCard({ icon, role, desc, actions }: { icon: string; role: string; desc: string; actions: string[] }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: COLORS.white, borderRadius: 20, padding: "28px 24px",
        border: `1px solid ${hovered ? COLORS.accent + "50" : COLORS.border}`,
        boxShadow: hovered ? "0 16px 48px rgba(20,184,166,0.1)" : "0 2px 8px rgba(15,23,42,0.04)",
        transform: hovered ? "translateY(-3px)" : "none",
        transition: "all 0.25s ease",
      }}
    >
      <div style={{ fontSize: 36, marginBottom: 16 }}>{icon}</div>
      <div style={{ fontSize: 16, fontWeight: 700, color: COLORS.primary, marginBottom: 6, fontFamily: "Geist, Inter, sans-serif" }}>{role}</div>
      <div style={{ fontSize: 13, color: COLORS.muted, marginBottom: 16, fontFamily: "Inter, sans-serif", lineHeight: 1.6 }}>{desc}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {actions.map(a => (
          <div key={a} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: COLORS.primary, fontFamily: "Inter, sans-serif" }}>
            <div style={{ width: 5, height: 5, borderRadius: "50%", background: COLORS.accent, flexShrink: 0 }} />
            {a}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Testimonial card ─────────────────────────────────────────────────────────
function TestimonialCard({ quote, name, title, initials, color }: { quote: string; name: string; title: string; initials: string; color: string }) {
  return (
    <div style={{
      background: COLORS.white, borderRadius: 20, padding: 32,
      border: `1px solid ${COLORS.border}`,
      boxShadow: "0 4px 24px rgba(15,23,42,0.05)",
    }}>
      <div style={{ fontSize: 32, color: COLORS.accent, marginBottom: 16, lineHeight: 1 }}>&quot;</div>
      <p style={{ fontSize: 15, color: COLORS.primary, lineHeight: 1.7, fontFamily: "Inter, sans-serif", marginBottom: 24, fontStyle: "italic" }}>{quote}</p>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{
          width: 44, height: 44, borderRadius: "50%", background: `${color}20`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 13, fontWeight: 700, color, fontFamily: "Inter, sans-serif",
        }}>{initials}</div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.primary, fontFamily: "Geist, Inter, sans-serif" }}>{name}</div>
          <div style={{ fontSize: 12, color: COLORS.muted, fontFamily: "Inter, sans-serif" }}>{title}</div>
        </div>
      </div>
    </div>
  );
}

// ─── Pricing card ─────────────────────────────────────────────────────────────
function PricingCard({ plan, price, desc, features, highlight }: {
  plan: string; price: string; desc: string; features: string[]; highlight?: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        borderRadius: 24, padding: "36px 32px",
        background: highlight
          ? `linear-gradient(145deg, ${COLORS.primary} 0%, #0f2744 100%)`
          : COLORS.white,
        border: highlight
          ? `1px solid ${COLORS.accent}60`
          : `1px solid ${hovered ? COLORS.accent + "50" : COLORS.border}`,
        boxShadow: highlight
          ? `0 32px 80px rgba(20,184,166,0.2), 0 8px 32px rgba(15,23,42,0.15)`
          : hovered ? "0 16px 48px rgba(15,23,42,0.08)" : "0 2px 12px rgba(15,23,42,0.04)",
        transform: highlight ? "scale(1.04)" : hovered ? "translateY(-4px)" : "none",
        transition: "all 0.25s ease",
        position: "relative", overflow: "hidden",
      }}
    >
      {highlight && (
        <div style={{
          position: "absolute", top: 20, right: 24,
          background: `${COLORS.accent}25`, border: `1px solid ${COLORS.accent}50`,
          color: COLORS.accent, fontSize: 10, fontWeight: 700,
          padding: "3px 10px", borderRadius: 999, fontFamily: "Inter, sans-serif",
          letterSpacing: "0.08em",
        }}>MOST POPULAR</div>
      )}
      <div style={{ fontSize: 13, fontWeight: 700, color: highlight ? COLORS.accent : COLORS.muted, marginBottom: 8, fontFamily: "Inter, sans-serif", letterSpacing: "0.08em", textTransform: "uppercase" }}>{plan}</div>
      <div style={{ fontSize: 42, fontWeight: 800, color: highlight ? COLORS.white : COLORS.primary, fontFamily: "Geist, Inter, sans-serif", letterSpacing: "-0.03em", marginBottom: 4 }}>{price}</div>
      <div style={{ fontSize: 13, color: highlight ? "rgba(255,255,255,0.5)" : COLORS.muted, marginBottom: 28, fontFamily: "Inter, sans-serif" }}>{desc}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 32 }}>
        {features.map(f => (
          <div key={f} style={{ display: "flex", alignItems: "flex-start", gap: 10, fontSize: 13, color: highlight ? "rgba(255,255,255,0.8)" : COLORS.primary, fontFamily: "Inter, sans-serif" }}>
            <span style={{ color: COLORS.accent, fontSize: 14, flexShrink: 0 }}>✓</span>
            {f}
          </div>
        ))}
      </div>
      <button style={{
        width: "100%", padding: "14px 0", borderRadius: 14,
        background: highlight ? `linear-gradient(135deg, ${COLORS.accent}, ${COLORS.accent2})` : "transparent",
        border: highlight ? "none" : `1.5px solid ${COLORS.border}`,
        color: highlight ? COLORS.white : COLORS.primary,
        fontSize: 14, fontWeight: 700, cursor: "pointer",
        fontFamily: "Inter, sans-serif", letterSpacing: "-0.01em",
        transition: "all 0.2s",
        boxShadow: highlight ? `0 8px 24px ${COLORS.accent}40` : "none",
      }}>
        {highlight ? "Start Free Trial" : "Get Started"}
      </button>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function ClinicosLanding() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const modules = [
    { icon: "👤", name: "Patient Management", desc: "Unified patient profiles with full clinical history, demographics, and care timeline." },
    { icon: "📅", name: "Smart Appointments", desc: "AI-powered scheduling that reduces no-shows and optimizes provider availability." },
    { icon: "📋", name: "Electronic Medical Records", desc: "Structured EMR with SOAP notes, templates, and voice-to-text dictation." },
    { icon: "💊", name: "Prescription Engine", desc: "Digital prescriptions with drug-interaction checks and pharmacy integration." },
    { icon: "🔬", name: "Laboratory Module", desc: "Order, track, and receive lab results with auto-alerts for critical values." },
    { icon: "🏪", name: "Pharmacy & Dispensing", desc: "In-clinic pharmacy management with inventory and expiry tracking." },
    { icon: "💰", name: "Billing & Claims", desc: "Automated insurance claims, co-pay collection, and denial management." },
    { icon: "📊", name: "Finance & Accounting", desc: "Revenue cycle management with P&L dashboards and expense tracking." },
    { icon: "👥", name: "HR & Payroll", desc: "Staff scheduling, attendance, payroll, and performance management." },
    { icon: "📦", name: "Inventory Control", desc: "Real-time medical supply tracking with auto-reorder and vendor management." },
    { icon: "📈", name: "Advanced Analytics", desc: "Drill-down reports on every KPI — from patient retention to staff productivity." },
    { icon: "🤖", name: "AI Copilot", desc: "Context-aware AI that assists with diagnosis, documentation, and decision-making." },
  ];

  const roles = [
    { icon: "🏥", role: "Clinic Owner", desc: "Full operational visibility with financial dashboards and growth analytics.", actions: ["Revenue & P&L Overview", "Staff Performance Metrics", "Multi-branch Management", "Strategic AI Insights"] },
    { icon: "👨‍⚕️", role: "Doctor", desc: "Clinical workspace with AI-assisted documentation and patient history.", actions: ["Smart EMR & SOAP Notes", "AI Prescription Generation", "Lab Result Alerts", "Patient Timeline View"] },
    { icon: "🗂️", role: "Receptionist", desc: "Front-desk tools for seamless patient intake and appointment management.", actions: ["One-click Check-in", "Queue Management", "Insurance Verification", "Patient Communication"] },
    { icon: "📋", role: "Finance Manager", desc: "Complete billing oversight with claims tracking and revenue analytics.", actions: ["Insurance Claims Portal", "Aging Receivables", "Payment Reconciliation", "Financial Reports"] },
    { icon: "🧪", role: "Lab Technician", desc: "Efficient lab order management with digital result delivery and alerts.", actions: ["Receive Lab Orders", "Enter & Validate Results", "Critical Value Alerts", "Sample Tracking"] },
    { icon: "🙋", role: "Patient Portal", desc: "Self-service portal for appointments, prescriptions, and health records.", actions: ["Book Appointments Online", "View Prescriptions", "Download Reports", "Secure Messaging"] },
  ];

  const testimonials = [
    { quote: "Clinicos replaced five different systems for us. Our billing cycle dropped from 30 days to 4 days, and our doctors actually enjoy using it. This is what healthcare software should feel like.", name: "Dr. Ananya Krishnan", title: "Director, Apollo Wellness Clinics (12 locations)", initials: "AK", color: COLORS.accent },
    { quote: "The AI Copilot is genuinely transformative. It catches drug interactions I might have missed and helps me write discharge summaries in seconds. My patient throughput is up 35%.", name: "Dr. Rajiv Menon", title: "Senior Physician, Fortis Multispecialty", initials: "RM", color: COLORS.accent2 },
    { quote: "We evaluated seven platforms. Clinicos was the only one that felt built for how clinics actually work — not how software engineers imagine they work. The onboarding was remarkably smooth.", name: "Priya Nair", title: "CEO, MedTree Hospital Group", initials: "PN", color: "#8B5CF6" },
  ];

  const navLinks = ["Platform", "Solutions", "Pricing", "Resources"];

  return (
    <div style={{ background: COLORS.bg, minHeight: "100vh", fontFamily: "Inter, sans-serif", overflowX: "hidden" }}>
      {/* ─── GLOBAL FONT IMPORT ──────────────────────────────────────────────── */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        html { scroll-behavior: smooth; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: ${COLORS.bg}; }
        ::-webkit-scrollbar-thumb { background: ${COLORS.border}; border-radius: 3px; }
        @keyframes float { 0%,100% { transform: translateY(0px); } 50% { transform: translateY(-10px); } }
        @keyframes pulse-glow { 0%,100% { box-shadow: 0 0 20px ${COLORS.accent}40; } 50% { box-shadow: 0 0 40px ${COLORS.accent}70; } }
        @keyframes spin-slow { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes fadeSlideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
        .float-1 { animation: float 4s ease-in-out infinite; }
        .float-2 { animation: float 5s ease-in-out infinite 0.8s; }
        .float-3 { animation: float 3.5s ease-in-out infinite 1.5s; }
        .pulse-glow { animation: pulse-glow 2.5s ease-in-out infinite; }
        .hero-text { animation: fadeSlideUp 0.9s ease both; }
        .hero-text-2 { animation: fadeSlideUp 0.9s ease 0.15s both; }
        .hero-text-3 { animation: fadeSlideUp 0.9s ease 0.3s both; }
        .hero-text-4 { animation: fadeSlideUp 0.9s ease 0.45s both; }
        .hero-text-5 { animation: fadeSlideUp 0.9s ease 0.6s both; }
        .hero-preview { animation: fadeSlideUp 1s ease 0.72s both; }
        @media (max-width: 760px) {
          .landing-nav-links { display: none !important; }
          .hero-dashboard-shell { grid-template-columns: 1fr !important; }
          .hero-sidebar { display: none !important; }
          .hero-metrics { grid-template-columns: 1fr !important; }
          .hero-dashboard-bottom { grid-template-columns: 1fr !important; }
          .hero-ai-card { position: static !important; margin-top: 14px; max-width: none !important; }
        }
      `}</style>

      {/* ─── NAVIGATION ──────────────────────────────────────────────────────── */}
      <nav style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 1000,
        background: scrolled ? "rgba(248,250,252,0.85)" : "transparent",
        backdropFilter: scrolled ? "blur(20px)" : "none",
        borderBottom: scrolled ? `1px solid ${COLORS.border}` : "none",
        transition: "all 0.35s ease",
      }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px", height: 68, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          {/* Logo */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 34, height: 34, borderRadius: 10,
              background: `linear-gradient(135deg, ${COLORS.accent}, ${COLORS.accent2})`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 16, boxShadow: `0 4px 14px ${COLORS.accent}40`,
            }}>✚</div>
            <span style={{ fontSize: 18, fontWeight: 800, color: COLORS.primary, fontFamily: "Geist, Inter, sans-serif", letterSpacing: "-0.03em" }}>Clinicos</span>
          </div>

          {/* Desktop links */}
          <div className="landing-nav-links" style={{ display: "flex", alignItems: "center", gap: 36 }}>
            {navLinks.map(l => (
              <a key={l} href="#" style={{ fontSize: 14, fontWeight: 500, color: COLORS.muted, textDecoration: "none", transition: "color 0.2s", fontFamily: "Inter, sans-serif" }}
                onMouseEnter={e => (e.currentTarget.style.color = COLORS.primary)}
                onMouseLeave={e => (e.currentTarget.style.color = COLORS.muted)}
              >{l}</a>
            ))}
          </div>

          {/* CTA */}
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Link href="/login" style={{ fontSize: 14, fontWeight: 600, color: COLORS.primary, textDecoration: "none", fontFamily: "Inter, sans-serif" }}>Login</Link>
            <Link href="/signup" style={{
              padding: "9px 20px", borderRadius: 12,
              background: `linear-gradient(135deg, ${COLORS.accent}, ${COLORS.accent2})`,
              border: "none", color: COLORS.white, fontSize: 14, fontWeight: 700,
              cursor: "pointer", fontFamily: "Inter, sans-serif", letterSpacing: "-0.01em",
              boxShadow: `0 4px 16px ${COLORS.accent}40`,
              transition: "all 0.2s", textDecoration: "none",
            }}
              onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = `0 8px 24px ${COLORS.accent}50`; }}
              onMouseLeave={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = `0 4px 16px ${COLORS.accent}40`; }}
            >Book Demo →</Link>
          </div>
        </div>
      </nav>

      {/* ─── HERO ────────────────────────────────────────────────────────────── */}
      <div style={{
        minHeight: "100vh", position: "relative", overflow: "hidden",
        background: `radial-gradient(ellipse 70% 45% at 50% 3%, ${COLORS.accent}16 0%, transparent 65%),
                     linear-gradient(180deg, #F8FBFA 0%, #F3F8F6 52%, #EEF6F3 100%)`,
        display: "flex", flexDirection: "column",
      }}>
        {/* Background decorative circles */}
        <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
          <div style={{ position: "absolute", top: "18%", right: "8%", width: 460, height: 460, borderRadius: "50%", background: `radial-gradient(circle, ${COLORS.accent}10 0%, transparent 70%)`, }} />
          <div style={{ position: "absolute", bottom: "10%", left: "4%", width: 380, height: 380, borderRadius: "50%", background: `radial-gradient(circle, ${COLORS.accent2}10 0%, transparent 70%)`, }} />
          {/* Grid lines */}
          <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.18 }} xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="grid" width="48" height="48" patternUnits="userSpaceOnUse">
                <path d="M 48 0 L 0 0 0 48" fill="none" stroke={COLORS.border} strokeWidth="0.8" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>

        <div style={{ width: "100%", maxWidth: 1180, margin: "0 auto", padding: "120px 24px 64px", position: "relative", textAlign: "center" }}>
          <div className="hero-text" style={{ marginBottom: 18 }}>
            <Badge>INTRODUCING HEALTH COPILOT 2.0 - BUILT FOR CLINICS</Badge>
          </div>

          <h1 className="hero-text-2" style={{
            maxWidth: 850, margin: "0 auto 18px",
            fontSize: "clamp(42px, 6.6vw, 78px)", fontWeight: 720, color: COLORS.primary,
            fontFamily: "Geist, Inter, sans-serif", letterSpacing: "-0.045em", lineHeight: 0.98,
          }}>
            The intelligent <span style={{ fontFamily: "Georgia, serif", fontWeight: 500, fontStyle: "italic", letterSpacing: "-0.05em" }}>operating system</span> for modern healthcare.
          </h1>

          <p className="hero-text-3" style={{
            fontSize: "clamp(15px, 2vw, 18px)", color: COLORS.muted, lineHeight: 1.75, margin: "0 auto 28px",
            fontFamily: "Inter, sans-serif", maxWidth: 650,
          }}>
            One calm workspace to manage appointments, records, diagnostics, billing, and growth, orchestrated by clinical-grade AI.
          </p>

          <div className="hero-text-4" style={{ display: "flex", justifyContent: "center", gap: 14, flexWrap: "wrap", marginBottom: 48 }}>
            <Link href="/signup" style={{
              padding: "14px 24px", borderRadius: 12,
              background: COLORS.primary, color: COLORS.white, fontSize: 14, fontWeight: 800,
              cursor: "pointer", fontFamily: "Inter, sans-serif", textDecoration: "none",
              boxShadow: "0 12px 28px rgba(15,23,42,0.18)",
              transition: "all 0.2s",
            }}
              onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 18px 34px rgba(15,23,42,0.22)"; }}
              onMouseLeave={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "0 12px 28px rgba(15,23,42,0.18)"; }}
            >Start free trial →</Link>
            <a href="#platform" style={{
              padding: "14px 20px", borderRadius: 12,
              background: "rgba(255,255,255,0.55)", border: `1px solid ${COLORS.border}`,
              color: COLORS.primary, fontSize: 14, fontWeight: 800,
              cursor: "pointer", fontFamily: "Inter, sans-serif", textDecoration: "none",
              transition: "all 0.2s",
            }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = COLORS.accent; e.currentTarget.style.background = COLORS.white; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = COLORS.border; e.currentTarget.style.background = "rgba(255,255,255,0.55)"; }}
            >Watch 2 min product tour</a>
          </div>

          <HeroDashboard />
        </div>
      </div>

      {/* ─── SOCIAL PROOF ────────────────────────────────────────────────────── */}
      <Section>
        <div style={{ background: COLORS.white, borderTop: `1px solid ${COLORS.border}`, borderBottom: `1px solid ${COLORS.border}`, padding: "48px 24px" }}>
          <div style={{ maxWidth: 1200, margin: "0 auto" }}>
            <div style={{ textAlign: "center", marginBottom: 40 }}>
              <p style={{ fontSize: 13, color: COLORS.muted, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "Inter, sans-serif" }}>Trusted by leading healthcare organizations</p>
            </div>
            {/* Stats */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 0, marginBottom: 48, borderRadius: 20, border: `1px solid ${COLORS.border}`, overflow: "hidden" }}>
              {[
                { val: "10,000+", label: "Clinics Active" },
                { val: "25M+", label: "Patients Managed" },
                { val: "99.9%", label: "Uptime SLA" },
                { val: "4.9/5", label: "User Rating" },
                { val: "180+", label: "Countries" },
              ].map((s, i) => (
                <div key={s.label} style={{
                  textAlign: "center", padding: "32px 24px",
                  borderRight: i < 4 ? `1px solid ${COLORS.border}` : "none",
                }}>
                  <div style={{ fontSize: 32, fontWeight: 800, color: COLORS.primary, fontFamily: "Geist, Inter, sans-serif", letterSpacing: "-0.03em", marginBottom: 6 }}>{s.val}</div>
                  <div style={{ fontSize: 12, color: COLORS.muted, fontFamily: "Inter, sans-serif", fontWeight: 500 }}>{s.label}</div>
                </div>
              ))}
            </div>
            {/* Logo row */}
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 48, flexWrap: "wrap" }}>
              {["Apollo Health", "Fortis Group", "MedTree", "CitiCare", "HealthFirst", "NovaMed"].map(org => (
                <div key={org} style={{ fontSize: 14, fontWeight: 700, color: "#CBD5E1", letterSpacing: "-0.02em", fontFamily: "Geist, Inter, sans-serif" }}>{org}</div>
              ))}
            </div>
          </div>
        </div>
      </Section>

      {/* ─── PLATFORM MODULES ────────────────────────────────────────────────── */}
      <Section style={{ padding: "100px 24px" }}>
        <div id="platform" style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 64 }}>
            <Badge>Platform</Badge>
            <h2 style={{ fontSize: "clamp(28px, 4vw, 48px)", fontWeight: 800, color: COLORS.primary, fontFamily: "Geist, Inter, sans-serif", letterSpacing: "-0.04em", marginTop: 16, marginBottom: 16 }}>
              Everything your clinic needs,<br />perfectly integrated
            </h2>
            <p style={{ fontSize: 16, color: COLORS.muted, maxWidth: 520, margin: "0 auto", fontFamily: "Inter, sans-serif", lineHeight: 1.7 }}>
              12 deeply connected modules built from the ground up to work as one — not bolted together from acquisitions.
            </p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 16 }}>
            {modules.map(m => <ModuleCard key={m.name} {...m} />)}
          </div>
        </div>
      </Section>

      {/* ─── AI COPILOT SHOWCASE ─────────────────────────────────────────────── */}
      <Section>
        <div style={{
          background: `linear-gradient(160deg, ${COLORS.primary} 0%, #0a1628 40%, #051222 100%)`,
          padding: "100px 24px", position: "relative", overflow: "hidden",
        }}>
          {/* Glow circles */}
          <div style={{ position: "absolute", top: "20%", left: "15%", width: 400, height: 400, borderRadius: "50%", background: `radial-gradient(circle, ${COLORS.accent}15 0%, transparent 70%)`, pointerEvents: "none" }} />
          <div style={{ position: "absolute", bottom: "10%", right: "10%", width: 300, height: 300, borderRadius: "50%", background: `radial-gradient(circle, ${COLORS.accent2}12 0%, transparent 70%)`, pointerEvents: "none" }} />

          <div style={{ maxWidth: 1200, margin: "0 auto", position: "relative" }}>
            <div style={{ display: "flex", gap: 80, alignItems: "center", flexWrap: "wrap" }}>
              {/* Left: copy */}
              <div style={{ flex: 1, minWidth: 300 }}>
                <Badge color={COLORS.accent}>AI Copilot</Badge>
                <h2 style={{ fontSize: "clamp(28px, 4vw, 48px)", fontWeight: 800, color: COLORS.white, fontFamily: "Geist, Inter, sans-serif", letterSpacing: "-0.04em", marginTop: 16, marginBottom: 20, lineHeight: 1.1 }}>
                  Meet Clinicos AI.<br />
                  <span style={{ color: COLORS.accent }}>Your smartest</span><br />
                  team member.
                </h2>
                <p style={{ fontSize: 16, color: "rgba(255,255,255,0.6)", lineHeight: 1.7, marginBottom: 36, fontFamily: "Inter, sans-serif" }}>
                  Clinicos AI is context-aware and clinic-specific. It reads patient history, understands clinical workflows, and acts — not just advises.
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  {[
                    { icon: "📝", cap: "Generate Prescriptions", desc: "Drafts prescriptions based on diagnosis, allergies, and drug history in seconds." },
                    { icon: "📖", cap: "Summarize Patient History", desc: "Surfaces the most clinically relevant context before each consultation." },
                    { icon: "🔮", cap: "Predict Follow-ups", desc: "Flags patients likely to need follow-up before they fall through the cracks." },
                    { icon: "💡", cap: "Revenue Intelligence", desc: "Identifies unbilled services, pricing anomalies, and growth opportunities." },
                  ].map(f => (
                    <div key={f.cap} style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
                      <div style={{ width: 40, height: 40, borderRadius: 12, background: `${COLORS.accent}18`, border: `1px solid ${COLORS.accent}30`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>{f.icon}</div>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.white, fontFamily: "Geist, Inter, sans-serif", marginBottom: 3 }}>{f.cap}</div>
                        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", fontFamily: "Inter, sans-serif", lineHeight: 1.5 }}>{f.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right: AI panel */}
              <div style={{ flex: 1, minWidth: 300, maxWidth: 480 }}>
                <div className="pulse-glow" style={{
                  background: "rgba(255,255,255,0.04)", backdropFilter: "blur(20px)",
                  border: `1px solid ${COLORS.accent}30`, borderRadius: 24, overflow: "hidden",
                  boxShadow: `0 0 60px ${COLORS.accent}15`,
                }}>
                  {/* Header */}
                  <div style={{ padding: "18px 24px", borderBottom: `1px solid ${COLORS.accent}20`, display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 10, height: 10, borderRadius: "50%", background: COLORS.accent, boxShadow: `0 0 10px ${COLORS.accent}` }} />
                    <span style={{ fontSize: 13, fontWeight: 700, color: COLORS.accent, fontFamily: "Inter, sans-serif", letterSpacing: "0.06em" }}>CLINICOS AI — ACTIVE</span>
                  </div>
                  {/* Conversation */}
                  <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16, minHeight: 320 }}>
                    <div style={{ background: "rgba(255,255,255,0.07)", borderRadius: 14, padding: "14px 16px" }}>
                      <div style={{ fontSize: 11, color: COLORS.accent, fontWeight: 700, marginBottom: 6, fontFamily: "Inter, sans-serif" }}>DR. RAJIV</div>
                      <div style={{ fontSize: 13, color: "rgba(255,255,255,0.8)", fontFamily: "Inter, sans-serif", lineHeight: 1.6 }}>Summarize Sarah Mitchell&apos;s last 3 visits and suggest next steps.</div>
                    </div>
                    <div style={{
                      background: `linear-gradient(135deg, ${COLORS.accent}18, ${COLORS.accent2}12)`,
                      border: `1px solid ${COLORS.accent}25`,
                      borderRadius: 14, padding: "14px 16px",
                    }}>
                      <div style={{ fontSize: 11, color: COLORS.accent2, fontWeight: 700, marginBottom: 8, fontFamily: "Inter, sans-serif" }}>CLINICOS AI</div>
                      <div style={{ fontSize: 13, color: "rgba(255,255,255,0.85)", fontFamily: "Inter, sans-serif", lineHeight: 1.7 }}>
                        <strong style={{ color: COLORS.white }}>Sarah Mitchell, 38F</strong> — 3 visits in 90 days. Recurring complaint: fatigue and elevated fasting glucose (6.8 mmol/L on last draw).<br /><br />
                        <span style={{ color: COLORS.accent }}>Recommended:</span> HbA1c test, dietary referral, and a 2-week follow-up. Possible pre-diabetic onset.
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      {["Generate Prescription", "Book Follow-up", "View Full History", "Refer Specialist"].map(a => (
                        <button key={a} style={{
                          fontSize: 11, color: COLORS.accent, background: `${COLORS.accent}15`,
                          border: `1px solid ${COLORS.accent}30`, borderRadius: 8,
                          padding: "6px 12px", cursor: "pointer", fontFamily: "Inter, sans-serif", fontWeight: 600,
                        }}>{a}</button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Section>

      {/* ─── ANALYTICS ───────────────────────────────────────────────────────── */}
      <Section style={{ padding: "100px 24px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 64 }}>
            <Badge>Analytics</Badge>
            <h2 style={{ fontSize: "clamp(28px, 4vw, 48px)", fontWeight: 800, color: COLORS.primary, fontFamily: "Geist, Inter, sans-serif", letterSpacing: "-0.04em", marginTop: 16, marginBottom: 16 }}>
              Clarity on every metric<br />that drives your clinic
            </h2>
            <p style={{ fontSize: 16, color: COLORS.muted, maxWidth: 460, margin: "0 auto", fontFamily: "Inter, sans-serif", lineHeight: 1.7 }}>
              Real-time dashboards, AI-generated insights, and drill-down reports built for healthcare operators.
            </p>
          </div>

          <div style={{ background: COLORS.white, borderRadius: 24, border: `1px solid ${COLORS.border}`, overflow: "hidden", boxShadow: "0 8px 48px rgba(15,23,42,0.08)" }}>
            {/* Dashboard header */}
            <div style={{ padding: "20px 28px", borderBottom: `1px solid ${COLORS.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", gap: 6 }}>
                {["#FF5F57","#FEBC2E","#28C840"].map(c => <div key={c} style={{ width: 12, height: 12, borderRadius: "50%", background: c }} />)}
              </div>
              <span style={{ fontSize: 12, color: COLORS.muted, fontFamily: "Inter, sans-serif" }}>Clinicos Analytics — June 2025</span>
              <div style={{ display: "flex", gap: 8 }}>
                {["1W","1M","3M","YTD"].map((p, i) => (
                  <div key={p} style={{
                    fontSize: 11, fontWeight: 600, fontFamily: "Inter, sans-serif",
                    color: i === 1 ? COLORS.white : COLORS.muted,
                    background: i === 1 ? COLORS.accent : "transparent",
                    padding: "3px 10px", borderRadius: 6, cursor: "pointer",
                  }}>{p}</div>
                ))}
              </div>
            </div>

            <div style={{ padding: 28 }}>
              {/* Top KPIs */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 16, marginBottom: 28 }}>
                {[
                  { label: "Total Revenue", value: "₹4.2M", delta: "+22%", spark: COLORS.accent },
                  { label: "New Patients", value: "847", delta: "+15%", spark: COLORS.accent2 },
                  { label: "Avg Wait Time", value: "8 min", delta: "-34%", spark: "#22C55E" },
                  { label: "Bed Occupancy", value: "78%", delta: "+6%", spark: "#8B5CF6" },
                ].map(k => (
                  <div key={k.label} style={{ background: COLORS.light, borderRadius: 16, padding: "18px 20px", border: `1px solid ${COLORS.border}` }}>
                    <div style={{ fontSize: 11, color: COLORS.muted, fontWeight: 600, fontFamily: "Inter, sans-serif", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>{k.label}</div>
                    <div style={{ fontSize: 26, fontWeight: 800, color: COLORS.primary, fontFamily: "Geist, Inter, sans-serif", letterSpacing: "-0.03em", marginBottom: 6 }}>{k.value}</div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <span style={{ fontSize: 11, color: k.spark, fontWeight: 700, fontFamily: "Inter, sans-serif" }}>{k.delta}</span>
                      <Sparkline color={k.spark} />
                    </div>
                  </div>
                ))}
              </div>

              {/* Chart area */}
              <div style={{ background: COLORS.light, borderRadius: 18, padding: "24px 24px 16px", border: `1px solid ${COLORS.border}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.primary, fontFamily: "Geist, Inter, sans-serif" }}>Revenue vs Patient Volume</div>
                    <div style={{ fontSize: 12, color: COLORS.muted, fontFamily: "Inter, sans-serif" }}>January — June 2025</div>
                  </div>
                  <div style={{ display: "flex", gap: 16 }}>
                    {[{ color: COLORS.accent, label: "Revenue" }, { color: COLORS.accent2, label: "Patients" }].map(l => (
                      <div key={l.label} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: COLORS.muted, fontFamily: "Inter, sans-serif" }}>
                        <div style={{ width: 10, height: 10, borderRadius: 3, background: l.color }} />{l.label}
                      </div>
                    ))}
                  </div>
                </div>
                {/* SVG bar + line chart */}
                <svg width="100%" height="180" viewBox="0 0 700 180" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="bar-grad" x1="0" y1="0" x2="0" y2="1">
                      <stop stopColor={COLORS.accent} stopOpacity="0.2" />
                      <stop offset="1" stopColor={COLORS.accent} stopOpacity="0.02" />
                    </linearGradient>
                    <linearGradient id="line-grad" x1="0" y1="0" x2="0" y2="1">
                      <stop stopColor={COLORS.accent2} stopOpacity="0.3" />
                      <stop offset="1" stopColor={COLORS.accent2} stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  {/* Grid lines */}
                  {[0, 45, 90, 135].map(y => (
                    <line key={y} x1="0" y1={y} x2="700" y2={y} stroke={COLORS.border} strokeWidth="1" />
                  ))}
                  {/* Bars */}
                  {[55, 72, 61, 83, 76, 95].map((h, i) => {
                    const x = i * 117 + 20; const bh = h * 1.4;
                    return <rect key={i} x={x} y={180 - bh} width={60} height={bh} rx={8} fill={`url(#bar-grad)`} stroke={COLORS.accent} strokeWidth="1.5" strokeOpacity="0.5" />;
                  })}
                  {/* Line */}
                  {(() => {
                    const vals = [42, 60, 53, 70, 66, 82];
                    const coords = vals.map((v, i) => `${i * 117 + 50},${180 - v * 1.6}`).join(" ");
                    return <>
                      <polygon points={`20,180 ${coords} 610,180`} fill="url(#line-grad)" />
                      <polyline points={coords} stroke={COLORS.accent2} strokeWidth="2.5" fill="none" strokeLinejoin="round" strokeLinecap="round" />
                      {vals.map((v, i) => <circle key={i} cx={i * 117 + 50} cy={180 - v * 1.6} r={4} fill={COLORS.accent2} stroke={COLORS.white} strokeWidth="2" />)}
                    </>;
                  })()}
                  {/* X labels */}
                  {["Jan","Feb","Mar","Apr","May","Jun"].map((m, i) => (
                    <text key={m} x={i * 117 + 50} y="178" textAnchor="middle" fontSize="11" fill={COLORS.muted} fontFamily="Inter, sans-serif">{m}</text>
                  ))}
                </svg>
              </div>
            </div>
          </div>
        </div>
      </Section>

      {/* ─── MULTI-ROLE ──────────────────────────────────────────────────────── */}
      <Section style={{ padding: "100px 24px", background: COLORS.light }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 64 }}>
            <Badge>Multi-Role</Badge>
            <h2 style={{ fontSize: "clamp(28px, 4vw, 48px)", fontWeight: 800, color: COLORS.primary, fontFamily: "Geist, Inter, sans-serif", letterSpacing: "-0.04em", marginTop: 16, marginBottom: 16 }}>
              One platform. Every role,<br />perfectly served.
            </h2>
            <p style={{ fontSize: 16, color: COLORS.muted, maxWidth: 460, margin: "0 auto", fontFamily: "Inter, sans-serif", lineHeight: 1.7 }}>
              Role-specific workspaces mean every person on your team sees exactly what they need — nothing more, nothing less.
            </p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
            {roles.map(r => <RoleCard key={r.role} {...r} />)}
          </div>
        </div>
      </Section>

      {/* ─── SECURITY ────────────────────────────────────────────────────────── */}
      <Section style={{ padding: "100px 24px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ display: "flex", gap: 80, alignItems: "center", flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 300 }}>
              <Badge>Security & Compliance</Badge>
              <h2 style={{ fontSize: "clamp(28px, 4vw, 44px)", fontWeight: 800, color: COLORS.primary, fontFamily: "Geist, Inter, sans-serif", letterSpacing: "-0.04em", marginTop: 16, marginBottom: 20, lineHeight: 1.15 }}>
                Enterprise-grade security.<br />Zero compromise.
              </h2>
              <p style={{ fontSize: 16, color: COLORS.muted, fontFamily: "Inter, sans-serif", lineHeight: 1.7, marginBottom: 32 }}>
                Patient data is the most sensitive data on earth. We treat it accordingly — with end-to-end encryption, role-based access, and continuous compliance auditing.
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {[
                  "256-bit AES encryption at rest and in transit",
                  "Role-based access control with audit trails",
                  "Automated vulnerability scanning",
                  "Data residency options across 8 regions",
                  "Annual third-party penetration testing",
                ].map(f => (
                  <div key={f} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14, color: COLORS.primary, fontFamily: "Inter, sans-serif" }}>
                    <div style={{ width: 20, height: 20, borderRadius: "50%", background: `${COLORS.accent}15`, border: `1px solid ${COLORS.accent}40`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: COLORS.accent, flexShrink: 0 }}>✓</div>
                    {f}
                  </div>
                ))}
              </div>
            </div>
            <div style={{ flex: 1, minWidth: 280, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              {[
                { label: "HIPAA", sublabel: "Health Data Protection", icon: "🏥", color: "#14B8A6" },
                { label: "SOC 2", sublabel: "Type II Certified", icon: "✅", color: "#06B6D4" },
                { label: "GDPR", sublabel: "EU Data Compliance", icon: "🇪🇺", color: "#8B5CF6" },
                { label: "ISO 27001", sublabel: "InfoSec Management", icon: "🛡️", color: "#F59E0B" },
              ].map(c => (
                <div key={c.label} style={{
                  background: COLORS.white, borderRadius: 20, padding: "28px 24px",
                  border: `1px solid ${COLORS.border}`,
                  boxShadow: "0 4px 20px rgba(15,23,42,0.05)",
                  textAlign: "center",
                }}>
                  <div style={{ fontSize: 36, marginBottom: 12 }}>{c.icon}</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: COLORS.primary, fontFamily: "Geist, Inter, sans-serif", letterSpacing: "-0.02em", marginBottom: 4 }}>{c.label}</div>
                  <div style={{ fontSize: 11, color: COLORS.muted, fontFamily: "Inter, sans-serif" }}>{c.sublabel}</div>
                  <div style={{ marginTop: 12, fontSize: 10, color: c.color, fontWeight: 700, fontFamily: "Inter, sans-serif", background: `${c.color}10`, padding: "3px 10px", borderRadius: 999, display: "inline-block" }}>CERTIFIED</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Section>

      {/* ─── TESTIMONIALS ────────────────────────────────────────────────────── */}
      <Section style={{ padding: "100px 24px", background: COLORS.light }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 64 }}>
            <Badge>Testimonials</Badge>
            <h2 style={{ fontSize: "clamp(28px, 4vw, 48px)", fontWeight: 800, color: COLORS.primary, fontFamily: "Geist, Inter, sans-serif", letterSpacing: "-0.04em", marginTop: 16 }}>
              Trusted by the people<br />who make healthcare work
            </h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 20 }}>
            {testimonials.map(t => <TestimonialCard key={t.name} {...t} />)}
          </div>
        </div>
      </Section>

      {/* ─── PRICING ─────────────────────────────────────────────────────────── */}
      <Section style={{ padding: "100px 24px" }}>
        <div style={{ maxWidth: 1000, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 64 }}>
            <Badge>Pricing</Badge>
            <h2 style={{ fontSize: "clamp(28px, 4vw, 48px)", fontWeight: 800, color: COLORS.primary, fontFamily: "Geist, Inter, sans-serif", letterSpacing: "-0.04em", marginTop: 16, marginBottom: 16 }}>
              Simple, transparent pricing
            </h2>
            <p style={{ fontSize: 16, color: COLORS.muted, fontFamily: "Inter, sans-serif" }}>Start free. Scale as you grow. No hidden fees.</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 24, alignItems: "start" }}>
            <PricingCard
              plan="Starter"
              price="₹4,999"
              desc="/ month · Up to 3 providers"
              features={["Patient Management", "Appointments & Scheduling", "Basic EMR", "Billing & Invoicing", "Email Support"]}
            />
            <PricingCard
              plan="Professional"
              price="₹14,999"
              desc="/ month · Up to 15 providers"
              features={["Everything in Starter", "AI Copilot", "Laboratory Module", "Pharmacy Integration", "Advanced Analytics", "Priority 24/7 Support", "Custom Workflows"]}
              highlight
            />
            <PricingCard
              plan="Enterprise"
              price="Custom"
              desc="Unlimited providers · Multi-branch"
              features={["Everything in Professional", "Dedicated Success Manager", "White-label Options", "Custom Integrations & API", "On-premise Deployment", "SLA Guarantee"]}
            />
          </div>
        </div>
      </Section>

      {/* ─── FINAL CTA ───────────────────────────────────────────────────────── */}
      <Section>
        <div style={{
          margin: "0 24px 80px",
          background: `linear-gradient(145deg, ${COLORS.primary} 0%, #0f2744 100%)`,
          borderRadius: 32, padding: "80px 48px", textAlign: "center",
          position: "relative", overflow: "hidden",
          boxShadow: "0 40px 100px rgba(15,23,42,0.2)",
        }}>
          <div style={{ position: "absolute", top: "-20%", left: "30%", width: 500, height: 500, borderRadius: "50%", background: `radial-gradient(circle, ${COLORS.accent}15 0%, transparent 70%)`, pointerEvents: "none" }} />
          <div style={{ position: "relative" }}>
            <h2 style={{ fontSize: "clamp(28px, 4vw, 52px)", fontWeight: 900, color: COLORS.white, fontFamily: "Geist, Inter, sans-serif", letterSpacing: "-0.04em", marginBottom: 20, lineHeight: 1.1 }}>
              Transform your clinic<br />with <span style={{ color: COLORS.accent }}>Clinicos</span>
            </h2>
            <p style={{ fontSize: 18, color: "rgba(255,255,255,0.6)", fontFamily: "Inter, sans-serif", marginBottom: 40, maxWidth: 480, margin: "0 auto 40px" }}>
              Join 10,000+ healthcare organizations that run smarter, faster, and more profitably on Clinicos.
            </p>
            <div style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap" }}>
              <button style={{
                padding: "16px 36px", borderRadius: 16,
                background: `linear-gradient(135deg, ${COLORS.accent}, ${COLORS.accent2})`,
                border: "none", color: COLORS.white, fontSize: 16, fontWeight: 700,
                cursor: "pointer", fontFamily: "Inter, sans-serif",
                boxShadow: `0 8px 32px ${COLORS.accent}50`,
                transition: "all 0.2s",
              }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-2px)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = "none"; }}
              >Start Free Trial →</button>
              <button style={{
                padding: "16px 36px", borderRadius: 16,
                background: "transparent", border: "1.5px solid rgba(255,255,255,0.2)",
                color: COLORS.white, fontSize: 16, fontWeight: 700,
                cursor: "pointer", fontFamily: "Inter, sans-serif",
                transition: "all 0.2s",
              }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = COLORS.accent; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,255,255,0.2)"; }}
              >Book a Demo</button>
            </div>
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.35)", fontFamily: "Inter, sans-serif", marginTop: 24 }}>
              No credit card required · 14-day free trial · Cancel anytime
            </p>
          </div>
        </div>
      </Section>

      {/* ─── FOOTER ──────────────────────────────────────────────────────────── */}
      <footer style={{ background: COLORS.primary, padding: "64px 24px 40px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr", gap: 40, marginBottom: 56, flexWrap: "wrap" }}>
            {/* Brand */}
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                <div style={{ width: 34, height: 34, borderRadius: 10, background: `linear-gradient(135deg, ${COLORS.accent}, ${COLORS.accent2})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>✚</div>
                <span style={{ fontSize: 18, fontWeight: 800, color: COLORS.white, fontFamily: "Geist, Inter, sans-serif", letterSpacing: "-0.03em" }}>Clinicos</span>
              </div>
              <p style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", lineHeight: 1.7, fontFamily: "Inter, sans-serif", maxWidth: 220 }}>
                The intelligent operating system for modern healthcare. Built for clinics, loved by clinicians.
              </p>
            </div>
            {/* Links */}
            {[
              { heading: "Company", links: ["About", "Blog", "Careers", "Press"] },
              { heading: "Product", links: ["Platform", "Pricing", "Changelog", "Roadmap"] },
              { heading: "Resources", links: ["Documentation", "API Docs", "Help Center", "Status"] },
              { heading: "Legal", links: ["Privacy Policy", "Terms of Service", "HIPAA Policy", "Security"] },
            ].map(col => (
              <div key={col.heading}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.4)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 16, fontFamily: "Inter, sans-serif" }}>{col.heading}</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {col.links.map(l => (
                    <a key={l} href="#" style={{ fontSize: 13, color: "rgba(255,255,255,0.55)", textDecoration: "none", fontFamily: "Inter, sans-serif", transition: "color 0.2s" }}
                      onMouseEnter={e => (e.currentTarget.style.color = COLORS.white)}
                      onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.55)")}
                    >{l}</a>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: 32, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", fontFamily: "Inter, sans-serif" }}>© 2025 Clinicos Technologies Pvt. Ltd. All rights reserved.</div>
            <div style={{ display: "flex", gap: 20 }}>
              {["🔒 HIPAA", "✅ SOC 2", "🛡️ GDPR"].map(b => (
                <span key={b} style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", fontFamily: "Inter, sans-serif", fontWeight: 600 }}>{b}</span>
              ))}
            </div>
          </div>
          <div style={{ marginTop: 24, textAlign: "center" }}>
            <a
              href="https://harshsrivastava.in/"
              target="_blank"
              rel="noopener noreferrer"
              style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", textDecoration: "none", fontFamily: "Inter, sans-serif", transition: "color 0.2s" }}
              onMouseEnter={e => (e.currentTarget.style.color = COLORS.white)}
              onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.4)")}
            >
              Made By Harsh Srivastava
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}