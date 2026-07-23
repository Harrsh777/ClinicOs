"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import femaleHero from "@/app/assets/female_hero.png";
import { BookDemoModal } from "@/components/landing/book-demo-modal";
import { PlatformBento } from "@/components/landing/platform-bento";
import { useLandingEffects } from "@/components/landing/use-landing-effects";
import { ClinicOsWordmark } from "@/components/brand/clinicos-wordmark";
import { ClinicJourney } from "@/components/landing/clinic-journey";
import { TiltCard } from "@/components/landing/tilt-card";
import { CountUp } from "@/components/landing/count-up";
import "./landing.css";
import "./journey.css";

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

/** Staggered scroll reveal for any element carrying data-reveal. */
function useStaggerReveal() {
  useEffect(() => {
    const els = Array.from(document.querySelectorAll<HTMLElement>("[data-reveal]"));
    if (!els.length) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      els.forEach((el) => el.classList.add("revealed"));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("revealed");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.18, rootMargin: "0px 0px -8% 0px" },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
}

export function ClinicosLanding() {
  const [demoOpen, setDemoOpen] = useState(false);
  const [doctorsPerDay, setDoctorsPerDay] = useState(20);
  const [patientsPerMonth, setPatientsPerMonth] = useState(400);
  const [consultationFee, setConsultationFee] = useState(1000);
  const [noShowPercent, setNoShowPercent] = useState(15);

  useLandingEffects();
  useStaggerReveal();

  const roi = useMemo(
    () => calcROI(doctorsPerDay, patientsPerMonth, consultationFee, noShowPercent),
    [doctorsPerDay, patientsPerMonth, consultationFee, noShowPercent],
  );

  return (
    <div className="landing">
      {/* ============ HERO (unchanged) ============ */}
      <header className="hero" id="hero">
        <nav>
          <a className="logo" href="#hero">
            <ClinicOsWordmark osClassName="text-[#2e63ff]" />
          </a>
          <ul className="nav-links">
            <li>
              <a href="#platform">Product</a>
            </li>
            <li>
              <a href="#journey">The Journey</a>
            </li>
            <li>
              <a href="#problems">Problems</a>
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
            <img id="heroPhoto" alt="Confident female doctor in a modern clinic" src={HERO_IMAGE} />
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

      <PlatformBento />

      {/* ============ THE JOURNEY — pinned scroll story ============ */}
      <ClinicJourney />

      {/* ============ PROBLEMS — 3D tilt cards ============ */}
      <section className="problems-section" id="problems">
        <div className="wrap">
          <div className="section-intro" data-reveal>
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
            ].map((card, i) => (
              <TiltCard key={card.title} className={`why-card accent-${card.accent}`}>
                <div data-reveal style={{ "--reveal-i": i } as React.CSSProperties}>
                  <div className="why-ic">{card.icon}</div>
                  <h3>{card.title}</h3>
                  <p>{card.desc}</p>
                  <span className="why-stat">{card.stat}</span>
                </div>
              </TiltCard>
            ))}
          </div>
          <div className="problems-close" data-reveal>
            <h3>ClinicOS fixes all of it — automatically, 24×7.</h3>
            <p>One platform replaces your front desk chaos with an AI team that never sleeps.</p>
          </div>
        </div>
      </section>

      {/* ============ TRUST BAND — animated counters ============ */}
      <section className="trust-band">
        <div className="wrap">
          <div className="stats-band" data-reveal>
            <div className="stat-cell">
              <div className="n">
                <CountUp to={2000} suffix="+" />
              </div>
              <div className="d">Clinics across 140 Indian cities</div>
            </div>
            <div className="stat-cell">
              <div className="n">
                <CountUp to={4.1} decimals={1} suffix="M+" />
              </div>
              <div className="d">Appointments booked through ClinicOS</div>
            </div>
            <div className="stat-cell">
              <div className="n">
                <CountUp to={86} prefix="₹" suffix="Cr" />
              </div>
              <div className="d">Revenue recovered for clinics in 2025</div>
            </div>
            <div className="stat-cell">
              <div className="n">
                <CountUp to={4.9} decimals={1} suffix="★" />
              </div>
              <div className="d">Average clinic rating after 6 months</div>
            </div>
          </div>
        </div>
      </section>

      {/* ============ AI EMPLOYEES — 3D tilt cards ============ */}
      <section className="ai-section" id="ai-employees">
        <div className="wrap">
          <div className="section-intro center" data-reveal>
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
            ].map((card, i) => (
              <TiltCard key={card.title} className="ai-card" maxTilt={11}>
                <div data-reveal style={{ "--reveal-i": i % 3 } as React.CSSProperties}>
                  <span className="ai-emoji">{card.emoji}</span>
                  <h3>{card.title}</h3>
                  <p>{card.desc}</p>
                  <span className="glow-chip">● {card.chip}</span>
                </div>
              </TiltCard>
            ))}
          </div>
        </div>
      </section>

      {/* ============ RESULTS ============ */}
      <section className="results-section" id="results">
        <div className="wrap">
          <div className="section-intro center" data-reveal>
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
            ].map((stat, i) => (
              <div
                key={stat.label}
                className={`result-card accent-${stat.color}`}
                data-reveal
                style={{ "--reveal-i": i } as React.CSSProperties}
              >
                <div className="val">{stat.val}</div>
                <div className="label">{stat.label}</div>
                <div className="hint">{stat.hint}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ TESTIMONIALS ============ */}
      <section className="testimonials-section" id="testimonials">
        <div className="wrap">
          <div className="section-intro center" data-reveal>
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
            ].map((t, i) => (
              <TiltCard key={t.name} className={`testi accent-${t.accent}`} maxTilt={6}>
                <div data-reveal style={{ "--reveal-i": i } as React.CSSProperties}>
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
              </TiltCard>
            ))}
          </div>
        </div>
      </section>

      {/* ============ PRICING ============ */}
      <section className="pricing-section" id="pricing">
        <div className="wrap">
          <div className="section-intro center" data-reveal>
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
            <TiltCard className="price-card" maxTilt={5}>
              <div data-reveal>
                <span className="plan-tag">Launch</span>
                <div className="price">
                  ₹2,999<small>/month</small>
                </div>
                <p className="plan-desc">
                  For new clinics ready to stop losing patients to missed calls and manual follow-ups.
                </p>
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
            </TiltCard>
            <TiltCard className="price-card featured" maxTilt={5}>
              <div data-reveal style={{ "--reveal-i": 1 } as React.CSSProperties}>
                <span className="pop-badge">Most Popular</span>
                <span className="plan-tag">Growth AI ⭐</span>
                <div className="price">
                  ₹7,999<small>/month</small>
                </div>
                <p className="plan-desc">
                  The full AI growth engine — follow-ups, recalls, reviews, and revenue insights on autopilot.
                </p>
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
            </TiltCard>
            <TiltCard className="price-card" maxTilt={5}>
              <div data-reveal style={{ "--reveal-i": 2 } as React.CSSProperties}>
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
            </TiltCard>
          </div>
          <p className="price-note" data-reveal>
            All plans include a <b>14-day free trial</b>, free onboarding, and migration from your current
            software — done for you in 48 hours.
          </p>
        </div>
      </section>

      {/* ============ ROI CALCULATOR ============ */}
      <section className="roi-section" id="roi">
        <div className="wrap">
          <div data-reveal>
            <div className="eyebrow">ROI Calculator</div>
            <h2>See what your clinic is leaving on the table.</h2>
            <p className="lead">
              Most clinics lose thousands every month to no-shows, missed calls, and forgotten follow-ups.
              See your numbers in seconds.
            </p>
          </div>
          <div className="roi-layout">
            <div className="roi-form" data-reveal>
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
            <div className="roi-results" data-reveal style={{ "--reveal-i": 1 } as React.CSSProperties}>
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

      {/* ============ COMPARISON ============ */}
      <section className="compare-section" id="compare">
        <div className="wrap">
          <div className="section-intro center" data-reveal>
            <div className="eyebrow" style={{ justifyContent: "center" }}>
              Why switch
            </div>
            <h2 style={{ margin: "0 auto" }}>Manual clinic vs. ClinicOS</h2>
            <p className="lead" style={{ marginLeft: "auto", marginRight: "auto" }}>
              See how ClinicOS replaces spreadsheets, agency fees, and overwhelmed front-desk staff with
              one intelligent platform.
            </p>
          </div>
          <div className="compare-table" data-reveal>
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

      {/* ============ FOOTER ============ */}
      <footer>
        <div className="wrap">
          <div className="foot-cta" data-reveal>
            <h2 className="serif">Your Next Patient Is Probably Calling Right Now.</h2>
            <p>Don&apos;t let them book somewhere else.</p>
            <button type="button" className="btn-primary" onClick={openDemo(setDemoOpen)}>
              Book Your Free Demo <span className="arr">↗</span>
            </button>
          </div>
          <div className="foot-grid">
            <div className="foot-brand">
              <a className="logo" href="#hero">
                <ClinicOsWordmark osClassName="text-[#2e63ff]" />
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
                  <a href="#journey">The Journey</a>
                </li>
                <li>
                  <a href="#problems">Problems</a>
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
