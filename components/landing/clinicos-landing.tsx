"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import femaleHero from "@/app/assets/female_hero.png";
import { BookDemoModal } from "@/components/landing/book-demo-modal";
import { useLandingEffects } from "@/components/landing/use-landing-effects";
import "./landing.css";

const HERO_IMAGE = femaleHero.src;

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
      <header className="hero" id="hero">
        <nav>
          <a className="logo" href="#hero">
            <LogoMark />
            ClinicOS
          </a>
          <ul className="nav-links">
            <li>
              <a href="#platform">Product</a>
            </li>
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
          <div className="nav-actions">
            <Link href="/login" className="nav-login">
              Sign In
            </Link>
            <button type="button" className="nav-cta" onClick={openDemo(setDemoOpen)}>
              Book a demo <span className="arr">↗</span>
            </button>
          </div>
        </nav>

        <div className="hero-img">
          <div className="hero-img-zoom">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              id="heroPhoto"
              alt="Confident female doctor in a modern clinic"
              src={HERO_IMAGE}
            />
          </div>
        </div>
        <div className="hero-shade" />
        <div className="hero-vignette" />

        <div className="hero-bottom">
          <div className="hero-inner">
            <h1>
              Grow Your Clinic.
              <br />
              <em>Let AI Handle Everything Else.</em>
            </h1>
            <div className="hero-ctas">
              <button type="button" className="btn-primary" onClick={openDemo(setDemoOpen)}>
                Book Free Demo <span className="arr">↗</span>
              </button>
            </div>
          </div>

          <div className="hero-stat-tabs">
            <div className="hero-stat-tab">
              <span className="hero-stat-val">+35%</span>
              <span className="hero-stat-label">Monthly Bookings</span>
            </div>
            <div className="hero-stat-tab">
              <span className="hero-stat-val">+25%</span>
              <span className="hero-stat-label">Revenue</span>
            </div>
          </div>
        </div>
      </header>

      {/* PRODUCT SHOWCASE */}
      <section className="bento-section" id="platform">
        <div className="wrap">
          <div className="reveal section-intro">
            <div className="eyebrow">All-in-one platform</div>
            <h2>Six tools your front desk juggles today. One OS that runs itself.</h2>
            <p className="lead">
              Scheduling, billing, records, follow-ups, reviews, and analytics — connected in one
              workflow so nothing falls through the cracks.
            </p>
          </div>
          <div className="bento">
            <div className="b-card b-7 reveal">
              <span className="b-tag">Smart scheduling</span>
              <h3>A live queue patients actually trust</h3>
              <p>
                Real-time token tracking, automatic wait-time updates on WhatsApp, and zero crowding
                in your waiting room. Patients arrive exactly when needed.
              </p>
              <div className="b-visual">
                <div className="queue-row">
                  <span className="av">AR</span>
                  <span className="queue-name">Ananya Rao · Consultation</span>
                  <span className="st now">In room</span>
                </div>
                <div className="queue-row">
                  <span className="av m">VK</span>
                  <span className="queue-name">Vikram Khanna · Follow-up</span>
                  <span className="st next">Up next · 4 min</span>
                </div>
                <div className="queue-row">
                  <span className="av">SM</span>
                  <span className="queue-name">Sana Merchant · New patient</span>
                  <span className="st wait">Notified · ETA 20 min</span>
                </div>
              </div>
            </div>
            <div className="b-card b-5 reveal">
              <span className="b-tag">AI follow-ups</span>
              <h3>Conversations that book themselves</h3>
              <p>
                Post-visit care, medicine reminders, and re-booking — all handled in the patient&apos;s own language.
              </p>
              <div className="b-visual">
                <div className="wa-bubble">
                  Hi Meera! Dr. Iyer recommended a review in 2 weeks. Shall I book Tuesday 11 AM or Thursday 5 PM?
                </div>
                <div className="wa-bubble reply">Thursday works!</div>
                <div className="wa-time">Booked automatically · no staff involved</div>
              </div>
            </div>
            <div className="b-card b-6 reveal">
              <span className="b-tag">Billing &amp; payments</span>
              <h3>UPI-first billing</h3>
              <p>GST-ready invoices, payment links on WhatsApp, and same-day settlement reports your accountant will love.</p>
            </div>
            <div className="b-card b-6 reveal">
              <span className="b-tag">Patient records</span>
              <h3>EMR without the clutter</h3>
              <p>Voice-dictated notes, e-prescriptions in seconds, ABDM-compliant and secure by default.</p>
            </div>
            <div className="b-card b-6 reveal">
              <span className="b-tag">Growth analytics</span>
              <h3>Know exactly where revenue comes from</h3>
              <p>See which channels, doctors, and treatments drive growth — updated live, explained in plain language.</p>
              <div className="b-visual">
                <div className="rev-line">
                  <b>Google &amp; Maps</b><span className="g">₹3.4L · +22%</span>
                </div>
                <div className="rev-line">
                  <b>Patient referrals</b><span className="g">₹2.1L · +31%</span>
                </div>
                <div className="rev-line">
                  <b>AI re-bookings</b><span className="g">₹1.8L · +43%</span>
                </div>
              </div>
            </div>
            <div className="b-card b-6 reveal">
              <span className="b-tag">Multi-branch</span>
              <h3>One dashboard, every location</h3>
              <p>
                Compare branches, share patient records across locations, and roll out changes everywhere in one
                click. Built for clinic chains from day one.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* PROBLEMS */}
      <section className="problems-section" id="problems">
        <div className="wrap">
          <div className="reveal section-intro">
            <div className="eyebrow">The biggest problems</div>
            <h2>
              Every Clinic Leaks Revenue.
              <br />
              Most Doctors Never Know Where.
            </h2>
            <p className="lead">
              Most Indian clinics lose 30–40% of potential revenue to missed calls, forgotten follow-ups,
              and silent patient drop-offs. These six leaks drain growth every single day — ClinicOS closes
              each one automatically.
            </p>
          </div>
          <div className="why-grid">
            {[
              {
                icon: "☎",
                accent: "blue",
                title: "Missed Calls",
                desc: "Patients call after clinic hours or during consultations. Without an AI receptionist, those enquiries go to voicemail — and straight to your competitor.",
                stat: "4 in 10 calls go unanswered",
              },
              {
                icon: "📉",
                accent: "mint",
                title: "No Follow-ups",
                desc: "Patients finish treatment and disappear. No one reminds them about reviews, recalls, or the next visit — so repeat revenue quietly vanishes.",
                stat: "58% of patients never return",
              },
              {
                icon: "⭐",
                accent: "indigo",
                title: "Poor Google Reviews",
                desc: "Happy patients leave without reviewing. Unhappy ones post publicly first. Your online reputation grows by accident, not design.",
                stat: "Only 1 in 12 patients leave a review",
              },
              {
                icon: "📄",
                accent: "blue",
                title: "Paperwork Overload",
                desc: "Doctors spend hours on notes, prescriptions, and admin after every consult. That's time stolen from patients — and from going home on time.",
                stat: "6+ hrs/week on admin per doctor",
              },
              {
                icon: "💬",
                accent: "mint",
                title: "WhatsApp Chaos",
                desc: "Staff manually message every patient for reminders, reports, and directions. One busy day and the whole queue falls apart.",
                stat: "200+ manual messages per week",
              },
              {
                icon: "💰",
                accent: "indigo",
                title: "Empty Appointment Slots",
                desc: "No-shows, late cancellations, and forgotten recalls leave chairs empty. Revenue disappears slot by slot — and nobody tracks why.",
                stat: "₹3L+ lost monthly on average",
              },
            ].map((card) => (
              <div key={card.title} className={`why-card reveal accent-${card.accent}`}>
                <div className="why-ic">{card.icon}</div>
                <h3>{card.title}</h3>
                <p>{card.desc}</p>
                <span className="why-stat">{card.stat}</span>
              </div>
            ))}
          </div>
          <div className="problems-close reveal">
            <h3>ClinicOS fixes all of it — automatically, 24×7.</h3>
            <p>One platform replaces your front desk chaos with an AI team that never sleeps.</p>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="timeline-section" id="how-it-works">
        <div className="wrap">
          <div className="reveal section-intro center">
            <div className="eyebrow" style={{ justifyContent: "center" }}>
              How ClinicOS Works
            </div>
            <h2 style={{ margin: "0 auto" }}>From first call to lifelong patient — on autopilot.</h2>
            <p className="lead" style={{ marginLeft: "auto", marginRight: "auto" }}>
              Every patient touchpoint is connected. ClinicOS runs the full loop — booking, care,
              follow-up, reviews, and recall — so your team focuses on medicine, not messaging.
            </p>
          </div>
          <div className="timeline">
            {[
              { icon: "📅", title: "Patient Books", desc: "Online, WhatsApp, or phone — patients reach you on any channel, any time of day." },
              { icon: "🤖", title: "AI Receptionist answers", desc: "24×7 in 10 languages. Books appointments, answers FAQs, and escalates emergencies instantly." },
              { icon: "🏥", title: "Patient Visits", desc: "Smart queue with live wait times on WhatsApp. Zero crowding, on-time consultations." },
              { icon: "🩺", title: "Doctor treats patient", desc: "Full focus on care. AI Scribe drafts notes and prescriptions while you consult." },
              { icon: "💬", title: "AI sends follow-up", desc: "Medicine reminders, care instructions, and check-ins in the patient's own language." },
              { icon: "⭐", title: "Google review request", desc: "Timed at the perfect moment — happy patients leave 5★ reviews; unhappy ones are routed privately." },
              { icon: "🔔", title: "Recall after 6 months", desc: "Chronic and annual patients are brought back before they quietly drift away." },
              { icon: "🔄", title: "Patient returns", desc: "The loop never breaks. Revenue compounds with every repeat visit." },
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

      {/* TRUST BAND */}
      <section className="trust-band">
        <div className="wrap">
          <div className="stats-band reveal">
            {[
              { val: "2,000+", label: "Clinics across 140 Indian cities" },
              { val: "4.1M+", label: "Appointments booked through ClinicOS" },
              { val: "₹86Cr", label: "Revenue recovered for clinics in 2025" },
              { val: "4.9★", label: "Average clinic rating after 6 months" },
            ].map((stat) => (
              <div key={stat.label} className="stat-cell">
                <div className="n">{stat.val}</div>
                <div className="d">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* AI EMPLOYEES */}
      <section className="ai-section" id="ai-employees">
        <div className="wrap">
          <div className="reveal section-intro center">
            <div className="eyebrow" style={{ justifyContent: "center" }}>
              AI Employees
            </div>
            <h2 style={{ margin: "0 auto" }}>
              Meet Your New Team.
              <br />
              They never sleep.
            </h2>
            <p className="lead" style={{ marginLeft: "auto", marginRight: "auto" }}>
              Not chatbots bolted on top. Six specialised AI agents trained on real Indian clinic
              workflows — calls, recalls, reviews, notes, and growth — working as one coordinated team.
            </p>
          </div>
          <div className="ai-grid">
            {[
              {
                emoji: "🧠",
                title: "AI Receptionist",
                desc: "Answers every call and WhatsApp message in 10 languages. Books, reschedules, sends directions, and hands emergencies to a human instantly.",
                chip: "96% call-to-booking rate",
              },
              {
                emoji: "📈",
                title: "Growth AI",
                desc: "Scores every patient's return likelihood and intervenes early — a gentle nudge, a doctor's note, a booking link — before they disappear.",
                chip: "38% fewer drop-offs",
              },
              {
                emoji: "⭐",
                title: "Reputation AI",
                desc: "Sends review requests at the perfect moment. Routes negative feedback privately to you first, so your Google rating climbs quietly.",
                chip: "4.9★ average across clinics",
              },
              {
                emoji: "💊",
                title: "Follow-up AI",
                desc: "Post-visit care, medicine reminders, and re-booking nudges — all in the patient's preferred language, with zero staff effort.",
                chip: "3× more repeat visits",
              },
              {
                emoji: "📄",
                title: "AI Scribe",
                desc: "Listens during consultations (with consent), drafts structured notes and e-prescriptions, and files them to your EMR automatically.",
                chip: "90 min saved per doctor daily",
              },
              {
                emoji: "📢",
                title: "Marketing AI",
                desc: "Creates and runs campaigns for slow days, seasonal rushes, and new services — explained in plain language, optimised with live data.",
                chip: "Weekly growth playbook",
              },
            ].map((card) => (
              <div key={card.title} className="ai-card reveal">
                <span className="ai-emoji">{card.emoji}</span>
                <h3>{card.title}</h3>
                <p>{card.desc}</p>
                <span className="glow-chip">● {card.chip}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* RESULTS */}
      <section className="results-section" id="results">
        <div className="wrap">
          <div className="reveal section-intro center">
            <div className="eyebrow" style={{ justifyContent: "center" }}>
              Real results
            </div>
            <h2 style={{ margin: "0 auto" }}>What happens after switching to ClinicOS</h2>
            <p className="lead" style={{ marginLeft: "auto", marginRight: "auto" }}>
              Clinics on ClinicOS see measurable growth within 90 days — more bookings, higher retention,
              and dramatically less front-desk workload.
            </p>
          </div>
          <div className="results-grid">
            {[
              { val: "35%", label: "More Bookings", hint: "Within first 90 days", color: "blue" },
              { val: "42%", label: "More Returning Patients", hint: "Via AI recall engine", color: "mint" },
              { val: "75%", label: "Less Reception Work", hint: "Calls & WhatsApp automated", color: "indigo" },
              { val: "4.9★", label: "Google Rating", hint: "After 6 months average", color: "blue" },
              { val: "6 hrs", label: "Saved Per Doctor Weekly", hint: "Notes & admin offloaded", color: "mint" },
              { val: "₹3L+", label: "Additional Revenue", hint: "Average per clinic / year", color: "indigo" },
            ].map((stat) => (
              <div key={stat.label} className={`result-card reveal accent-${stat.color}`}>
                <div className="val">{stat.val}</div>
                <div className="label">{stat.label}</div>
                <div className="hint">{stat.hint}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="testimonials-section" id="testimonials">
        <div className="wrap">
          <div className="reveal section-intro center">
            <div className="eyebrow" style={{ justifyContent: "center" }}>
              Trusted by clinics
            </div>
            <h2 style={{ margin: "0 auto" }}>From single-doctor practices to 40-branch chains</h2>
            <p className="lead" style={{ marginLeft: "auto", marginRight: "auto" }}>
              Doctors across India use ClinicOS to grow faster without hiring more staff.
            </p>
          </div>
          <div className="testi-grid">
            {[
              {
                quote:
                  "We were losing every call that came during consultations. In month one, ClinicOS booked 118 appointments we would simply never have known about.",
                name: "Dr. Rohan Shetty",
                role: "Shetty Dental Studio, Bengaluru",
                initials: "RS",
                accent: "blue",
              },
              {
                quote:
                  "The follow-up AI feels like hiring three coordinators. Our repeat-visit rate went from 41% to 67%, and my staff finally leaves on time.",
                name: "Dr. Priya Nair",
                role: "Aster Skin & Hair, Kochi",
                initials: "PN",
                accent: "mint",
              },
              {
                quote:
                  "We run 12 branches on one ClinicOS dashboard. I see every branch's revenue, queue, and rating on my phone over morning chai.",
                name: "Arjun Malhotra",
                role: "COO, LifeSpring Clinics (12 branches)",
                initials: "AM",
                accent: "indigo",
              },
            ].map((t) => (
              <div key={t.name} className={`testi reveal accent-${t.accent}`}>
                <div className="stars">★★★★★</div>
                <q>{t.quote}</q>
                <div className="who">
                  <span className={`av ${t.accent}`}>{t.initials}</span>
                  <div>
                    <b>{t.name}</b>
                    <span>{t.role}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section className="pricing-section" id="pricing">
        <div className="wrap">
          <div className="reveal section-intro center">
            <div className="eyebrow" style={{ justifyContent: "center" }}>
              Pricing
            </div>
            <h2 style={{ margin: "0 auto" }}>Choose how fast you want to grow</h2>
            <p className="lead" style={{ marginLeft: "auto", marginRight: "auto" }}>
              Every plan pays for itself with a handful of recovered appointments. Start free — no card
              required. Migration from your current software done in 48 hours.
            </p>
          </div>
          <div className="price-grid">
            <div className="price-card reveal">
              <span className="plan-tag">Launch</span>
              <div className="price">
                ₹2,999<small>/month</small>
              </div>
              <p className="plan-desc">For new clinics ready to stop losing patients to missed calls and manual follow-ups.</p>
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
              <p className="plan-desc">The full AI growth engine — follow-ups, recalls, reviews, and revenue insights on autopilot.</p>
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
          <div className="reveal section-intro center">
            <div className="eyebrow" style={{ justifyContent: "center" }}>
              Why switch
            </div>
            <h2 style={{ margin: "0 auto" }}>Manual clinic vs. ClinicOS</h2>
            <p className="lead" style={{ marginLeft: "auto", marginRight: "auto" }}>
              See how ClinicOS replaces spreadsheets, agency fees, and overwhelmed front-desk staff with
              one intelligent platform.
            </p>
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
                  <button type="button" className="foot-link-btn" onClick={openDemo(setDemoOpen)}>
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
          <div className="foot-founder-wrap">
            <a
              href="https://harshsrivastava.in/"
              target="_blank"
              rel="noopener noreferrer"
              className="foot-founder"
            >
              Founded by Harsh Srivastava
            </a>
          </div>
        </div>
      </footer>

      <BookDemoModal open={demoOpen} onClose={() => setDemoOpen(false)} />
    </div>
  );
}
