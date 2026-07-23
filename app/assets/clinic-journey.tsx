"use client";

import { useEffect, useMemo, useRef, useState } from "react";

/* ------------------------------------------------------------------ */
/* ClinicJourney — a 500vh pinned, scroll-driven story of one clinic.  */
/* Scroll progress (0..1) drives an SVG scene: patients arrive, the    */
/* phone gets answered by AI, windows light up, the rating climbs and  */
/* a revenue chart grows. Pointer movement adds gentle 3D parallax.    */
/* No dependencies. Respects prefers-reduced-motion.                   */
/* ------------------------------------------------------------------ */

const STAGES = [
  {
    tag: "Day 1",
    title: "Meet Dr. Meera's clinic.",
    body: "A good doctor, an empty waiting room. The phone rings during consultations — and nobody picks up. Patients quietly book somewhere else.",
  },
  {
    tag: "Week 1",
    title: "The AI Receptionist goes live.",
    body: "Every call and WhatsApp message answered in seconds, 24×7, in 10 languages. Missed calls become booked appointments — even at 11 pm.",
  },
  {
    tag: "Month 3",
    title: "Follow-ups bring patients back.",
    body: "Medicine reminders, recall nudges, care check-ins — all automatic. Patients who used to disappear start returning on their own.",
  },
  {
    tag: "Month 6",
    title: "The rating climbs to 4.9★.",
    body: "Happy patients are asked for a review at exactly the right moment. Unhappy ones reach Dr. Meera privately first. Google notices.",
  },
  {
    tag: "Month 12",
    title: "A clinic that runs itself.",
    body: "35% more bookings, chairs full, staff home on time. Dr. Meera checks it all from her phone over morning chai.",
  },
] as const;

const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
/* progress of a sub-window [from, to] within global progress p */
const win = (p: number, from: number, to: number) => clamp((p - from) / (to - from));

function fmtL(n: number) {
  return `₹${n.toFixed(1)}L`;
}

export function ClinicJourney() {
  const trackRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<HTMLDivElement>(null);
  const [p, setP] = useState(0);
  const [reduced, setReduced] = useState(false);

  /* scroll progress */
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onMq = () => setReduced(mq.matches);
    mq.addEventListener?.("change", onMq);

    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const el = trackRef.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const total = rect.height - window.innerHeight;
        setP(clamp(-rect.top / Math.max(1, total)));
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      mq.removeEventListener?.("change", onMq);
      cancelAnimationFrame(raf);
    };
  }, []);

  /* pointer parallax on the scene */
  useEffect(() => {
    if (reduced) return;
    const el = sceneRef.current;
    if (!el) return;
    let raf = 0;
    const onMove = (e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      const r = el.getBoundingClientRect();
      const px = clamp((e.clientX - r.left) / r.width);
      const py = clamp((e.clientY - r.top) / r.height);
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        el.style.setProperty("--prx", `${(0.5 - py) * 6}deg`);
        el.style.setProperty("--pry", `${(px - 0.5) * 8}deg`);
      });
    };
    const onLeave = () => {
      el.style.setProperty("--prx", "0deg");
      el.style.setProperty("--pry", "0deg");
    };
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerleave", onLeave);
    return () => {
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerleave", onLeave);
      cancelAnimationFrame(raf);
    };
  }, [reduced]);

  const stage = Math.min(STAGES.length - 1, Math.floor(p * STAGES.length));

  /* derived scene values */
  const s = useMemo(() => {
    const aiOn = win(p, 0.18, 0.26); // receptionist comes online
    const fill = win(p, 0.2, 0.78); // waiting room fills
    const stars = win(p, 0.55, 0.8); // rating climbs
    const chart = win(p, 0.68, 0.96); // revenue bars grow
    const glowNight = win(p, 0.05, 0.95); // windows light up over the year
    return {
      aiOn,
      stars,
      chart,
      glowNight,
      patients: Math.round(lerp(0, 6, fill)), // chairs occupied (of 6)
      patientsMo: Math.round(lerp(92, 410, win(p, 0.1, 0.95))),
      rating: lerp(3.8, 4.9, stars),
      revenue: lerp(1.2, 4.8, win(p, 0.15, 0.97)),
      ringing: 1 - aiOn,
    };
  }, [p]);

  const bars = [0.28, 0.4, 0.5, 0.62, 0.78, 1];

  return (
    <section className="journey-track" id="journey" ref={trackRef} aria-label="How a clinic grows with ClinicOS">
      <div className="journey-sticky">
        <div className="journey-head">
          <div className="eyebrow">The ClinicOS journey</div>
          <h2>
            Watch a clinic grow. <em>Scroll.</em>
          </h2>
        </div>

        <div className="journey-stage">
          {/* ---------------- SCENE ---------------- */}
          <div className="journey-scene" ref={sceneRef}>
            <div className="journey-scene-3d">
              <svg viewBox="0 0 640 470" className="journey-svg" role="img" aria-hidden="true">
                <defs>
                  <linearGradient id="jSky" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor="#eaf1ff" />
                    <stop offset="1" stopColor="#f7faff" />
                  </linearGradient>
                  <linearGradient id="jGlass" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor="#dfe9ff" />
                    <stop offset="1" stopColor="#c9d9fb" />
                  </linearGradient>
                  <linearGradient id="jBar" x1="0" y1="1" x2="0" y2="0">
                    <stop offset="0" stopColor="#2e63ff" />
                    <stop offset="1" stopColor="#69f0c1" />
                  </linearGradient>
                  <filter id="jSoft" x="-40%" y="-40%" width="180%" height="180%">
                    <feDropShadow dx="0" dy="14" stdDeviation="18" floodColor="#16233f" floodOpacity="0.16" />
                  </filter>
                </defs>

                <rect width="640" height="470" fill="url(#jSky)" rx="28" />

                {/* --- back layer: revenue chart, grows late --- */}
                <g className="jl jl-back" transform="translate(452 96)">
                  <rect x="-16" y="-18" width="176" height="196" rx="16" fill="#ffffff" filter="url(#jSoft)" />
                  <text x="0" y="6" className="jt-label">Revenue</text>
                  <text x="0" y="30" className="jt-strong">{fmtL(s.revenue)}/mo</text>
                  {bars.map((h, i) => {
                    const grow = clamp(s.chart * bars.length - i);
                    return (
                      <rect
                        key={i}
                        x={i * 25}
                        y={160 - 108 * h * grow}
                        width="16"
                        height={108 * h * grow}
                        rx="5"
                        fill="url(#jBar)"
                        opacity={0.35 + 0.65 * grow}
                      />
                    );
                  })}
                </g>

                {/* --- clinic building --- */}
                <g className="jl jl-mid" transform="translate(60 84)">
                  <rect x="0" y="0" width="330" height="300" rx="20" fill="#ffffff" filter="url(#jSoft)" />
                  {/* signboard */}
                  <rect x="24" y="22" width="282" height="46" rx="12" fill="#0f1c36" />
                  <text x="165" y="51" textAnchor="middle" className="jt-sign">
                    Dr. Meera&apos;s Clinic
                  </text>
                  {/* windows light up as the clinic gets busier */}
                  {[0, 1, 2].map((c) =>
                    [0, 1].map((r) => {
                      const idx = r * 3 + c;
                      const lit = clamp(s.glowNight * 6 - idx);
                      return (
                        <rect
                          key={`${c}-${r}`}
                          x={30 + c * 100}
                          y={88 + r * 66}
                          width="76"
                          height="46"
                          rx="9"
                          fill="url(#jGlass)"
                          style={{ filter: lit > 0.5 ? "brightness(1.06)" : "none" }}
                          stroke={lit > 0.01 ? "#69f0c1" : "#d7e2f7"}
                          strokeWidth={1.5 + lit * 1.5}
                          opacity={0.7 + 0.3 * lit}
                        />
                      );
                    }),
                  )}
                  {/* door */}
                  <rect x="140" y="224" width="56" height="76" rx="8" fill="#2e63ff" opacity="0.92" />
                  <circle cx="184" cy="264" r="3.4" fill="#fff" />
                </g>

                {/* --- waiting bench with patients --- */}
                <g className="jl jl-front" transform="translate(64 402)">
                  <rect x="0" y="20" width="330" height="10" rx="5" fill="#dbe5f8" />
                  {Array.from({ length: 6 }).map((_, i) => {
                    const occupied = i < s.patients;
                    return (
                      <g key={i} transform={`translate(${18 + i * 52} 0)`} className={occupied ? "j-pt in" : "j-pt"}>
                        {/* chair */}
                        <rect x="-13" y="8" width="26" height="14" rx="4" fill="#c4d3f2" />
                        {/* patient */}
                        <g opacity={occupied ? 1 : 0}>
                          <circle cx="0" cy="-14" r="7.5" fill={i % 2 ? "#2e63ff" : "#0f1c36"} />
                          <rect x="-9" y="-6" width="18" height="15" rx="7" fill={i % 2 ? "#2e63ff" : "#0f1c36"} />
                        </g>
                      </g>
                    );
                  })}
                </g>

                {/* --- phone: rings unanswered, then AI answers --- */}
                <g className="jl jl-front" transform="translate(452 330)">
                  <rect x="-16" y="-26" width="176" height="106" rx="16" fill="#ffffff" filter="url(#jSoft)" />
                  <g transform="translate(12 12)">
                    <circle r="20" fill={s.aiOn > 0.5 ? "#e8fbf2" : "#feecec"} />
                    <text y="6" textAnchor="middle" fontSize="17">📞</text>
                    {/* ring waves while unanswered */}
                    <g opacity={s.ringing} className="j-ring">
                      <circle r="27" fill="none" stroke="#ef5d5d" strokeWidth="2" />
                      <circle r="34" fill="none" stroke="#ef5d5d" strokeWidth="1.4" opacity="0.5" />
                    </g>
                  </g>
                  <text x="48" y="4" className="jt-label">
                    {s.aiOn > 0.5 ? "AI Receptionist" : "Front desk"}
                  </text>
                  <text x="48" y="27" className="jt-strong" fill={s.aiOn > 0.5 ? "#0f9b6d" : "#d54a4a"}>
                    {s.aiOn > 0.5 ? "Every call answered" : "Missed call…"}
                  </text>
                  <g opacity={s.aiOn}>
                    <text x="48" y="52" className="jt-small">24×7 · 10 languages</text>
                  </g>
                </g>

                {/* --- star meter --- */}
                <g className="jl jl-back" transform="translate(88 26)">
                  <rect x="-20" y="-16" width="240" height="46" rx="23" fill="#ffffff" filter="url(#jSoft)" />
                  <text x="0" y="8" className="jt-strong">{s.rating.toFixed(1)}</text>
                  {[0, 1, 2, 3, 4].map((i) => {
                    const filled = s.rating >= i + 0.8;
                    return (
                      <text key={i} x={44 + i * 24} y={9} fontSize="19" opacity={filled ? 1 : 0.25} fill="#f5b52e">
                        ★
                      </text>
                    );
                  })}
                  <text x="172" y="8" className="jt-small">Google</text>
                </g>

                {/* --- floating whatsapp bubbles once follow-ups start --- */}
                <g opacity={win(p, 0.36, 0.5)}>
                  {[0, 1, 2].map((i) => (
                    <g key={i} className={`j-bubble j-bubble-${i}`} transform={`translate(${404 - i * 34} ${262 - i * 8})`}>
                      <rect x="-30" y="-13" width="60" height="26" rx="13" fill="#dff7ea" stroke="#9fe2c0" />
                      <text y="5" textAnchor="middle" fontSize="11" fill="#0f7a54">
                        {["Reminder ✓", "Recall ✓", "Review ⭐"][i]}
                      </text>
                    </g>
                  ))}
                </g>
              </svg>
            </div>

            {/* live counters under the scene */}
            <div className="journey-meters" aria-live="off">
              <div className="jm">
                <span className="jm-val">{s.patientsMo}</span>
                <span className="jm-label">patients / month</span>
              </div>
              <div className="jm">
                <span className="jm-val">{s.rating.toFixed(1)}★</span>
                <span className="jm-label">Google rating</span>
              </div>
              <div className="jm">
                <span className="jm-val">{fmtL(s.revenue)}</span>
                <span className="jm-label">monthly revenue</span>
              </div>
            </div>
          </div>

          {/* ---------------- NARRATIVE ---------------- */}
          <div className="journey-copy">
            <div className="journey-progress" role="presentation">
              {STAGES.map((st, i) => (
                <span key={st.tag} className={`jp-dot ${i <= stage ? "on" : ""}`} />
              ))}
              <span className="jp-line" style={{ transform: `scaleY(${p})` }} />
            </div>
            <div className="journey-steps">
              {STAGES.map((st, i) => (
                <article key={st.tag} className={`journey-step ${i === stage ? "active" : i < stage ? "past" : ""}`}>
                  <span className="js-tag">{st.tag}</span>
                  <h3>{st.title}</h3>
                  <p>{st.body}</p>
                </article>
              ))}
            </div>
          </div>
        </div>

        <div className="journey-hint" style={{ opacity: p < 0.04 ? 1 : 0 }}>
          Keep scrolling ↓
        </div>
      </div>
    </section>
  );
}
