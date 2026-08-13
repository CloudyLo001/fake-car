import * as THREE from "three";
import { CUSTOMIZER_PAINTS, CUSTOMIZER_WHEELS, ERAS } from "../brand/brand";
import type { CarFleet } from "../scene/CarFleet";
import type { Stage } from "../scene/Stage";
import type { ScrollTimeline } from "../scroll/ScrollTimeline";

/**
 * All user interactions: drag-rotate, door/hood hotspots + buttons, exploded
 * view with callouts, compare mode, and the 2026 customizer. State ownership:
 * CarFleet owns car state; this module owns UI state and mode transitions.
 */
export function wireInteractions(stage: Stage, fleet: CarFleet, timeline: ScrollTimeline) {
  const canvas = stage.renderer.domElement;
  let compareOpen = false;

  let lastActive = -2;
  timeline.onChange((s) => {
    if (s.activeIndex !== lastActive) {
      lastActive = s.activeIndex;
      // cars auto-close when scrolled away; keep the buttons honest
      document.querySelectorAll<HTMLButtonElement>(".tool-btn").forEach((b) => {
        if (b.dataset.action === "doors") {
          b.classList.remove("is-on");
          b.textContent = "Open doors";
        } else if (b.dataset.action === "explode") {
          b.classList.remove("is-on");
        }
      });
      setCallouts(null);
    }
    stage.eraFloat = compareOpen ? stage.eraFloat : s.eraFloat;
    stage.handoffT = s.handoffT;
    fleet.setReveal(s.revealT);
    fleet.setIntro(s.introT);

    // The aerial ring reveal — the one big camera move, used at both ends of
    // the page: the hero opens on it and scrolls down onto the first car, and
    // the finale rises back to it. Pull up and back until the whole plate
    // (center at z = -6) is in frame.
    if (!compareOpen) {
      const t = s.revealT;
      stage.revealT = t;
      stage.camOffset.set(t * -1.2, t * 13.5, t * 7.5);
      stage.targetOffset.set(0, t * -0.55, t * -6.0);
    }
  });

  // ---------- drag rotate ----------
  let dragging = false;
  let lastX = 0;
  let moved = 0;
  canvas.style.touchAction = "pan-y";
  canvas.addEventListener("pointerdown", (e) => {
    dragging = true;
    moved = 0;
    lastX = e.clientX;
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    const dx = e.clientX - lastX;
    lastX = e.clientX;
    moved += Math.abs(dx);
    fleet.yaw += dx * 0.006;
    fleet.yawVelocity = dx * 0.35;
  });
  const endDrag = () => (dragging = false);
  canvas.addEventListener("pointerup", endDrag);
  canvas.addEventListener("pointercancel", endDrag);

  // ---------- tool buttons ----------
  const buttons = document.querySelectorAll<HTMLButtonElement>(".tool-btn");
  buttons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const era = btn.dataset.era!;
      const action = btn.dataset.action!;
      if (action === "doors") {
        const on = fleet.toggleDoors(era);
        btn.classList.toggle("is-on", on);
        btn.textContent = on ? "Close doors" : "Open doors";
      } else if (action === "explode") {
        const on = !btn.classList.contains("is-on");
        fleet.setExplode(era, on);
        btn.classList.toggle("is-on", on);
        setCallouts(on ? era : null);
      } else if (action === "compare") {
        openCompare(era);
      }
    });
  });

  // door/hood control lives in the chapter toolbar only — no 3D hotspots
  const overlay = document.getElementById("overlay")!;
  const project = new THREE.Vector3();

  // ---------- explode callouts ----------
  const calloutDefs: { part: "hood" | "doorL" | "doorR"; label: string }[] = [
    { part: "hood", label: "Hood — pressed steel" },
    { part: "doorL", label: "Door, left" },
    { part: "doorR", label: "Door, right" },
  ];
  const callouts = calloutDefs.map((def) => {
    const el = document.createElement("span");
    el.className = "callout is-hidden";
    el.textContent = def.label;
    overlay.appendChild(el);
    return { ...def, el };
  });
  let calloutEra: string | null = null;
  const setCallouts = (era: string | null) => (calloutEra = era);

  stage.onUpdate(() => {
    callouts.forEach(({ el, part }) => {
      if (!calloutEra || fleet.isPlaceholder(calloutEra) ||
        !fleet.partWorldPosition(calloutEra, part, project)) {
        el.classList.add("is-hidden");
        return;
      }
      project.project(stage.camera);
      el.classList.remove("is-hidden");
      el.style.left = `${((project.x + 1) / 2) * window.innerWidth + 12}px`;
      el.style.top = `${((1 - project.y) / 2) * window.innerHeight}px`;
    });
  });

  // ---------- compare mode ----------
  const panel = document.createElement("div");
  panel.className = "compare-panel";
  panel.innerHTML = `
    <div class="compare-panel__bar">
      <select id="cmp-a" aria-label="First generation"></select>
      <span style="font-family:var(--mono);font-size:10px;opacity:.6">VS</span>
      <select id="cmp-b" aria-label="Second generation"></select>
      <button class="tool-btn" id="cmp-close">Close</button>
    </div>
    <div class="compare-card compare-card--a" id="cmp-card-a"></div>
    <div class="compare-card compare-card--b" id="cmp-card-b"></div>
  `;
  document.body.appendChild(panel);
  const selA = panel.querySelector<HTMLSelectElement>("#cmp-a")!;
  const selB = panel.querySelector<HTMLSelectElement>("#cmp-b")!;
  const options = ERAS.map((e, i) => `<option value="${i}">${e.year} ${e.model}</option>`).join("");
  selA.innerHTML = options;
  selB.innerHTML = options;

  const card = (el: HTMLElement, i: number) => {
    const e = ERAS[i];
    el.innerHTML = `
      <p class="year">${e.year}</p>
      <h3>${e.model}</h3>
      <ul>${e.specs.map((s) => `<li><span class="label">${s.label}</span><span>${s.value}</span></li>`).join("")}</ul>
    `;
  };

  const applyCompare = () => {
    const a = Number(selA.value);
    const b = Number(selB.value);
    fleet.setCompare([ERAS[a].key, ERAS[b].key]);
    card(panel.querySelector("#cmp-card-a")!, a);
    card(panel.querySelector("#cmp-card-b")!, b);
    // frontal two-shot framing
    stage.camOffset.set(-2.1, 0.45, 3.4);
    stage.targetOffset.set(-0.6, 0, -0.4);
  };

  const openCompare = (fromEra: string) => {
    compareOpen = true;
    const i = ERAS.findIndex((e) => e.key === fromEra);
    selA.value = String(i);
    selB.value = String(i === ERAS.length - 1 ? 0 : i + 1);
    panel.classList.add("is-open");
    document.body.classList.add("is-locked");
    applyCompare();
  };

  const closeCompare = () => {
    compareOpen = false;
    panel.classList.remove("is-open");
    document.body.classList.remove("is-locked");
    fleet.setCompare(null);
    stage.camOffset.set(0, 0, 0);
    stage.targetOffset.set(0, 0, 0);
  };

  selA.addEventListener("change", applyCompare);
  selB.addEventListener("change", applyCompare);
  panel.querySelector("#cmp-close")!.addEventListener("click", closeCompare);
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && compareOpen) closeCompare();
  });

  // ---------- customizer (2026) ----------
  const paintRow = document.getElementById("paint-row");
  const wheelRow = document.getElementById("wheel-row");
  if (paintRow && wheelRow) {
    const swatch = (hex: string, name: string, active: boolean) => {
      const b = document.createElement("button");
      b.className = `swatch${active ? " is-active" : ""}`;
      b.style.background = hex;
      b.setAttribute("role", "radio");
      b.setAttribute("aria-checked", String(active));
      b.setAttribute("aria-label", name);
      b.title = name;
      return b;
    };
    const nameEl = document.createElement("span");
    nameEl.className = "swatch-name";
    nameEl.textContent = CUSTOMIZER_PAINTS[0].name;

    CUSTOMIZER_PAINTS.forEach((p, i) => {
      const b = swatch(p.hex, p.name, i === 0);
      b.addEventListener("click", () => {
        fleet.setPaint(p.hex);
        nameEl.textContent = p.name;
        paintRow.querySelectorAll(".swatch").forEach((s) => {
          s.classList.remove("is-active");
          s.setAttribute("aria-checked", "false");
        });
        b.classList.add("is-active");
        b.setAttribute("aria-checked", "true");
      });
      paintRow.appendChild(b);
    });
    paintRow.appendChild(nameEl);

    CUSTOMIZER_WHEELS.forEach((w, i) => {
      const b = swatch(w.hex, w.name, i === 0);
      b.addEventListener("click", () => {
        fleet.setWheelFinish(w.hex);
        wheelRow.querySelectorAll(".swatch").forEach((s) => {
          s.classList.remove("is-active");
          s.setAttribute("aria-checked", "false");
        });
        b.classList.add("is-active");
        b.setAttribute("aria-checked", "true");
      });
      wheelRow.appendChild(b);
    });
  }
}
