"use client";

import { useEffect } from "react";
import femaleHero from "@/app/assets/female_hero.png";

const HERO_SOURCES = [femaleHero.src];

export function useLandingEffects() {
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("in");
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -6% 0px" },
    );
    document.querySelectorAll(".landing .reveal").forEach((el) => io.observe(el));
    if (reduced) document.querySelectorAll(".landing .reveal").forEach((el) => el.classList.add("in"));

    const heroImg = document.querySelector<HTMLElement>(".landing .hero-img");
    const heroBottom = document.querySelector<HTMLElement>(".landing .hero-bottom");
    const heroStatTabs = document.querySelector<HTMLElement>(".landing .hero-stat-tabs");

    if (!reduced) {
      let ticking = false;
      const onScroll = () => {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(() => {
          const y = window.scrollY;
          const h = window.innerHeight;
          if (y < h * 1.2) {
            if (heroImg) heroImg.style.transform = `translateY(${y * 0.22}px) scale(${1 + Math.min(y / h, 0.5) * 0.04})`;
            if (heroBottom) {
              heroBottom.style.transform = `translateY(${y * -0.06}px)`;
              heroBottom.style.opacity = String(1 - Math.min(y / (h * 0.9), 1) * 0.9);
            }
            if (heroStatTabs) {
              heroStatTabs.style.transform = `translateY(${y * -0.12}px)`;
              heroStatTabs.style.opacity = String(1 - Math.min(y / (h * 0.85), 1) * 0.9);
            }
          }
          ticking = false;
        });
      };
      window.addEventListener("scroll", onScroll, { passive: true });
    }

    function animateCount(el: HTMLElement) {
      const to = parseFloat(el.dataset.to ?? "0");
      const decimals = parseInt(el.dataset.decimals ?? "0", 10);
      const comma = el.dataset.format === "comma";
      const dur = 1600;
      const start = performance.now();
      function frame(now: number) {
        const p = Math.min((now - start) / dur, 1);
        const eased = 1 - (1 - p) ** 4;
        let val = (to * eased).toFixed(decimals);
        if (comma) val = Number(val).toLocaleString("en-IN");
        el.textContent = val;
        if (p < 1) requestAnimationFrame(frame);
      }
      requestAnimationFrame(frame);
    }

    const counterIO = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (!e.isIntersecting) return;
          const el = e.target as HTMLElement;
          if (reduced) {
            const to = parseFloat(el.dataset.to ?? "0");
            const d = parseInt(el.dataset.decimals ?? "0", 10);
            el.textContent =
              el.dataset.format === "comma" ? Number(to).toLocaleString("en-IN") : to.toFixed(d);
          } else {
            animateCount(el);
          }
          counterIO.unobserve(el);
        });
      },
      { threshold: 0.6 },
    );
    document.querySelectorAll(".landing .count").forEach((el) => counterIO.observe(el));

    const heroPhoto = document.getElementById("heroPhoto") as HTMLImageElement | null;
    let heroIdx = 0;
    const heroFallback = () => {
      if (!heroPhoto) return;
      heroIdx += 1;
      if (heroIdx < HERO_SOURCES.length) {
        heroPhoto.src = HERO_SOURCES[heroIdx];
      } else {
        heroPhoto.style.display = "none";
        const wrap = heroPhoto.closest(".hero-img") as HTMLElement | null;
        if (wrap) wrap.style.background = "radial-gradient(120% 90% at 60% 30%, #16224e, #060B1C 70%)";
      }
    };
    heroPhoto?.addEventListener("error", heroFallback);

    const timelineSteps = document.querySelectorAll(".landing .timeline-step");
    const timelineIO = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("is-active");
            timelineIO.unobserve(e.target);
          }
        });
      },
      { threshold: 0.4 },
    );
    timelineSteps.forEach((el) => timelineIO.observe(el));
    if (reduced) timelineSteps.forEach((el) => el.classList.add("is-active"));

    return () => {
      counterIO.disconnect();
      io.disconnect();
      timelineIO.disconnect();
      heroPhoto?.removeEventListener("error", heroFallback);
    };
  }, []);
}
