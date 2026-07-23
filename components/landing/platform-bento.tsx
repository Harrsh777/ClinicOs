const PLATFORM_FEATURES = [
  {
    span: "b-7",
    tag: "Queue & scheduling",
    title: "Fill more chairs every day",
    description:
      "One queue for walk-ins and online bookings. ClinicOS texts live wait times on WhatsApp and pings patients when to walk in — fewer no-shows, shorter queues, and more consults per doctor.",
    growth: "+28% daily consults",
    visual: "queue",
  },
  {
    span: "b-5",
    tag: "AI follow-ups",
    title: "Bring patients back automatically",
    description:
      "After every visit, ClinicOS sends recalls, medicine reminders, and two-slot booking offers in Hindi, English, or Tamil. Patients reply on WhatsApp — the slot lands on your calendar.",
    growth: "+43% re-bookings",
    visual: "followups",
  },
  {
    span: "b-6",
    tag: "Billing & payments",
    title: "Collect every rupee before they leave",
    description:
      "Generate a GST invoice in two taps, send a UPI or Razorpay link on WhatsApp, and log cash at the desk. Faster collections mean more revenue in the bank — not stuck in pending payments.",
    growth: "2× faster collections",
    visual: "billing",
  },
  {
    span: "b-6",
    tag: "Patient records",
    title: "Free doctors to see more patients",
    description:
      "Dictate consult notes by voice; ClinicOS structures them and prints an e-prescription with your clinic letterhead. Less admin after hours means more patients seen during the day.",
    growth: "6 hrs saved per doctor/week",
    visual: "records",
  },
  {
    span: "b-6",
    tag: "Revenue analytics",
    title: "Know what's growing — and what isn't",
    description:
      "Track collections by Google listing, doctor, treatment, and AI recall — not just a monthly total. Double down on channels that pay and fix the ones that don't.",
    growth: "Live growth insights",
    visual: "analytics",
  },
  {
    span: "b-6",
    tag: "Multi-branch",
    title: "Scale to more branches without chaos",
    description:
      "Compare wait times, collections, and ratings across every location on one screen. Patient history follows them anywhere, and a new price list goes live everywhere in one update.",
    growth: "One login, every branch",
    visual: "branches",
  },
] as const;

function BentoVisual({ type }: { type: (typeof PLATFORM_FEATURES)[number]["visual"] }) {
  switch (type) {
    case "queue":
      return (
        <div className="b-visual">
          <div className="b-visual-chrome">
            <span />
            <span />
            <span />
          </div>
          <div className="b-visual-body">
            <div className="queue-row">
              <span className="av">AR</span>
              <span className="queue-name">Token #12 · Ananya Rao · Consultation</span>
              <span className="st now">In room</span>
            </div>
            <div className="queue-row">
              <span className="av m">VK</span>
              <span className="queue-name">Token #13 · Vikram Khanna · Follow-up</span>
              <span className="st next">Up next · 4 min</span>
            </div>
            <div className="queue-row">
              <span className="av">SM</span>
              <span className="queue-name">Token #14 · Sana Merchant · Walk-in</span>
              <span className="st wait">WhatsApp sent · ETA 20 min</span>
            </div>
          </div>
        </div>
      );
    case "followups":
      return (
        <div className="b-visual">
          <div className="b-visual-chrome">
            <span />
            <span />
            <span />
          </div>
          <div className="b-visual-body">
            <div className="wa-bubble">
              Hi Meera! Dr. Iyer asked for a thyroid review in 2 weeks. Tuesday 11 AM or Thursday 5 PM?
            </div>
            <div className="wa-bubble reply">Thursday 5 PM works</div>
            <div className="wa-time">Appointment #847 booked · calendar updated</div>
          </div>
        </div>
      );
    case "billing":
      return (
        <div className="b-visual">
          <div className="b-visual-chrome">
            <span />
            <span />
            <span />
          </div>
          <div className="b-visual-body">
            <div className="bill-header">
              <span>GST Invoice #INV-2847</span>
              <span className="bill-badge">Paid</span>
            </div>
            <div className="bill-row">
              <span>Consultation · Dr. Sharma</span>
              <b>₹800</b>
            </div>
            <div className="bill-row">
              <span>Lab panel</span>
              <b>₹1,200</b>
            </div>
            <div className="bill-total">
              <span>Total collected</span>
              <b>₹2,000</b>
            </div>
            <div className="bill-action">UPI link sent on WhatsApp · paid in 2 min</div>
          </div>
        </div>
      );
    case "records":
      return (
        <div className="b-visual">
          <div className="b-visual-chrome">
            <span />
            <span />
            <span />
          </div>
          <div className="b-visual-body">
            <div className="rx-header">
              <span>Rajesh Kumar · MRN-4821</span>
              <span className="rx-badge">ABDM linked</span>
            </div>
            <div className="rx-voice">Voice note transcribed · 42 sec</div>
            <div className="rx-line">Chief complaint: elevated fasting glucose</div>
            <div className="rx-line">Rx: Tab. Metformin 500mg · 1-0-1 · 30 days</div>
            <div className="rx-footer">E-prescription ready · clinic letterhead applied</div>
          </div>
        </div>
      );
    case "analytics":
      return (
        <div className="b-visual">
          <div className="b-visual-chrome">
            <span />
            <span />
            <span />
          </div>
          <div className="b-visual-body">
            <div className="rev-line">
              <b>Google &amp; Maps</b>
              <span className="g">₹3.4L · +22%</span>
            </div>
            <div className="rev-line">
              <b>Patient referrals</b>
              <span className="g">₹2.1L · +31%</span>
            </div>
            <div className="rev-line">
              <b>AI re-bookings</b>
              <span className="g">₹1.8L · +43%</span>
            </div>
          </div>
        </div>
      );
    case "branches":
      return (
        <div className="b-visual">
          <div className="b-visual-chrome">
            <span />
            <span />
            <span />
          </div>
          <div className="b-visual-body">
            <div className="branch-row">
              <span>Koramangala</span>
              <span className="branch-meta">12 min wait</span>
              <span className="branch-rev g">₹1.2L</span>
            </div>
            <div className="branch-row">
              <span>Indiranagar</span>
              <span className="branch-meta">8 min wait</span>
              <span className="branch-rev g">₹98K</span>
            </div>
            <div className="branch-row">
              <span>Whitefield</span>
              <span className="branch-meta">18 min wait</span>
              <span className="branch-rev g">₹1.4L</span>
            </div>
          </div>
        </div>
      );
  }
}

export function PlatformBento() {
  return (
    <section className="bento-section" id="platform">
      <div className="wrap">
        <div className="reveal section-intro">
          <div className="eyebrow">How we grow your clinic</div>
          <h2>Six growth levers. One platform that runs them all.</h2>
          <p className="lead">
            ClinicOS doesn&apos;t just manage your clinic — it grows it. From filling empty slots and
            recovering no-shows to bringing patients back automatically, every feature is built to increase
            bookings, collections, and retention.
          </p>
        </div>
        <div className="bento">
          {PLATFORM_FEATURES.map((feature) => (
            <div key={feature.tag} className={`b-card ${feature.span} reveal`}>
              <span className="b-tag">{feature.tag}</span>
              <h3>{feature.title}</h3>
              <p>{feature.description}</p>
              <span className="b-growth">{feature.growth}</span>
              <BentoVisual type={feature.visual} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
