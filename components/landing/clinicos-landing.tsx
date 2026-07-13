"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { BookDemoModal } from "@/components/landing/book-demo-modal";
import { useLandingEffects } from "@/components/landing/use-landing-effects";
import "./landing.css";

const HERO_IMAGE =
  "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?q=90&w=3840&auto=format&fit=crop";

function fmtINR(n: number) {
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}

function calcROI(doctorsPerDay: number, patientsPerMonth: number, consultationFee: number, noShowPercent: number) {
  const capacityFactor = Math.max(0.045, 0.055 - (doctorsPerDay - 20) * 0.0005);
  const leakRate = noShowPercent / 100 + capacityFactor;
  const totalLoss = patientsPerMonth * consultationFee * leakRate;
  const recovery = totalLoss * 0.56;
  return { totalLoss, recovery };
}

function openDemo(setDemoOpen: (v: boolean) => void) {
  return (e: React.MouseEvent) => {
    e.preventDefault();
    setDemoOpen(true);
  };
}

function LogoMark() {
  return (
    <span className="logo-mark">
      <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.4" strokeLinecap="round">
        <path d="M12 4v16M4 12h16" />
      </svg>
    </span>
  );
}

export function ClinicosLanding() {
  const [demoOpen, setDemoOpen] = useState(false);
  const [doctorsPerDay, setDoctorsPerDay] = useState(20);
  const [patientsPerMonth, setPatientsPerMonth] = useState(400);
  const [consultationFee, setConsultationFee] = useState(1000);
  const [noShowPercent, setNoShowPercent] = useState(15);

  useLandingEffects();

  const roi = useMemo(
    () => calcROI(doctorsPerDay, patientsPerMonth, consultationFee, noShowPercent),
    [doctorsPerDay, patientsPerMonth, consultationFee, noShowPercent],
  );

  return (
    <div className="landing">
      <nav>
        <a className="logo" href="#hero">
          <LogoMark />
          ClinicOS
        </a>
        <ul className="nav-links">
          <li>
            <a href="#problems">Problems</a>
          </li>
          <li>
            <a href="#how-it-works">How It Works</a>
          </li>
          <li>
            <a href="#ai-employees">AI Team</a>
          </li>
          <li>
            <a href="#platform">Platform</a>
          </li>
          <li>
            <a href="#pricing">Pricing</a>
          </li>
        </ul>
        <button type="button" className="nav-cta" onClick={openDemo(setDemoOpen)}>
          Book a demo <span className="arr">↗</span>
        </button>
      </nav>

      {/* HERO */}
      <header className="hero" id="hero">
        <div className="hero-img">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            id="heroPhoto"
            alt="Confident Indian doctor in a modern clinic"
            src={HERO_IMAGE}
          />
        </div>
        <div className="hero-shade" />
        <div className="hero-grain" />

        <div className="hero-pill pill-1">
          <span className="ic">⚡</span>
          <div>
            <b>AI receptionist</b> <span>answers every call &amp; WhatsApp, 24×7.</span>
          </div>
        </div>
        <div className="hero-pill pill-2">
          <span className="ic">📈</span>
          <div>
            <b>35% more bookings</b> <span>on average within 90 days.</span>
          </div>
        </div>
        <div className="hero-pill pill-3">
          <span className="ic">🩺</span>
          <div>
            <b>Clinic on autopilot</b> <span>follow-ups, recalls &amp; reviews handled by AI.</span>
          </div>
        </div>

        <div className="hero-inner">
          <div className="hero-eyebrow">
            <span className="dot" />
            India&apos;s First AI Clinic Growth Platform
          </div>
          <h1>
            Grow Your Clinic.
            <br />
            <em>Let AI Handle Everything Else.</em>
          </h1>
          <p className="hero-sub">
            India&apos;s first AI-powered clinic growth platform that helps doctors attract more patients,
            automate operations, recover missed revenue, and spend more time treating patients instead of
            managing a clinic.
          </p>
          <div className="hero-metrics">
            <span className="hero-metric-pill">
              <b>35%</b> More Bookings
            </span>
            <span className="hero-metric-pill">
              <b>42%</b> Higher Retention
            </span>
            <span className="hero-metric-pill">
              <b>6 hrs</b> Saved Weekly
            </span>
            <span className="hero-metric-pill">
              <b>4.9★</b> Google Rating
            </span>
          </div>
          <div className="hero-ctas">
            <button type="button" className="btn-primary" onClick={openDemo(setDemoOpen)}>
              Book Free Demo <span className="arr">↗</span>
            </button>
          </div>
        </div>

        <div className="metric-card">
          <div className="label">
            Monthly Bookings <span className="dots">···</span>
          </div>
          <div className="num">+35%</div>
          <div className="sub">Appointment bookings have increased</div>
          <div className="metric-bars">
            <div className="bar purple">
              <i />
            </div>
            <div className="bar grey">
              <i />
            </div>
          </div>
        </div>
      </header>

      {/* PROBLEMS */}
      <section id="problems">
        <div className="wrap">
          <div className="reveal">
            <div className="eyebrow">The biggest problems</div>
            <h2>
              Every Clinic Leaks Revenue.
              <br />
              Most Doctors Never Know Where.
            </h2>
          </div>
          <div className="why-grid">
            {[
              { icon: "☎", title: "Missed Calls", lines: ["Patients call after clinic hours.", "Lose them forever."] },
              { icon: "📉", title: "No Follow-ups", lines: ["Patients never come back."] },
              { icon: "⭐", title: "Poor Google Reviews", lines: ["Happy patients never leave reviews."] },
              { icon: "📄", title: "Paperwork", lines: ["Doctors spend hours writing."] },
              { icon: "💬", title: "WhatsApp Chaos", lines: ["Staff manually messages every patient."] },
              { icon: "💰", title: "Empty Appointment Slots", lines: ["Revenue disappears."] },
            ].map((card) => (
              <div key={card.title} className="why-card reveal">
                <div className="why-ic">{card.icon}</div>
                <h3>{card.title}</h3>
                {card.lines.map((line) => (
                  <p key={line}>{line}</p>
                ))}
              </div>
            ))}
          </div>
          <div className="problems-close reveal">
            <h3>ClinicOS fixes all of it automatically.</h3>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="timeline-section" id="how-it-works">
        <div className="wrap">
          <div className="reveal" style={{ textAlign: "center", maxWidth: 640, margin: "0 auto" }}>
            <div className="eyebrow" style={{ justifyContent: "center" }}>
              How ClinicOS Works
            </div>
            <h2 style={{ margin: "0 auto" }}>From first call to lifelong patient — on autopilot.</h2>
          </div>
          <div className="timeline">
            {[
              { icon: "📅", title: "Patient Books", desc: "Online, WhatsApp, or phone — any channel." },
              { icon: "🤖", title: "AI Receptionist answers", desc: "24×7 in 10 languages. No missed enquiries." },
              { icon: "🏥", title: "Patient Visits", desc: "Smart queue, zero crowding, on-time consults." },
              { icon: "🩺", title: "Doctor treats patient", desc: "Full focus on care. AI handles the rest." },
              { icon: "💬", title: "AI sends follow-up", desc: "Medicine reminders, care instructions, check-ins." },
              { icon: "⭐", title: "Google review request", desc: "Timed perfectly — happy patients leave 5★ reviews." },
              { icon: "🔔", title: "Recall after 6 months", desc: "Chronic patients brought back before they drift." },
              { icon: "🔄", title: "Patient returns", desc: "The loop never breaks. Revenue compounds." },
            ].map((step) => (
              <div key={step.title} className="timeline-step">
                <div className="timeline-dot">{step.icon}</div>
                <div className="timeline-content">
                  <h3>{step.title}</h3>
                  <p>{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* AI EMPLOYEES */}
      <section className="ai-section" id="ai-employees">
        <div className="wrap">
          <div className="reveal" style={{ textAlign: "center", maxWidth: 720, margin: "0 auto" }}>
            <div className="eyebrow" style={{ justifyContent: "center" }}>
              AI Employees
            </div>
            <h2 style={{ margin: "0 auto" }}>
              Meet Your New Team.
              <br />
              They never sleep.
            </h2>
          </div>
          <div className="ai-grid">
            {[
              { emoji: "🧠", title: "AI Receptionist", lines: ["Books appointments.", "Answers WhatsApp.", "Handles calls."] },
              { emoji: "📈", title: "Growth AI", lines: ["Finds patients who haven't returned."] },
              { emoji: "⭐", title: "Reputation AI", lines: ["Gets Google Reviews."] },
              { emoji: "💊", title: "Follow-up AI", lines: ["Medicine reminders."] },
              { emoji: "📄", title: "AI Scribe", lines: ["Writes notes."] },
              { emoji: "📢", title: "Marketing AI", lines: ["Creates campaigns."] },
            ].map((card) => (
              <div key={card.title} className="ai-card reveal">
                <span className="ai-emoji">{card.emoji}</span>
                <h3>{card.title}</h3>
                {card.lines.map((line) => (
                  <p key={line}>{line}</p>
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRODUCT SHOWCASE */}
      <section className="bento-section" id="platform">
        <div className="wrap">
          <div className="reveal">
            <div className="eyebrow">Product showcase</div>
            <h2>One workflow. Every touchpoint. Zero manual work.</h2>
            <p className="lead">
              See how a single patient journey flows through ClinicOS — from first enquiry to return visit.
            </p>
          </div>
          <div className="bento">
            <div className="b-card b-12 reveal">
              <span className="b-tag">End-to-end workflow</span>
              <h3>The complete patient journey — automated</h3>
              <p>Every step connected. Every gap closed. Revenue recovered at every stage.</p>
              <div className="workflow-chain">
                {[
                  "AI Receptionist",
                  "Appointment",
                  "Billing",
                  "Prescription",
                  "Review",
                  "Return Visit",
                ].map((step, i) => (
                  <span key={step} style={{ display: "contents" }}>
                    {i > 0 && <span className="workflow-arrow">↓</span>}
                    <span className="workflow-step">
                      <span className="wf-num">{i + 1}</span>
                      {step}
                    </span>
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* RESULTS */}
      <section id="results">
        <div className="wrap">
          <div className="reveal" style={{ textAlign: "center", maxWidth: 640, margin: "0 auto" }}>
            <div className="eyebrow" style={{ justifyContent: "center" }}>
              Real results
            </div>
            <h2 style={{ margin: "0 auto" }}>What Happens After Switching?</h2>
          </div>
          <div className="results-grid">
            {[
              { val: "35%", label: "More Bookings" },
              { val: "42%", label: "More Returning Patients" },
              { val: "75%", label: "Less Reception Work" },
              { val: "4.9★", label: "Google Rating" },
              { val: "6 hrs", label: "Saved Per Doctor Weekly" },
              { val: "₹3L+", label: "Average Additional Revenue" },
            ].map((stat) => (
              <div key={stat.label} className="result-card reveal">
                <div className="val">{stat.val}</div>
                <div className="label">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section className="pricing-section" id="pricing">
        <div className="wrap">
          <div className="reveal" style={{ textAlign: "center" }}>
            <div className="eyebrow" style={{ justifyContent: "center" }}>
              Pricing
            </div>
            <h2 style={{ margin: "0 auto" }}>Choose How Fast You Want To Grow.</h2>
          </div>
          <div className="price-grid">
            <div className="price-card reveal">
              <span className="plan-tag">Launch</span>
              <div className="price">
                ₹2,999<small>/month</small>
              </div>
              <p className="plan-desc">For new clinics.</p>
              <ul className="feat-list">
                {[
                  "Online Booking",
                  "Patient CRM",
                  "WhatsApp Reminders",
                  "Payment Reminders",
                  "Dashboard",
                  "Basic Analytics",
                  "1 Doctor",
                ].map((f) => (
                  <li key={f}>
                    <span className="tick">✓</span>
                    {f}
                  </li>
                ))}
              </ul>
              <button type="button" className="price-btn" onClick={openDemo(setDemoOpen)}>
                Start free trial
              </button>
            </div>
            <div className="price-card featured reveal">
              <span className="pop-badge">Most Popular</span>
              <span className="plan-tag">Growth AI ⭐</span>
              <div className="price">
                ₹7,999<small>/month</small>
              </div>
              <p className="plan-desc">Everything above +</p>
              <ul className="feat-list">
                {[
                  "AI Follow-ups",
                  "AI Recall Engine",
                  "AI No-show Prediction",
                  "Google Review Automation",
                  "AI Marketing",
                  "Revenue Insights",
                  "Multi-user",
                  "Priority Support",
                ].map((f) => (
                  <li key={f}>
                    <span className="tick">✓</span>
                    {f}
                  </li>
                ))}
              </ul>
              <button type="button" className="price-btn" onClick={openDemo(setDemoOpen)}>
                Start free trial
              </button>
            </div>
            <div className="price-card reveal">
              <span className="plan-tag">Elite Growth Partner</span>
              <div className="price">
                ₹24,999<small>/month</small>
              </div>
              <p className="plan-desc">Your own dedicated digital growth team.</p>
              <ul className="feat-list">
                {[
                  "Everything above +",
                  "Premium Website Development",
                  "SEO",
                  "Google Business Optimization",
                  "Social Media Management",
                  "AI Marketing Campaigns",
                  "Dedicated Growth Manager",
                  "Full ClinicOS Suite",
                  "Unlimited Staff",
                  "Monthly Strategy Calls",
                ].map((f) => (
                  <li key={f}>
                    <span className="tick">✓</span>
                    {f}
                  </li>
                ))}
              </ul>
              <button type="button" className="price-btn" onClick={openDemo(setDemoOpen)}>
                Talk to sales
              </button>
            </div>
          </div>
          <p className="price-note">
            All plans include a <b>14-day free trial</b>, free onboarding, and migration from your current
            software — done for you in 48 hours.
          </p>
        </div>
      </section>

      {/* ROI CALCULATOR */}
      <section className="roi-section" id="roi">
        <div className="wrap">
          <div className="reveal">
            <div className="eyebrow">ROI Calculator</div>
            <h2>See what your clinic is leaving on the table.</h2>
            <p className="lead">
              Most clinics lose thousands every month to no-shows, missed calls, and forgotten follow-ups.
              See your numbers in seconds.
            </p>
          </div>
          <div className="roi-layout">
            <div className="roi-form reveal">
              <div className="roi-field">
                <label htmlFor="doctorsPerDay">Doctors Per Day</label>
                <input
                  id="doctorsPerDay"
                  type="number"
                  min={1}
                  max={50}
                  value={doctorsPerDay}
                  onChange={(e) => setDoctorsPerDay(Number(e.target.value) || 0)}
                />
              </div>
              <div className="roi-field">
                <label htmlFor="patientsPerMonth">Patients Per Month</label>
                <input
                  id="patientsPerMonth"
                  type="number"
                  min={10}
                  max={5000}
                  value={patientsPerMonth}
                  onChange={(e) => setPatientsPerMonth(Number(e.target.value) || 0)}
                />
              </div>
              <div className="roi-field">
                <label htmlFor="consultationFee">Consultation Fee (₹)</label>
                <input
                  id="consultationFee"
                  type="number"
                  min={100}
                  max={50000}
                  value={consultationFee}
                  onChange={(e) => setConsultationFee(Number(e.target.value) || 0)}
                />
              </div>
              <div className="roi-field">
                <label htmlFor="noShowPercent">No-show %</label>
                <input
                  id="noShowPercent"
                  type="number"
                  min={0}
                  max={50}
                  value={noShowPercent}
                  onChange={(e) => setNoShowPercent(Number(e.target.value) || 0)}
                />
              </div>
            </div>
            <div className="roi-results reveal">
              <div className="roi-loss">
                <small>You lose approximately</small>
                <div className="amount">{fmtINR(roi.totalLoss)}/month</div>
              </div>
              <div className="roi-recover">
                <small>ClinicOS could recover</small>
                <div className="amount">{fmtINR(roi.recovery)}/month</div>
              </div>
              <div className="roi-cta">
                <button type="button" className="btn-primary" onClick={openDemo(setDemoOpen)}>
                  Book Demo <span className="arr">↗</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* COMPARISON */}
      <section className="compare-section" id="compare">
        <div className="wrap">
          <div className="reveal" style={{ textAlign: "center", maxWidth: 640, margin: "0 auto" }}>
            <div className="eyebrow" style={{ justifyContent: "center" }}>
              Why switch
            </div>
            <h2 style={{ margin: "0 auto" }}>Manual clinic vs. ClinicOS</h2>
          </div>
          <div className="compare-table reveal">
            <table>
              <thead>
                <tr>
                  <th>Feature</th>
                  <th>Manual Clinic</th>
                  <th>ClinicOS</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { feature: "Missed Calls", manual: "❌", clinicos: "✅ AI Answers" },
                  { feature: "Follow-ups", manual: "Staff", clinicos: "Automatic" },
                  { feature: "Google Reviews", manual: "Manual", clinicos: "AI" },
                  { feature: "Patient Recall", manual: "None", clinicos: "Automatic" },
                  { feature: "Revenue Insights", manual: "Excel", clinicos: "Live Dashboard" },
                  { feature: "Marketing", manual: "Agency", clinicos: "AI" },
                ].map((row) => (
                  <tr key={row.feature}>
                    <td>{row.feature}</td>
                    <td className="compare-bad">{row.manual}</td>
                    <td className="compare-good">{row.clinicos}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* FOOTER CTA */}
      <footer>
        <div className="wrap">
          <div className="foot-cta reveal">
            <h2 className="serif">Your Next Patient Is Probably Calling Right Now.</h2>
            <p>Don&apos;t let them book somewhere else.</p>
            <button type="button" className="btn-primary" onClick={openDemo(setDemoOpen)}>
              Book Your Free Demo <span className="arr">↗</span>
            </button>
          </div>
          <div className="foot-grid">
            <div className="foot-brand">
              <a className="logo" href="#hero">
                <LogoMark />
                ClinicOS
              </a>
              <p>
                India&apos;s first AI-powered clinic growth platform. Built in Bengaluru, trusted from
                Srinagar to Kochi.
              </p>
            </div>
            <div>
              <h4>Product</h4>
              <ul>
                <li>
                  <a href="#problems">Problems</a>
                </li>
                <li>
                  <a href="#how-it-works">How It Works</a>
                </li>
                <li>
                  <a href="#ai-employees">AI Team</a>
                </li>
                <li>
                  <a href="#pricing">Pricing</a>
                </li>
              </ul>
            </div>
            <div>
              <h4>Company</h4>
              <ul>
                <li>
                  <Link href="/login">Sign In</Link>
                </li>
                <li>
                  <Link href="/register">Register Clinic</Link>
                </li>
                <li>
                  <Link href="/privacy">Privacy</Link>
                </li>
                <li>
                  <Link href="/terms">Terms</Link>
                </li>
              </ul>
            </div>
            <div>
              <h4>Get started</h4>
              <ul>
                <li>
                  <button
                    type="button"
                    style={{
                      background: "none",
                      border: "none",
                      color: "rgba(252,251,248,.75)",
                      font: "inherit",
                      fontSize: "14.5px",
                      cursor: "pointer",
                      padding: 0,
                    }}
                    onClick={openDemo(setDemoOpen)}
                  >
                    Book a demo
                  </button>
                </li>
                <li>
                  <a href="#roi">ROI Calculator</a>
                </li>
                <li>
                  <a href="#compare">Compare</a>
                </li>
              </ul>
            </div>
          </div>
          <div className="foot-bottom">
            <span>© 2026 ClinicOS Technologies Pvt. Ltd. · Bengaluru, India</span>
            <span>Made with care for Indian healthcare 🇮🇳</span>
          </div>
        </div>
      </footer>

      <BookDemoModal open={demoOpen} onClose={() => setDemoOpen(false)} />
    </div>
  );
}
