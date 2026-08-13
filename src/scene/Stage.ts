import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import type { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";
import { createGradePass } from "./GradePass";
import { Studio } from "./Studio";
import { sampleGrade } from "./EraGrades";

export type StageUpdate = (dt: number, elapsed: number) => void;

/**
 * Single owner of renderer, scene, camera, composer, resize, and the frame
 * loop. Everything else registers an update callback.
 */
export class Stage {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene: THREE.Scene;
  readonly camera: THREE.PerspectiveCamera;
  readonly studio: Studio;

  /** continuous era position 0..5 driven by scroll */
  eraFloat = 0;
  /** 0..1 within the current handoff zone */
  handoffT = 0;
  /**
   * 0..1 aerial ring reveal — lifts ambient so the whole plate reads. Driven
   * by both the hero intro and the closing lineage shot.
   */
  revealT = 0;

  private composer: EffectComposer;
  private bloom: UnrealBloomPass;
  private grade: ShaderPass;
  private clock = new THREE.Clock();
  private updates = new Set<StageUpdate>();
  private raf = 0;

  /** camera rig: base framing + small drift; interactions add offsets */
  readonly camBase = new THREE.Vector3(3.55, 1.45, 4.85);
  readonly camTarget = new THREE.Vector3(0, 0.65, 0);
  camOffset = new THREE.Vector3();
  targetOffset = new THREE.Vector3();
  private fog: THREE.FogExp2;

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: "high-performance",
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    // the studio is lit for deep, saturated color — not a white showroom
    this.renderer.toneMappingExposure = 0.62;

    this.scene = new THREE.Scene();
    this.fog = new THREE.FogExp2(0x181510, 0.05);
    this.scene.fog = this.fog;

    this.camera = new THREE.PerspectiveCamera(34, 1, 0.1, 200);
    this.camera.position.copy(this.camBase);
    this.camera.lookAt(this.camTarget);

    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();

    this.studio = new Studio();
    this.scene.add(this.studio.group);

    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    // high threshold: only genuine light sources bloom, never lit surfaces
    this.bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.2, 0.35, 0.96);
    this.composer.addPass(this.bloom);
    this.grade = createGradePass();
    this.composer.addPass(this.grade);
    this.composer.addPass(new OutputPass());

    this.resize();
    window.addEventListener("resize", () => this.resize());
  }

  onUpdate(fn: StageUpdate) {
    this.updates.add(fn);
    return () => this.updates.delete(fn);
  }

  start() {
    this.clock.start();
    const loop = () => {
      this.raf = requestAnimationFrame(loop);
      // self-heal if the window was 0-sized or resized without an event
      const w = window.innerWidth;
      const h = window.innerHeight;
      if (w > 0 && h > 0) {
        const size = this.renderer.getSize(new THREE.Vector2());
        if (size.x !== w || size.y !== h) this.resize();
      }
      const dt = Math.min(this.clock.getDelta(), 0.1);
      const elapsed = this.clock.elapsedTime;

      const g = sampleGrade(this.eraFloat);
      g.ambient += this.revealT * 0.22;
      g.fogDensity *= 1 - this.revealT * 0.8;
      this.studio.applyGrade(g);
      this.fog.color.copy(g.fog);
      this.fog.density = g.fogDensity;
      this.scene.environmentIntensity = g.envIntensity + this.revealT * 0.25;
      this.bloom.strength = g.bloom;
      const u = this.grade.uniforms as Record<string, THREE.IUniform>;
      (u.tint.value as THREE.Color).copy(g.tint);
      u.tintAmount.value = g.tintAmount;
      u.mono.value = g.mono;
      u.saturation.value = g.saturation;
      u.grain.value = g.grain;
      u.vignette.value = g.vignette;
      u.time.value = elapsed;

      this.updates.forEach((fn) => fn(dt, elapsed));

      // camera rig: base + per-era micro drift + interaction offsets
      const drift = 0.06;
      this.camera.position.set(
        this.camBase.x + Math.sin(this.eraFloat * 1.7) * drift + this.camOffset.x,
        this.camBase.y + Math.cos(this.eraFloat * 1.3) * drift * 0.6 + this.camOffset.y,
        this.camBase.z + this.camOffset.z,
      );
      const t = this.camTarget.clone().add(this.targetOffset);
      this.camera.lookAt(t);

      this.composer.render();
    };
    loop();
  }

  stop() {
    cancelAnimationFrame(this.raf);
  }

  private resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const mobile = w < 900;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, mobile ? 1.5 : 1.75));
    this.renderer.setSize(w, h);
    this.composer.setSize(w, h);
    this.camera.aspect = w / h;
    // keep the car framed on narrow screens
    this.camera.fov = w / h < 0.8 ? 46 : 34;
    this.camera.updateProjectionMatrix();
  }
}
