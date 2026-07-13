"use client";

import { useState } from "react";
import Link from "next/link";
import { BookDemoModal } from "@/components/landing/book-demo-modal";
import { useLandingEffects } from "@/components/landing/use-landing-effects";
import "./landing.css";

const ACCENT = "#16C784";
const AI = "#6EC6FF";
const TEAL = "#0F766E";
const GOLD = "#F5C542";

function openDemo(setDemoOpen: (v: boolean) => void) {
  return (e: React.MouseEvent) => {
    e.preventDefault();
    setDemoOpen(true);
  };
}

export function ClinicosLanding() {
  const [demoOpen, setDemoOpen] = useState(false);
  useLandingEffects();

  return (
    <div className="landing">
      <nav className="nav" id="landing-nav">
        <Link href="#hero" className="nav-logo">
          <span className="pulse" aria-hidden />
          Clinic<span className="os">OS</span>
        </Link>
        <div className="nav-actions">
          <Link className="nav-signin" href="/login">
            Sign In
          </Link>
          <button type="button" className="btn btn-primary nav-cta magnetic" onClick={openDemo(setDemoOpen)}>
            Book a Demo
          </button>
        </div>
      </nav>

      {/* HERO */}
      <section id="hero">
        <canvas id="hero-canvas" />
        <div className="mouselight" />

        <div className="hero-stage">
          <div className="hero-lines" id="heroLines">
            <p className="hero-line" id="hl1">
              A clinic running at its best.
            </p>
            <p className="hero-line" id="hl2">
              Then reality <em>catches up</em>.
            </p>
          </div>

          <div className="paper-field" id="paperField">
            <div className="paper" data-depth="0.06" style={{ top: "14%", left: "9%" }}>
              <small>Lost revenue</small>₹1.4L/mo · no-shows
            </div>
            <div className="paper" data-depth="0.1" style={{ top: "22%", right: "11%" }}>
              <small>Empty slots</small>Tuesday 3–5 PM · unused
            </div>
            <div className="paper alert" data-depth="0.14" style={{ top: "64%", left: "12%" }}>
              <small>Follow-ups</small>27% never returned
            </div>
            <div className="paper wa" data-depth="0.08" style={{ top: "72%", right: "14%" }}>
              <small>WhatsApp</small>&quot;Any slot today?&quot; · unread
            </div>
            <div className="paper" data-depth="0.12" style={{ top: "40%", left: "4%" }}>
              <small>Google</small>3.6 ★ · ranking #12
            </div>
            <div className="paper" data-depth="0.05" style={{ top: "47%", right: "5%" }}>
              <small>Recall list</small>14 diabetics · overdue
            </div>
            <div className="paper" data-depth="0.16" style={{ top: "84%", left: "38%" }}>
              <small>Referrals</small>0 this month
            </div>
            <div className="paper alert" data-depth="0.09" style={{ top: "8%", left: "44%" }}>
              <small>Reviews</small>3 unhappy · unanswered
            </div>
          </div>

          <div className="core" id="core" />

          <div className="hero-reveal" id="heroReveal">
            <h1 className="hero-headline rvh">
              <span className="hero-headline-line">India&apos;s First</span>
              <span className="hero-headline-line">AI-Powered</span>
              <span className="hero-headline-line accent">Clinic Growth Operating System</span>
            </h1>
            <p className="hero-tagline rvh">
              Helping doctors grow their practice, not just manage it.
            </p>
            <div className="hero-ctas rvh">
              <button type="button" className="btn btn-primary magnetic" onClick={openDemo(setDemoOpen)}>
                Book a Demo <span className="btn-arrow">→</span>
              </button>
              <Link href="/login" className="btn btn-ghost magnetic">
                Sign In
              </Link>
            </div>
            <div className="hero-floats glass rvh" id="heroFloats" data-depth="0.04">
              <div className="float-panel">
                <small>Revenue</small>
                <strong>₹14.2L</strong>
                <span>+32% this month</span>
              </div>
              <div className="float-panel">
                <small>Patients</small>
                <strong>61%</strong>
                <span>returning on schedule</span>
              </div>
              <div className="float-panel">
                <small>Appointments</small>
                <strong>94%</strong>
                <span>slots filled today</span>
              </div>
              <div className="float-panel">
                <small>Google Reviews</small>
                <strong className="gold">4.8 ★</strong>
                <span className="gold">+214 this quarter</span>
              </div>
            </div>
          </div>

          <div className="hero-scrollhint" id="scrollHint">
            <span>Scroll to begin</span>
            <span className="bar" />
          </div>
        </div>
      </section>

      {/* PROBLEM */}
      <section id="problem" className="scene scene--alt">
        <div className="wrap">
          <div className="scene-head">
            <span className="eyebrow rv">The growth gap</span>
            <h2 className="h-xl rv rv-d1">
              Great doctors. Stagnant practices.
              <br />
              Sound familiar?
            </h2>
            <p className="lead rv rv-d2">
              You didn&apos;t study medicine to chase follow-ups, fight for Google reviews, or watch revenue leak through empty slots. Yet that&apos;s what most clinics spend their days doing.
            </p>
          </div>

          <div className="clinic-floor">
            <div className="chaos bad c-span4 rv">
              <small>Revenue left on table</small>
              <strong>₹1.4L / month</strong>
              <p>No-shows, missed recalls, unbilled procedures — silently draining growth.</p>
            </div>
            <div className="chaos bad c-span4 rv rv-d1">
              <small>Patient retention</small>
              <strong>27% lost</strong>
              <p>Chronic patients drift away — nobody had time to bring them back.</p>
            </div>
            <div className="chaos bad c-span4 rv rv-d2">
              <small>Google rating</small>
              <strong>3.6 ★</strong>
              <p>&quot;Long wait, billing confusion&quot; — the review new patients read first.</p>
            </div>
            <div className="chaos c-span4 rv rv-d1">
              <small>Empty capacity</small>
              <strong>18 hrs / week</strong>
              <div className="queue-strip">
                <span className="q-dot">—</span>
                <span className="q-dot">—</span>
                <span className="q-dot">—</span>
                <span className="q-more">unfilled slots</span>
              </div>
            </div>
            <div className="chaos bad c-span4 rv rv-d2">
              <small>Referrals</small>
              <strong>Near zero</strong>
              <p>Happy patients leave without reviewing, referring, or returning on schedule.</p>
            </div>
            <div className="chaos c-span4 rv rv-d3">
              <small>Your time</small>
              <strong>60% admin</strong>
              <p>Growth work — recalls, reputation, marketing — always gets pushed to &quot;tomorrow.&quot;</p>
            </div>
          </div>

          <div className="problem-close">
            <span className="eyebrow rv">The real problem</span>
            <h2 className="h-xl rv rv-d1" style={{ marginTop: 20 }}>
              You&apos;re running a practice.
              <br />
              Nobody&apos;s growing it.
            </h2>
          </div>
        </div>
      </section>

      {/* TRANSFORM */}
      <section id="transform" className="scene scene--white">
        <div className="mouselight" />
        <div className="orbit-line" />
        <div className="wrap">
          <span className="eyebrow rv" style={{ justifyContent: "center" }}>
            The shift
          </span>
          <h2 className="h-xl rv rv-d1" style={{ marginTop: 22 }}>
            One Growth OS.
            <br />
            Every lever to scale.
          </h2>
          <p className="lead rv rv-d2" style={{ margin: "22px auto 0" }}>
            ClinicOS doesn&apos;t store records — it grows your practice. Revenue recovery, patient retention, reputation, and AI automation — one intelligent system.
          </p>

          <div className="modules" id="modules">
            {[
              { label: "Revenue", sub: "Recover lost income", ai: false },
              { label: "Retention", sub: "Bring patients back", ai: false },
              { label: "Reputation", sub: "Google reviews on autopilot", ai: false },
              { label: "Queue", sub: "Fill every slot", ai: false },
              { label: "WhatsApp", sub: "24/7 patient engagement", ai: false },
              { label: "AI Assistant", sub: "Watches, warns, grows", ai: true },
              { label: "Analytics", sub: "Owner growth briefing", ai: false },
              { label: "Operations", sub: "Runs while you consult", ai: false },
            ].map((m) => (
              <div key={m.label} className="module glass rv">
                <span className={`mi ${m.ai ? "mi--ai" : ""}`}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                    <circle cx="12" cy="12" r="3.2" />
                    <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
                  </svg>
                </span>
                <b>{m.label}</b>
                <span>{m.sub}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* DASHBOARD */}
      <section id="dash" className="scene scene--alt">
        <div className="wrap">
          <div className="scene-head">
            <span className="eyebrow rv">Growth command centre</span>
            <h2 className="h-xl rv rv-d1">
              Your practice health.
              <br />
              One screen.
            </h2>
            <p className="lead rv rv-d2">Revenue, retention, reputation, queue — everything that grows your clinic, alive in one place.</p>
          </div>

          <div className="dash-space">
            <div className="dash-group" id="dashGroup">
              <div className="dcard glass d-span4 rv" style={{ "--z": "40px" } as React.CSSProperties}>
                <small>
                  <i /> Patient retention
                </small>
                <div className="drow">
                  <span className="avatar">AR</span>
                  <div>
                    <div className="dnum" style={{ fontSize: 19 }}>
                      Anita Rao, 34
                    </div>
                    <div className="dsub">Diabetes · last visit 92 days ago · at risk</div>
                  </div>
                </div>
                <div style={{ marginTop: 14 }}>
                  <span className="chip">Recall queued</span> <span className="chip">₹2,400 at risk</span>
                </div>
              </div>
              <div className="dcard glass d-span4 rv rv-d1" style={{ "--z": "70px" } as React.CSSProperties}>
                <small>
                  <i /> Revenue · today
                </small>
                <div className="dnum" data-count="42300" data-prefix="₹">
                  ₹0<em>+18% vs last Tue</em>
                </div>
                <div className="dsub">31 consults · 9 procedures · 0 unbilled</div>
                <svg viewBox="0 0 220 44" fill="none" style={{ marginTop: 12 }}>
                  <path className="draw-path" d="M2 40 C 30 38, 48 26, 74 27 S 128 14, 160 11 S 200 6, 218 3" stroke={ACCENT} strokeWidth="2.5" strokeLinecap="round" />
                </svg>
              </div>
              <div className="dcard glass d-span4 rv rv-d2" style={{ "--z": "50px" } as React.CSSProperties}>
                <small>
                  <i /> Slot fill rate
                </small>
                <div className="dnum" style={{ fontSize: 19 }}>
                  94% full
                </div>
                <div className="dsub">2 online bookings just now · evening OPD maxed</div>
                <div style={{ marginTop: 14 }}>
                  <span className="chip">+3 weekend slots suggested</span>
                </div>
              </div>
              <div className="dcard glass d-span5 rv rv-d1" style={{ "--z": "80px" } as React.CSSProperties}>
                <small>
                  <i className="ai-dot" /> AI growth assistant
                </small>
                <p className="ai-line">
                  &quot;<b>5 patients</b> missed follow-up. Sending recalls could recover <b>₹18,400</b> this week. Approve?&quot;
                </p>
                <div style={{ marginTop: 14, display: "flex", gap: 10 }}>
                  <span className="chip chip--ai">Approve all</span>
                  <span className="chip chip--ai" style={{ opacity: 0.6 }}>
                    Review list
                  </span>
                </div>
              </div>
              <div className="dcard glass d-span3 rv rv-d2" style={{ "--z": "36px" } as React.CSSProperties}>
                <small>
                  <i /> Google reviews
                </small>
                <div className="dnum" data-count="4.8" data-decimals="1">
                  0<em>214 reviews</em>
                </div>
                <div className="stars">★★★★★</div>
                <div className="dsub">3 new this week — all five stars</div>
              </div>
              <div className="dcard glass d-span4 rv rv-d3" style={{ "--z": "60px" } as React.CSSProperties}>
                <small>
                  <i /> Growth score
                </small>
                <div className="dnum" style={{ fontSize: 19 }}>
                  84 / 100
                </div>
                <div className="dsub">+12 this quarter · reviews are your next lever</div>
                <div className="queue-viz">
                  {[60, 85, 45, 95, 55, 75, 40, 65].map((h, i) => (
                    <i key={i} style={{ height: `${h}%` }} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* JOURNEY - abbreviated with key steps */}
      <section id="journey" className="scene scene--white" style={{ padding: 0 }}>
        <div className="journey-pin" id="journeyPin">
          <div className="journey-head">
            <span className="eyebrow rv">Patient journey</span>
            <h2 className="h-lg rv rv-d1" style={{ marginTop: 18 }}>
              Every touchpoint builds loyalty.
              <br />
              Every visit grows the practice.
            </h2>
          </div>
          <div className="journey-track" id="journeyTrack">
            {[
              { n: "01", title: "She discovers you", body: "4.8★ on Google. Ranks #1 for 'clinic near me'. Trust before the first visit.", tag: "Reputation → growth" },
              { n: "02", title: "Books on WhatsApp", body: "AI confirms slot in 8 seconds. No phone tag. No empty afternoon slots.", tag: "Fill rate +23%" },
              { n: "03", title: "Walks in, zero wait", body: "Token on phone. Vitals pre-captured. Doctor sees full history instantly.", tag: "4 extra min consulting" },
              { n: "04", title: "Leaves delighted", body: "Bill on UPI. Rx on WhatsApp. Review request at the perfect moment.", tag: "5★ review auto-sent" },
              { n: "05", title: "Comes back on schedule", body: "Day 28: AI books her review. Day 90: recall if she slips. The loop never breaks.", tag: "Retention engineered" },
              { n: "06", title: "Refers a friend", body: "Happy patients become your marketing. Referral tracked. Growth compounds.", tag: "Organic acquisition" },
            ].map((step) => (
              <div key={step.n} className="jstep glass">
                <span className="jn">{step.n}</span>
                <h3>{step.title}</h3>
                <p>{step.body}</p>
                <span className="jt">
                  <i />
                  {step.tag}
                </span>
              </div>
            ))}
          </div>
          <div className="j-progress">
            <div className="fill" id="jFill" />
            <div className="walker" id="jWalker" />
          </div>
        </div>
      </section>

      {/* AI */}
      <section id="ai" className="scene scene--alt">
        <canvas id="ai-canvas" />
        <div className="mouselight mouselight--ai" />
        <div className="wrap">
          <div className="ai-grid">
            <div>
              <div className="ai-orb rv" />
              <span className="eyebrow eyebrow--ai rv rv-d1">AI growth engine</span>
              <h2 className="h-xl rv rv-d2" style={{ margin: "20px 0 18px" }}>
                It grows your practice
                <br />
                while you see patients.
              </h2>
              <p className="lead rv rv-d3">
                Not a chatbot. An AI that reads every gap in your schedule, every missed follow-up, every unhappy review — and turns them into revenue, retention, and reputation.
              </p>
              <div className="ai-feed" id="aiFeed" style={{ marginTop: 36 }}>
                <div className="ai-msg">
                  <small>Revenue recovery</small>
                  &quot;Recover <b>₹18,400</b> this week from 5 missed follow-ups. Send recalls?&quot;
                </div>
                <div className="ai-msg">
                  <small>Slot optimization</small>
                  &quot;Open <b>Saturday 10 AM–1 PM</b>. 34 patients searched for weekend slots last month.&quot;
                </div>
                <div className="ai-msg">
                  <small>Reputation</small>
                  &quot;<b>22 happy patients</b> haven&apos;t been asked for a review. Your rating can hit 4.9.&quot;
                </div>
                <div className="ai-msg">
                  <small>Retention alert</small>
                  &quot;<b>12 diabetic patients</b> overdue for review. Auto-booking Thursday slots.&quot;
                </div>
              </div>
            </div>
            <div className="ai-visual">
              <div className="ai-chart glass rv rv-d2">
                <small>Revenue · recovered by AI</small>
                <svg viewBox="0 0 320 130" fill="none">
                  <path d="M0 118 H320" stroke="rgba(17,17,17,.06)" />
                  <path className="draw-path" d="M6 112 C 44 108, 66 92, 96 90 S 150 70, 186 58 S 258 30, 314 14" stroke={AI} strokeWidth="2.5" strokeLinecap="round" />
                  <path className="draw-fill" d="M6 112 C 44 108, 66 92, 96 90 S 150 70, 186 58 S 258 30, 314 14 V126 H6 Z" fill="url(#aig)" opacity="0" />
                  <defs>
                    <linearGradient id="aig" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0" stopColor={AI} stopOpacity=".28" />
                      <stop offset="1" stopColor={AI} stopOpacity="0" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>
              <div className="ai-chart glass rv rv-d3">
                <small>Wait time · shrinking</small>
                <svg viewBox="0 0 320 96" fill="none">
                  <g>
                    {[14, 24, 34, 44, 54, 62, 68].map((y, i) => (
                      <rect key={i} x={10 + i * 45} y={y} width="30" height={70 - y + 14} rx="5" fill={i < 2 ? "rgba(17,17,17,.08)" : i < 4 ? `rgba(110,198,255,${0.25 + i * 0.08})` : AI} />
                    ))}
                  </g>
                  <text x="10" y="94" fill="#5C6470" fontSize="9" fontFamily="IBM Plex Mono">
                    38 min
                  </text>
                  <text x="278" y="94" fill={AI} fontSize="9" fontFamily="IBM Plex Mono">
                    → 14 min
                  </text>
                </svg>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* GROWTH METRICS */}
      <section id="growth" className="scene scene--white">
        <div className="wrap">
          <div className="scene-head">
            <span className="eyebrow rv">90 days later</span>
            <h2 className="h-xl rv rv-d1">
              The practice stops leaking.
              <br />
              Then it starts compounding.
            </h2>
          </div>
          <div className="metric-grid">
            <div className="metric glass rv">
              <small>Monthly revenue</small>
              <div className="val">
                <span data-count="32">0</span>
                <sup>%↑</sup>
              </div>
              <p>Recovered follow-ups, fuller slots, zero unbilled procedures.</p>
            </div>
            <div className="metric glass rv rv-d1">
              <small>Returning patients</small>
              <div className="val">
                <span data-count="41">0</span>
                <sup>%↑</sup>
              </div>
              <p>Automatic recalls bring chronic patients back on schedule.</p>
            </div>
            <div className="metric glass rv rv-d2">
              <small>Google rating</small>
              <div className="val">
                3.6 → <span data-count="4.8" data-decimals="1">0</span>
                <sup>★</sup>
              </div>
              <p>Happy patients, asked at the exact right moment.</p>
            </div>
            <div className="metric glass rv rv-d3">
              <small>Referrals</small>
              <div className="val">
                <span data-count="3">0</span>
                <sup>x</sup>
              </div>
              <p>Reputation flywheel — reviews bring new patients who review.</p>
            </div>
          </div>
          <div className="bigchart glass rv rv-d2">
            <svg viewBox="0 0 900 260" fill="none">
              <g stroke="rgba(17,17,17,.06)">
                <path d="M0 60H900M0 120H900M0 180H900M0 240H900" />
              </g>
              <path className="draw-path" d="M20 236 C 110 230, 160 214, 240 208 S 380 178, 470 152 S 630 96, 730 66 S 840 34, 884 22" stroke={ACCENT} strokeWidth="3" strokeLinecap="round" />
              <path className="draw-fill" d="M20 236 C 110 230, 160 214, 240 208 S 380 178, 470 152 S 630 96, 730 66 S 840 34, 884 22 V254 H20 Z" fill="url(#gg)" opacity="0" />
              <defs>
                <linearGradient id="gg" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor={ACCENT} stopOpacity=".2" />
                  <stop offset="1" stopColor={ACCENT} stopOpacity="0" />
                </linearGradient>
              </defs>
              <text x="20" y="252" fill="#5C6470" fontSize="11" fontFamily="IBM Plex Mono">
                MONTH 1
              </text>
              <text x="820" y="252" fill={ACCENT} fontSize="11" fontFamily="IBM Plex Mono">
                MONTH 6
              </text>
            </svg>
          </div>
        </div>
      </section>

      {/* REPUTATION */}
      <section id="rep" className="scene scene--alt">
        <div className="wrap">
          <div className="scene-head">
            <span className="eyebrow rv">Reputation = acquisition</span>
            <h2 className="h-xl rv rv-d1">
              Build trust before
              <br />
              patients walk in.
            </h2>
            <p className="lead rv rv-d2">After every great visit, ClinicOS asks for the review — at the moment patients are happiest. Your map pin starts to glow.</p>
          </div>
          <div className="rep-grid">
            <div className="rep-cards" id="repCards">
              {[
                { initials: "SK", name: "Suresh K.", grad: `linear-gradient(135deg,${GOLD},#e8a317)`, quote: "In and out in 25 minutes. Got everything on WhatsApp. This is how clinics should work.", top: 0, left: 0, rot: -2 },
                { initials: "PM", name: "Priya M.", grad: `linear-gradient(135deg,${AI},${ACCENT})`, quote: "They remembered my mother's diabetes review before we did. Unheard of.", top: 150, right: 0, rot: 2, delay: "1.2s" },
                { initials: "RD", name: "Rahul D.", grad: `linear-gradient(135deg,${ACCENT},${TEAL})`, quote: "Token on my phone, no queue. Waited from the chai shop next door.", top: 300, left: "8%", rot: -1, delay: "2.1s" },
              ].map((r) => (
                <div
                  key={r.name}
                  className="rcard glass floaty"
                  style={{
                    top: r.top,
                    left: r.left,
                    right: r.right,
                    "--rot": `${r.rot}deg`,
                    animationDelay: r.delay,
                  } as React.CSSProperties}
                >
                  <div className="rhead">
                    <span className="avatar" style={{ background: r.grad }}>{r.initials}</span>
                    <div>
                      <b>{r.name}</b>
                      <small>Google review</small>
                    </div>
                    <span className="g-badge">
                      {"Google".split("").map((c, i) => (
                        <span key={i}>{c}</span>
                      ))}
                    </span>
                  </div>
                  <div className="stars">★★★★★</div>
                  <p>&quot;{r.quote}&quot;</p>
                </div>
              ))}
            </div>
            <div className="map-panel glass rv rv-d1">
              <svg viewBox="0 0 420 300" id="mapSvg">
                <rect width="420" height="300" rx="14" fill="#F5F7F8" />
                <g stroke="rgba(17,17,17,.08)" strokeWidth="7" strokeLinecap="round" opacity=".9">
                  <path d="M-10 80 C 90 70, 150 110, 240 96 S 380 60, 440 76" fill="none" />
                  <path d="M60 -10 C 70 80, 40 160, 80 230 S 110 290, 100 320" fill="none" />
                  <path d="M-10 200 C 120 190, 210 230, 300 214 S 400 180, 440 196" fill="none" />
                </g>
                <g id="mapPins" />
                <g id="clinicPin">
                  <circle cx="210" cy="150" r="6" fill={ACCENT} />
                  <circle cx="210" cy="150" r="6" fill="none" stroke={ACCENT} strokeWidth="2">
                    <animate attributeName="r" values="6;24" dur="2s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values=".8;0" dur="2s" repeatCount="indefinite" />
                  </circle>
                  <text x="210" y="132" textAnchor="middle" fontSize="11" fontFamily="IBM Plex Mono" fill="#111111" fontWeight="600">
                    YOUR CLINIC
                  </text>
                </g>
              </svg>
              <div className="rank-line">
                <span>&quot;clinic near me&quot; ranking</span>
                <b>#12 → #1</b>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* WHATSAPP */}
      <section id="wa" className="scene scene--white">
        <div className="mouselight" />
        <div className="wrap">
          <div className="wa-grid">
            <div>
              <span className="eyebrow rv">Growth on autopilot</span>
              <h2 className="h-xl rv rv-d1" style={{ margin: "20px 0 18px" }}>
                Thousands of touchpoints.
                <br />
                Zero staff hours.
              </h2>
              <p className="lead rv rv-d2">Recalls, reminders, review requests, birthday wishes — composed, personalised, and sent by AI. Your front desk focuses on patients, not typing.</p>
              <div className="wa-counter rv rv-d3">
                <b data-count="12480">0</b>&nbsp;&nbsp;growth messages this month · <span style={{ color: "#25D366" }}>0 typed by staff</span>
              </div>
            </div>
            <div className="wa-stream" id="waStream">
              {[
                { tag: "Recall · revenue", text: "It's been 90 days since your diabetes review. Dr. Mehta has kept Thursday 11 AM for you." },
                { tag: "Review request", text: "Thank you for visiting! Would you share your experience on Google? It helps other patients find us. ⭐" },
                { tag: "Appointment", text: "Reminder: Dr. Mehta, 4:30 PM tomorrow. Reply 1 to confirm, 2 to reschedule." },
                { tag: "Medicine · 9 PM", text: "Namaste Anita ji 🌙 Time for Metformin 500mg. Take after dinner." },
                { tag: "Birthday", text: "Happy birthday, Suresh ji! 🎂 Wishing you great health — from all of us." },
                { tag: "Report ready", text: "Your lab report is ready. View securely: clinic.os/r/8x2k 🔒" },
              ].map((b) => (
                <div key={b.tag} className="wa-bubble">
                  <small>{b.tag}</small>
                  {b.text}
                  <span className="tick">✓✓</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* BI */}
      <section id="bi" className="scene scene--alt">
        <div className="wrap">
          <div className="scene-head">
            <span className="eyebrow rv">Owner&apos;s growth briefing</span>
            <h2 className="h-xl rv rv-d1">Not charts. Answers.</h2>
            <p className="lead rv rv-d2">Every evening, ClinicOS tells you what grew, what leaked, and exactly what to do tomorrow to build a bigger practice.</p>
          </div>
          <div className="bi-grid">
            <div className="bi glass rv">
              <small>Today&apos;s revenue</small>
              <span className="v" data-count="42300" data-prefix="₹">
                ₹0
              </span>
              <p>31 consults · 9 procedures · UPI 78%</p>
            </div>
            <div className="bi glass rv rv-d1">
              <small>Revenue at risk</small>
              <span className="v" style={{ color: GOLD }} data-count="6800" data-prefix="₹">
                ₹0
              </span>
              <p>3 no-shows, 2 unbilled — recovery messages queued.</p>
            </div>
            <div className="bi glass rv rv-d2">
              <small>Returning patients</small>
              <span className="v">
                <span data-count="61">0</span>%
              </span>
              <p>Up from 43% before ClinicOS.</p>
            </div>
            <div className="bi glass rv rv-d1">
              <small>Growth score</small>
              <span className="v" style={{ color: GOLD }}>
                <span data-count="84">0</span>/100
              </span>
              <p>+12 this quarter. Reviews are your next lever.</p>
            </div>
            <div className="bi glass rv rv-d2">
              <small>Patients / hour</small>
              <span className="v">
                <span data-count="4.2" data-decimals="1">
                  0
                </span>
                /hr
              </span>
              <p>More patients, without rushing consults.</p>
            </div>
            <div className="bi glass rv rv-d3">
              <small>Peak demand</small>
              <span className="v">6–8 PM</span>
              <p>Evening OPD 92% full. Saturday mornings = untapped.</p>
            </div>
            <div className="bi suggest glass rv rv-d2">
              <span className="chip chip--ai" style={{ flex: "none" }}>
                AI suggestion
              </span>
              <div>
                <span className="v">Open Saturday mornings, 10 AM – 1 PM.</span>
                <p>34 patients searched for weekend slots last month. Projected: +₹68,000/month.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SCORE */}
      <section id="score">
        <div className="score-pin" id="scorePin">
          <div className="score-glow" id="scoreGlow" />
          <div className="wrap">
            <div style={{ textAlign: "center", marginBottom: 56 }}>
              <span className="eyebrow" style={{ justifyContent: "center" }}>
                One number for your whole practice
              </span>
              <h2 className="h-lg" style={{ marginTop: 18 }}>
                Your Clinic Growth Score.
                <br />
                Watch it climb.
              </h2>
            </div>
            <div className="score-layout">
              <div className="score-ring">
                <svg viewBox="0 0 200 200">
                  <circle cx="100" cy="100" r="88" fill="none" stroke="rgba(17,17,17,.06)" strokeWidth="10" />
                  <circle
                    id="scoreArc"
                    cx="100"
                    cy="100"
                    r="88"
                    fill="none"
                    stroke="url(#scoreGrad)"
                    strokeWidth="10"
                    strokeLinecap="round"
                    strokeDasharray="553"
                    strokeDashoffset="155"
                    style={{ filter: "drop-shadow(0 0 14px rgba(245,197,66,.4))" }}
                  />
                  <defs>
                    <linearGradient id="scoreGrad" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0" stopColor={GOLD} />
                      <stop offset="1" stopColor="#f8d56a" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="score-num">
                  <b id="scoreNum">72</b>
                  <small>Growth Score</small>
                </div>
              </div>
              <div className="score-metrics" id="scoreMetrics">
                {[
                  { label: "Patient retention", start: 62, end: 94 },
                  { label: "Revenue health", start: 68, end: 92 },
                  { label: "Google reviews", start: 71, end: 96 },
                  { label: "Slot utilization", start: 55, end: 97 },
                  { label: "Referral rate", start: 64, end: 95 },
                ].map((row) => (
                  <div key={row.label} className="sm-row">
                    <small>
                      {row.label} <b data-to={row.end}>{row.start}%</b>
                    </small>
                    <div className="sm-bar">
                      <i data-w={row.end} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section id="testi" className="scene scene--white">
        <div className="wrap">
          <div className="scene-head">
            <span className="eyebrow rv">Doctors who grew</span>
            <h2 className="h-xl rv rv-d1">Bigger practices. Same doctors.</h2>
          </div>
          <div className="testi-field">
            {[
              { q: "I used to stay till 9 PM doing admin. Now I leave at 7 and my revenue is up 28%. ClinicOS didn't digitise my clinic — it grew it.", who: "Dr. Vikram Singh", sub: "Family physician · Jaipur", initials: "VS" },
              { q: "The AI recalls brought back 40 diabetic patients we'd quietly lost. That's not software. That's a growth engine that never sleeps.", who: "Dr. Meera Iyer", sub: "Diabetologist · Chennai", initials: "MI", grad: `linear-gradient(135deg,${AI},${ACCENT})` },
              { q: "We went from 3.4 to 4.8 on Google in five months. New patients now say 'we read your reviews' instead of 'we were passing by.'", who: "Dr. Arjun Kulkarni", sub: "Paediatrician · Pune", initials: "AK", grad: `linear-gradient(135deg,${GOLD},#e8a317)` },
            ].map((t, i) => (
              <div key={t.who} className={`testi glass floaty rv ${i > 0 ? `rv-d${i}` : ""}`} style={{ "--rot": "0deg", animationDelay: i === 1 ? "1.4s" : i === 2 ? "2.2s" : undefined } as React.CSSProperties}>
                <q>{t.q}</q>
                <div className="who">
                  <span className="avatar" style={t.grad ? { background: t.grad } : undefined}>{t.initials}</span>
                  <div>
                    <b>{t.who}</b>
                    <small>{t.sub}</small>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SECURITY */}
      <section id="security" className="scene scene--alt">
        <div className="mouselight" />
        <div className="wrap">
          <div className="scene-head">
            <span className="eyebrow rv">Enterprise-grade trust</span>
            <h2 className="h-xl rv rv-d1">
              Growth without compromise.
              <br />
              Security built in.
            </h2>
            <p className="lead rv rv-d2">Encrypted records, role-based access, automatic backups — so you focus on growing, not worrying.</p>
          </div>
          <div className="sec-grid">
            <div className="sec glass rv">
              <h3>Encrypted at rest & in transit</h3>
              <p>Every patient record protected. Only authorised eyes see real data.</p>
              <div className="enc-record">
                <span className="lock">🔒 AES-256</span> · patient_record #2210
                <br />
                Name: <span className="blur">Anita Rao</span> · Age: <span className="blur">34</span>
                <br />
                Dx: <span className="blur">Type 2 Diabetes</span>
              </div>
            </div>
            <div className="sec glass rv rv-d1">
              <h3>Role-based access</h3>
              <p>Reception sees the queue. Doctors see clinical data. You control everything.</p>
              <div className="role-chips">
                <span className="chip">Owner · full</span>
                <span className="chip">Doctor · clinical</span>
                <span className="chip">Reception · desk</span>
              </div>
            </div>
            <div className="sec glass rv rv-d1">
              <h3>Automatic backups</h3>
              <p>Every night at 2 AM, your entire clinic is safely copied across Indian data centres.</p>
              <div className="backup-line">
                <i />
                <s />
                <span>Clinic</span>
                <s />
                <i />
                <s />
                <span>Mumbai DC</span>
                <s />
                <i />
                <s />
                <span>Hyderabad DC</span>
                <s />
                <i />
              </div>
            </div>
            <div className="sec glass rv rv-d2">
              <h3>Compliance, handled</h3>
              <p>DPDP Act ready. ABDM-compatible. Audits are a formality, not a fire drill.</p>
              <div className="role-chips">
                <span className="chip">DPDP-ready</span>
                <span className="chip">ABDM-compatible</span>
                <span className="chip">Audit logs · 100%</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FINALE */}
      <section id="finale">
        <div className="wrap">
          <span className="eyebrow rv" style={{ justifyContent: "center" }}>
            Start growing
          </span>
          <h2 className="rv rv-d1" style={{ marginTop: 26 }}>
            You heal patients.
            <br />
            <em>We grow your practice.</em>
          </h2>
          <div className="fin-logo rv rv-d2">
            Clinic<span>OS</span>
          </div>
          <div className="fin-tag rv rv-d3">India&apos;s First AI-Powered Clinic Growth Operating System</div>
          <div className="hero-ctas rv rv-d4">
            <button type="button" className="btn btn-primary magnetic" onClick={openDemo(setDemoOpen)}>
              Book a Live Demo <span className="btn-arrow">→</span>
            </button>
            <Link href="/login" className="btn btn-ghost magnetic">
              Sign In to Your Clinic
            </Link>
          </div>
        </div>
        <footer className="footer">
          <span>© 2026 ClinicOS · Made in India 🇮🇳</span>
          <span>
            <Link href="/privacy">Privacy</Link>
            <Link href="/terms">Terms</Link>
            <Link href="/register">Register Clinic</Link>
          </span>
        </footer>
      </section>

      <BookDemoModal open={demoOpen} onClose={() => setDemoOpen(false)} />
    </div>
  );
}
