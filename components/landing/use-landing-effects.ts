"use client";

import { useEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

const ACCENT_RGB = "22,199,132";
const AI_RGB = "110,198,255";

export function useLandingEffects() {
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const finePointer = window.matchMedia("(pointer: fine)").matches;

    gsap.registerPlugin(ScrollTrigger);

    /* Ripple on buttons */
    const rippleHandler = (e: MouseEvent) => {
      const btn = e.currentTarget as HTMLElement;
      const r = btn.getBoundingClientRect();
      const rip = document.createElement("span");
      rip.className = "ripple";
      const s = Math.max(r.width, r.height);
      rip.style.width = rip.style.height = `${s}px`;
      rip.style.left = `${e.clientX - r.left - s / 2}px`;
      rip.style.top = `${e.clientY - r.top - s / 2}px`;
      btn.appendChild(rip);
      setTimeout(() => rip.remove(), 700);
    };
    document.querySelectorAll(".landing .btn").forEach((btn) => {
      btn.addEventListener("click", rippleHandler as EventListener);
    });

    /* Nav scroll */
    const nav = document.getElementById("landing-nav");
    requestAnimationFrame(() => nav?.classList.add("is-ready"));
    const onScroll = () => nav?.classList.toggle("is-scrolled", window.scrollY > 60);
    window.addEventListener("scroll", onScroll, { passive: true });

    /* Reveal on scroll */
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((en) => {
          if (en.isIntersecting) {
            en.target.classList.add("is-in");
            io.unobserve(en.target);
          }
        });
      },
      { threshold: 0.18, rootMargin: "0px 0px -6% 0px" },
    );
    document.querySelectorAll(".landing .rv").forEach((el) => io.observe(el));
    if (reduced) document.querySelectorAll(".landing .rv").forEach((el) => el.classList.add("is-in"));

    /* Mouse light */
    if (finePointer && !reduced) {
      document.querySelectorAll(".landing .mouselight").forEach((ml) => {
        const scene = ml.parentElement;
        if (!scene) return;
        scene.addEventListener(
          "mousemove",
          (e) => {
            const ev = e as MouseEvent;
            const rect = scene.getBoundingClientRect();
            (ml as HTMLElement).style.setProperty("--mx", `${((ev.clientX - rect.left) / rect.width) * 100}%`);
            (ml as HTMLElement).style.setProperty("--my", `${((ev.clientY - rect.top) / rect.height) * 100}%`);
          },
          { passive: true },
        );
      });
    }

    /* Magnetic buttons */
    if (finePointer && !reduced) {
      document.querySelectorAll(".landing .magnetic").forEach((btn) => {
        btn.addEventListener("mousemove", (e) => {
          const ev = e as MouseEvent;
          const r = (btn as HTMLElement).getBoundingClientRect();
          const x = ev.clientX - r.left - r.width / 2;
          const y = ev.clientY - r.top - r.height / 2;
          (btn as HTMLElement).style.transform = `translate(${x * 0.22}px, ${y * 0.28}px)`;
        });
        btn.addEventListener("mouseleave", () => {
          (btn as HTMLElement).style.transform = "";
        });
      });
    }

    /* Count-up */
    const fmtIN = (n: number) => n.toLocaleString("en-IN");
    function countUp(el: HTMLElement) {
      const target = parseFloat(el.dataset.count ?? "0");
      const dec = parseInt(el.dataset.decimals ?? "0", 10);
      const prefix = el.dataset.prefix ?? "";
      const dur = 1800;
      const t0 = performance.now();
      function tick(t: number) {
        const p = Math.min((t - t0) / dur, 1);
        const e = 1 - (1 - p) ** 4;
        const v = target * e;
        const first = el.childNodes[0];
        if (first?.nodeType === Node.TEXT_NODE) {
          first.nodeValue = prefix + (dec ? v.toFixed(dec) : fmtIN(Math.round(v)));
        }
        if (p < 1) requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
    }
    const ioCount = new IntersectionObserver(
      (entries) => {
        entries.forEach((en) => {
          if (!en.isIntersecting) return;
          const el = en.target as HTMLElement;
          if (reduced) {
            const dec = parseInt(el.dataset.decimals ?? "0", 10);
            const v = parseFloat(el.dataset.count ?? "0");
            const first = el.childNodes[0];
            if (first?.nodeType === Node.TEXT_NODE) {
              first.nodeValue = (el.dataset.prefix ?? "") + (dec ? v.toFixed(dec) : fmtIN(v));
            }
          } else {
            countUp(el);
          }
          ioCount.unobserve(el);
        });
      },
      { threshold: 0.6 },
    );
    document.querySelectorAll(".landing [data-count]").forEach((el) => ioCount.observe(el));

    /* SVG draw */
    const ioDraw = new IntersectionObserver(
      (entries) => {
        entries.forEach((en) => {
          if (!en.isIntersecting) return;
          const svg = en.target as SVGSVGElement;
          svg.querySelectorAll(".draw-path").forEach((p) => {
            const path = p as SVGPathElement;
            const L = path.getTotalLength();
            path.style.strokeDasharray = `${L}`;
            path.style.strokeDashoffset = reduced ? "0" : `${L}`;
            if (!reduced) {
              path.style.transition = "stroke-dashoffset 2.2s cubic-bezier(.16,1,.3,1)";
              requestAnimationFrame(() =>
                requestAnimationFrame(() => {
                  path.style.strokeDashoffset = "0";
                }),
              );
            }
          });
          svg.querySelectorAll(".draw-fill").forEach((f) => {
            const fill = f as SVGElement;
            fill.style.transition = "opacity 1.6s ease 1s";
            requestAnimationFrame(() => {
              fill.style.opacity = "1";
            });
          });
          ioDraw.unobserve(svg);
        });
      },
      { threshold: 0.4 },
    );
    document.querySelectorAll(".landing svg").forEach((s) => {
      if (s.querySelector(".draw-path,.draw-fill")) ioDraw.observe(s);
    });

    /* Hero canvas */
    const heroCanvas = document.getElementById("hero-canvas") as HTMLCanvasElement | null;
    let heroRaf = 0;
    let convergence = 0;
    let burst = 0;
    let HW = 0;
    let HH = 0;
    let mouseX = 0.5;
    let mouseY = 0.5;
    let heroVisible = true;

    if (heroCanvas && !reduced) {
      const hctx = heroCanvas.getContext("2d");
      const particles: Array<{
        x: number;
        y: number;
        vx: number;
        vy: number;
        r: number;
        a: number;
        tw: number;
      }> = [];

      const sizeHero = () => {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        HW = heroCanvas.clientWidth;
        HH = heroCanvas.clientHeight;
        heroCanvas.width = HW * dpr;
        heroCanvas.height = HH * dpr;
        hctx?.setTransform(dpr, 0, 0, dpr, 0, 0);
      };
      sizeHero();
      window.addEventListener("resize", sizeHero);

      const P_COUNT = window.innerWidth < 700 ? 60 : 130;
      for (let i = 0; i < P_COUNT; i++) {
        particles.push({
          x: Math.random(),
          y: Math.random(),
          vx: (Math.random() - 0.5) * 0.0004,
          vy: (Math.random() - 0.5) * 0.0004,
          r: Math.random() * 1.8 + 0.5,
          a: Math.random() * 0.5 + 0.15,
          tw: Math.random() * Math.PI * 2,
        });
      }

      new IntersectionObserver((en) => {
        heroVisible = en[0]?.isIntersecting ?? false;
      }, { threshold: 0 }).observe(heroCanvas);

      if (finePointer) {
        window.addEventListener(
          "mousemove",
          (e) => {
            mouseX = e.clientX / window.innerWidth;
            mouseY = e.clientY / window.innerHeight;
          },
          { passive: true },
        );
      }

      const drawHero = () => {
        heroRaf = requestAnimationFrame(drawHero);
        if (!hctx || !heroVisible) return;
        hctx.clearRect(0, 0, HW, HH);

        const cx = HW / 2;
        const cy = HH / 2;
        const sphereR = Math.min(HW, HH) * 0.18 * (0.4 + convergence * 0.9);

        if (sphereR > 8) {
          const glow = hctx.createRadialGradient(cx, cy, sphereR * 0.2, cx, cy, sphereR * 1.8);
          glow.addColorStop(0, `rgba(${AI_RGB},${0.08 + convergence * 0.06})`);
          glow.addColorStop(0.5, `rgba(${ACCENT_RGB},${0.04 + convergence * 0.04})`);
          glow.addColorStop(1, "transparent");
          hctx.fillStyle = glow;
          hctx.beginPath();
          hctx.arc(cx, cy, sphereR * 1.8, 0, Math.PI * 2);
          hctx.fill();
        }

        for (const p of particles) {
          p.x += p.vx;
          p.y += p.vy;
          p.tw += 0.02;
          if (p.x < 0) p.x = 1;
          if (p.x > 1) p.x = 0;
          if (p.y < 0) p.y = 1;
          if (p.y > 1) p.y = 0;
          const px = p.x * HW + (mouseX - 0.5) * 14 * p.r;
          const py = p.y * HH + (mouseY - 0.5) * 14 * p.r;
          const dx = cx - px;
          const dy = cy - py;
          const pull = convergence * convergence;
          const fx = px + dx * pull * 0.92;
          const fy = py + dy * pull * 0.92;
          const alpha = p.a * (0.35 + 0.25 * Math.sin(p.tw)) * (1 - pull * 0.35);
          const rgb = p.r > 1.2 ? AI_RGB : ACCENT_RGB;
          hctx.beginPath();
          hctx.arc(fx, fy, p.r * (1 + pull * 0.8), 0, Math.PI * 2);
          hctx.fillStyle = `rgba(${rgb},${alpha})`;
          hctx.fill();
        }
        if (burst > 0) {
          hctx.beginPath();
          hctx.arc(cx, cy, burst * Math.max(HW, HH) * 0.35, 0, Math.PI * 2);
          hctx.strokeStyle = `rgba(${AI_RGB},${0.25 * (1 - burst)})`;
          hctx.lineWidth = 1;
          hctx.stroke();
        }
      };
      heroRaf = requestAnimationFrame(drawHero);

      /* Hero intro */
      const hl1 = document.getElementById("hl1");
      const hl2 = document.getElementById("hl2");
      const scrollHint = document.getElementById("scrollHint");
      const heroReveal = document.getElementById("heroReveal");
      const paperField = document.getElementById("paperField");

      if (!reduced) {
        gsap.timeline({ delay: 0.5 })
          .to(hl1, { opacity: 1, duration: 1.6, ease: "power2.out" })
          .to(hl2, { opacity: 1, duration: 1.6, ease: "power2.out" }, "+=0.7")
          .to(scrollHint, { opacity: 1, duration: 1 }, "+=0.4")
          .to("#paperField .paper", { opacity: 1, duration: 1.4, stagger: 0.08, ease: "power2.out" }, "-=1.2");
        gsap.set("#paperField .paper", { opacity: 0 });

        const papers = gsap.utils.toArray<HTMLElement>("#paperField .paper");
        if (paperField && papers.length) {
          const fieldRect = paperField.getBoundingClientRect();
          papers.forEach((p) => {
            const r = p.getBoundingClientRect();
            p.style.left = `${r.left - fieldRect.left}px`;
            p.style.top = `${r.top - fieldRect.top}px`;
            p.style.right = "auto";
          });

          gsap.timeline({
            scrollTrigger: {
              trigger: "#hero",
              start: "top top",
              end: "+=2600",
              scrub: 0.8,
              pin: true,
              anticipatePin: 1,
              onUpdate(self) {
                convergence = gsap.utils.clamp(0, 1, (self.progress - 0.18) / 0.3);
                burst = self.progress > 0.52 ? gsap.utils.clamp(0, 1, (self.progress - 0.52) / 0.2) : 0;
                heroReveal?.classList.toggle("is-live", self.progress > 0.62);
              },
            },
          })
            .to([hl1, hl2, scrollHint], { opacity: 0, y: -40, filter: "blur(8px)", duration: 0.12, stagger: 0.02 }, 0)
            .to(
              papers,
              {
                left: "50%",
                top: "50%",
                xPercent: -50,
                yPercent: -50,
                scale: 0.1,
                opacity: 0,
                rotate: () => gsap.utils.random(-120, 120),
                duration: 0.26,
                stagger: 0.012,
                ease: "power2.in",
              },
              0.1,
            )
            .fromTo("#core", { scale: 0, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.14, ease: "power3.out" }, 0.22)
            .to("#core", { scale: 1.35, duration: 0.1 }, 0.4)
            .to("#core", { scale: 0.12, opacity: 0, duration: 0.1, ease: "power3.in" }, 0.52)
            .to(heroReveal, { opacity: 1, duration: 0.08 }, 0.56)
            .fromTo(
              ".hero-headline-line",
              {
                opacity: 0,
                y: 32,
                filter: "blur(8px)",
              },
              { opacity: 1, y: 0, filter: "blur(0px)", duration: 0.18, stagger: 0.06, ease: "power3.out" },
              0.56,
            )
            .fromTo(
              ".rvh",
              { opacity: 0, y: 44, filter: "blur(6px)" },
              { opacity: 1, y: 0, filter: "blur(0px)", duration: 0.16, stagger: 0.02, ease: "power2.out" },
              0.66,
            )
            .to("#heroFloats", { rotateX: 4, y: 0, duration: 0.2, ease: "power2.out" }, 0.74);
        }
      } else {
        if (hl1) hl1.style.opacity = "1";
        if (hl2) hl2.style.opacity = "1";
        if (scrollHint) scrollHint.style.opacity = "1";
        if (heroReveal) {
          heroReveal.style.opacity = "1";
          heroReveal.classList.add("is-live");
        }
        if (paperField) paperField.style.display = "none";
        if (hl1) hl1.style.display = "none";
        if (hl2) hl2.style.display = "none";
        const dash = document.getElementById("heroFloats");
        if (dash) dash.style.transform = "none";
      }

      if (finePointer && !reduced) {
        document.querySelectorAll("#hero [data-depth]").forEach((el) => {
          /* parallax handled globally below */
        });
      }
    }

    /* Parallax depth */
    if (finePointer && !reduced) {
      const onMove = (e: MouseEvent) => {
        const nx = e.clientX / window.innerWidth - 0.5;
        const ny = e.clientY / window.innerHeight - 0.5;
        document.querySelectorAll("#hero [data-depth]").forEach((el) => {
          const d = parseFloat((el as HTMLElement).dataset.depth ?? "0");
          (el as HTMLElement).style.translate = `${-nx * d * 220}px ${-ny * d * 160}px`;
        });
      };
      window.addEventListener("mousemove", onMove, { passive: true });
    }

    /* Dashboard tilt */
    const dashGroup = document.getElementById("dashGroup");
    if (finePointer && !reduced && dashGroup) {
      const space = dashGroup.parentElement;
      const onDashMove = (e: MouseEvent) => {
        if (!space) return;
        const r = space.getBoundingClientRect();
        const nx = (e.clientX - r.left) / r.width - 0.5;
        const ny = (e.clientY - r.top) / r.height - 0.5;
        dashGroup.style.transform = `rotateY(${nx * 7}deg) rotateX(${-ny * 6}deg)`;
      };
      space?.addEventListener("mousemove", onDashMove, { passive: true });
      space?.addEventListener("mouseleave", () => {
        dashGroup.style.transform = "";
      });
      dashGroup.querySelectorAll(".dcard").forEach((card) => {
        card.addEventListener("mousemove", (e) => {
          const ev = e as MouseEvent;
          const r = (card as HTMLElement).getBoundingClientRect();
          (card as HTMLElement).style.setProperty("--sx", `${((ev.clientX - r.left) / r.width) * 100}%`);
          (card as HTMLElement).style.setProperty("--sy", `${((ev.clientY - r.top) / r.height) * 100}%`);
        }, { passive: true });
      });
    }

    /* Journey horizontal scroll */
    if (!reduced) {
      const track = document.getElementById("journeyTrack");
      const jFill = document.getElementById("jFill");
      const jWalker = document.getElementById("jWalker");
      if (track) {
        const getDist = () => Math.max(0, track.scrollWidth - window.innerWidth + 60);
        gsap.to(track, {
          x: () => -getDist(),
          ease: "none",
          scrollTrigger: {
            trigger: "#journeyPin",
            start: "top top",
            end: () => `+=${getDist() + 400}`,
            scrub: 0.6,
            pin: true,
            anticipatePin: 1,
            invalidateOnRefresh: true,
            onUpdate(self) {
              const pct = `${self.progress * 100}%`;
              if (jFill) jFill.style.width = pct;
              if (jWalker) jWalker.style.left = pct;
            },
          },
        });
      }
    }

    /* AI canvas */
    const aiCanvas = document.getElementById("ai-canvas") as HTMLCanvasElement | null;
    let aiRaf = 0;
    if (aiCanvas && !reduced) {
      const actx = aiCanvas.getContext("2d");
      let AW = 0;
      let AH = 0;
      let aiVisible = false;
      const nodes: Array<{ x: number; y: number; vx: number; vy: number; r: number }> = [];

      const sizeAI = () => {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        AW = aiCanvas.clientWidth;
        AH = aiCanvas.clientHeight;
        aiCanvas.width = AW * dpr;
        aiCanvas.height = AH * dpr;
        actx?.setTransform(dpr, 0, 0, dpr, 0, 0);
      };
      sizeAI();
      window.addEventListener("resize", sizeAI);

      const N_COUNT = window.innerWidth < 700 ? 26 : 54;
      for (let i = 0; i < N_COUNT; i++) {
        nodes.push({
          x: Math.random(),
          y: Math.random(),
          vx: (Math.random() - 0.5) * 0.0007,
          vy: (Math.random() - 0.5) * 0.0007,
          r: Math.random() * 1.6 + 0.8,
        });
      }

      new IntersectionObserver((en) => {
        aiVisible = en[0]?.isIntersecting ?? false;
      }, { threshold: 0 }).observe(aiCanvas);

      const drawAI = () => {
        aiRaf = requestAnimationFrame(drawAI);
        if (!actx || !aiVisible) return;
        actx.clearRect(0, 0, AW, AH);
        for (const n of nodes) {
          n.x += n.vx;
          n.y += n.vy;
          if (n.x < 0 || n.x > 1) n.vx *= -1;
          if (n.y < 0 || n.y > 1) n.vy *= -1;
        }
        for (let i = 0; i < nodes.length; i++) {
          const a = nodes[i];
          for (let j = i + 1; j < nodes.length; j++) {
            const b = nodes[j];
            const dx = (a.x - b.x) * AW;
            const dy = (a.y - b.y) * AH;
            const d2 = dx * dx + dy * dy;
            if (d2 < 150 * 150) {
              const o = (1 - Math.sqrt(d2) / 150) * 0.35;
              actx.beginPath();
              actx.moveTo(a.x * AW, a.y * AH);
              actx.lineTo(b.x * AW, b.y * AH);
              actx.strokeStyle = `rgba(${AI_RGB},${o})`;
              actx.lineWidth = 0.7;
              actx.stroke();
            }
          }
        }
        for (const n of nodes) {
          actx.beginPath();
          actx.arc(n.x * AW, n.y * AH, n.r, 0, Math.PI * 2);
          actx.fillStyle = `rgba(${AI_RGB},.65)`;
          actx.fill();
        }
      };
      aiRaf = requestAnimationFrame(drawAI);
    }

    /* AI messages */
    const aiFeed = document.getElementById("aiFeed");
    const aiMsgs = document.querySelectorAll("#aiFeed .ai-msg");
    if (aiFeed) {
      new IntersectionObserver((en, obs) => {
        if (!en[0]?.isIntersecting) return;
        aiMsgs.forEach((m, i) =>
          setTimeout(() => m.classList.add("is-in"), reduced ? 0 : 400 + i * 750),
        );
        obs.disconnect();
      }, { threshold: 0.35 }).observe(aiFeed);
    }

    /* Map pins */
    const pinsG = document.getElementById("mapPins");
    const mapSvg = document.getElementById("mapSvg");
    if (pinsG && mapSvg) {
      new IntersectionObserver((en, obs) => {
        if (!en[0]?.isIntersecting) return;
        obs.disconnect();
        const spots = [
          [92, 72], [318, 58], [140, 222], [288, 182], [58, 150], [352, 240],
          [236, 96], [172, 120], [330, 132], [120, 60], [262, 246], [76, 246],
        ];
        spots.forEach(([x, y], i) => {
          setTimeout(() => {
            const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
            g.innerHTML = `<circle cx="${x}" cy="${y}" r="4.5" fill="#F5C542" style="transform-origin:${x}px ${y}px; animation:landing-pinpop .6s cubic-bezier(.34,1.56,.64,1) both"/>
              <text x="${x}" y="${y - 9}" text-anchor="middle" font-size="8.5" fill="#E8A317" font-family="IBM Plex Mono">★5.0</text>`;
            pinsG.appendChild(g);
          }, reduced ? 0 : i * 260);
        });
      }, { threshold: 0.4 }).observe(mapSvg);
    }

    /* WhatsApp bubbles */
    const waStream = document.getElementById("waStream");
    const waBubbles = document.querySelectorAll("#waStream .wa-bubble");
    if (waStream) {
      new IntersectionObserver((en, obs) => {
        if (!en[0]?.isIntersecting) return;
        waBubbles.forEach((b, i) =>
          setTimeout(() => b.classList.add("is-in"), reduced ? 0 : i * 420),
        );
        obs.disconnect();
      }, { threshold: 0.25 }).observe(waStream);
    }

    /* Growth score */
    const ARC_LEN = 553;
    const scoreNum = document.getElementById("scoreNum");
    const scoreArc = document.getElementById("scoreArc");
    const scoreGlow = document.getElementById("scoreGlow");
    const smBars = document.querySelectorAll("#scoreMetrics .sm-bar i");
    const smLabels = document.querySelectorAll("#scoreMetrics small b");
    const smStarts = Array.from(smLabels).map((b) => parseInt(b.textContent ?? "0", 10));

    const setScore = (p: number) => {
      const val = Math.round(72 + (96 - 72) * p);
      if (scoreNum) scoreNum.textContent = String(val);
      if (scoreArc) scoreArc.style.strokeDashoffset = String(ARC_LEN * (1 - val / 100));
      if (scoreGlow) scoreGlow.style.opacity = String(0.15 + p * 0.5);
      smBars.forEach((bar, i) => {
        const start = smStarts[i];
        const end = parseInt((bar as HTMLElement).dataset.w ?? "0", 10);
        const v = Math.round(start + (end - start) * p);
        (bar as HTMLElement).style.width = `${v}%`;
        if (smLabels[i]) smLabels[i].textContent = `${v}%`;
      });
    };

    if (!reduced) {
      const st = { p: 0 };
      gsap.to(st, {
        p: 1,
        ease: "none",
        scrollTrigger: {
          trigger: "#scorePin",
          start: "top top",
          end: "+=1400",
          scrub: 0.5,
          pin: true,
          anticipatePin: 1,
        },
        onUpdate: () => setScore(st.p),
      });
      setScore(0);
    } else {
      setScore(1);
    }

    window.addEventListener("load", () => ScrollTrigger.refresh());

    return () => {
      cancelAnimationFrame(heroRaf);
      cancelAnimationFrame(aiRaf);
      window.removeEventListener("scroll", onScroll);
      ScrollTrigger.getAll().forEach((t) => t.kill());
      io.disconnect();
      ioCount.disconnect();
      ioDraw.disconnect();
      document.querySelectorAll(".landing .btn").forEach((btn) => {
        btn.removeEventListener("click", rippleHandler as EventListener);
      });
    };
  }, []);
}
