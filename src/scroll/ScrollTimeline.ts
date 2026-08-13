import { ERAS } from "../brand/brand";

/**
 * One scroll timeline drives everything: continuous eraFloat for the WebGL
 * stage, per-chapter layer opacity/blur (the Kage pin-then-blur handoff),
 * active-section state for reveals, and finale progress.
 *
 * Chapter anatomy: local progress 0..HOLD_END is the "hold" (car fully this
 * era), HOLD_END..1 is the "handoff" scrub into the next era.
 */
const HOLD_END = 0.58;

/**
 * Fraction of the hero's scroll span over which the opening aerial shot
 * settles into the first car's framing. Ends before the hero does, so the
 * 1948 chapter arrives with the camera already at rest.
 */
const INTRO_END = 0.8;

export interface TimelineState {
  eraFloat: number;
  handoffT: number;
  activeIndex: number; // -1 hero, 0..5 eras, 6 finale
  heroT: number;
  finaleT: number;
  /** 1 = opening aerial shot, 0 = settled on the first car */
  introT: number;
  /** aerial ring framing amount — the intro and the finale share it */
  revealT: number;
}

export class ScrollTimeline {
  readonly state: TimelineState = {
    eraFloat: 0, handoffT: 0, activeIndex: -1, heroT: 0, finaleT: 0,
    introT: 1, revealT: 1,
  };
  private hero!: HTMLElement;
  private chapters: HTMLElement[] = [];
  private finale!: HTMLElement;
  private reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  private listeners = new Set<(s: TimelineState) => void>();
  private ticking = false;

  attach() {
    this.hero = document.getElementById("ch-hero")!;
    this.chapters = ERAS.map((e) => document.getElementById(`ch-${e.key}`)!);
    this.finale = document.getElementById("ch-finale")!;
    window.addEventListener("scroll", () => this.requestTick(), { passive: true });
    window.addEventListener("resize", () => this.requestTick());
    // safety net for browsers that throttle or suppress scroll events
    let lastY = -1;
    setInterval(() => {
      if (window.scrollY !== lastY) {
        lastY = window.scrollY;
        this.requestTick();
      }
    }, 150);
    this.requestTick();
  }

  onChange(fn: (s: TimelineState) => void) {
    this.listeners.add(fn);
  }

  /**
   * Push current state to every listener, synchronously. `attach()` measures
   * before anything subscribes, so boot must call this once everything is
   * wired — otherwise listeners sit on stale defaults until the first scroll,
   * which left the opening aerial shot unapplied on a fresh load at the top.
   */
  refresh() {
    this.measure();
  }

  /** scroll so a given era chapter's hold zone is active */
  scrollToEra(index: number) {
    const el = this.chapters[index];
    if (!el) return;
    const y = el.offsetTop + (el.offsetHeight - window.innerHeight) * 0.25;
    window.scrollTo({ top: y, behavior: this.reduced ? "auto" : "smooth" });
  }

  private requestTick() {
    if (this.ticking) return;
    this.ticking = true;
    let done = false;
    const run = () => {
      if (done) return;
      done = true;
      this.ticking = false;
      this.measure();
    };
    requestAnimationFrame(run);
    // rAF is paused in hidden/background tabs — keep state honest anyway
    setTimeout(run, 120);
  }

  /** local progress of a pinned section: 0 when pin starts, 1 when it ends */
  private progressOf(el: HTMLElement) {
    const span = el.offsetHeight - window.innerHeight;
    if (span <= 0) return 0;
    const p = (window.scrollY - el.offsetTop) / span;
    return Math.min(1, Math.max(0, p));
  }

  private inView(el: HTMLElement) {
    const top = el.offsetTop;
    return window.scrollY >= top - window.innerHeight && window.scrollY <= top + el.offsetHeight;
  }

  private measure() {
    const s = this.state;
    s.heroT = this.progressOf(this.hero);

    let eraFloat = 0;
    let handoffT = 0;
    let active = -1;

    this.chapters.forEach((el, i) => {
      const p = this.progressOf(el);
      const started = window.scrollY >= el.offsetTop - window.innerHeight * 0.4;
      if (started) active = i;
      if (p <= 0) return;
      if (p <= HOLD_END) {
        eraFloat = i;
        handoffT = 0;
      } else {
        const t = (p - HOLD_END) / (1 - HOLD_END);
        handoffT = i < this.chapters.length - 1 ? t : 0;
        eraFloat = i + (i < this.chapters.length - 1 ? this.ease(t) : 0);
      }

      // layer pin/blur handoff (Kage signature)
      const pin = el.querySelector<HTMLElement>(".chapter__pin");
      if (pin) {
        const fadeIn = Math.min(1, p / 0.1);
        const fadeOut = p > HOLD_END ? 1 - (p - HOLD_END) / (1 - HOLD_END) : 1;
        const o = this.reduced ? 1 : Math.min(fadeIn, Math.max(0, fadeOut));
        pin.style.setProperty("--layer-opacity", o.toFixed(3));
        pin.style.setProperty("--layer-blur", this.reduced ? "0px" : `${((1 - o) * 14).toFixed(1)}px`);
        pin.classList.toggle("is-active", p > 0.02 && p < 0.985);
      }
    });

    // hero shows era 0 forming
    if (active === -1) {
      eraFloat = 0;
      const heroPin = this.hero.querySelector<HTMLElement>(".chapter__pin");
      heroPin?.classList.add("is-active");
      if (heroPin && !this.reduced) {
        const o = 1 - Math.min(1, s.heroT / 0.85);
        heroPin.style.setProperty("--layer-opacity", o.toFixed(3));
        heroPin.style.setProperty("--layer-blur", `${((1 - o) * 10).toFixed(1)}px`);
      }
    }

    // finale
    const fT = this.progressOf(this.finale);
    if (this.inView(this.finale) && fT > 0) {
      active = ERAS.length;
      s.finaleT = this.ease(Math.min(1, fT / 0.7));
      const pin = this.finale.querySelector<HTMLElement>(".chapter__pin");
      pin?.classList.add("is-active");
    } else {
      s.finaleT = 0;
    }

    if (this.reduced) {
      eraFloat = Math.round(eraFloat);
      handoffT = 0;
    }

    // The page opens on the aerial ring — the whole plate, all six cars —
    // and scrolling the hero away lowers the camera onto the first car.
    // Reduced motion skips the move and starts settled.
    s.introT = this.reduced ? 0 : 1 - this.ease(Math.min(1, s.heroT / INTRO_END));
    s.revealT = Math.max(s.introT, s.finaleT);

    s.eraFloat = eraFloat;
    s.handoffT = handoffT;
    s.activeIndex = active;
    this.listeners.forEach((fn) => fn(s));
  }

  private ease(t: number) {
    return t * t * (3 - 2 * t);
  }
}
