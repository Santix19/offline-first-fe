import { useEffect, useRef } from "react";
import * as THREE from "three";
import { LIQUID_FRAG, LIQUID_VERT } from "./shaders";

interface LiquidFieldProps {
  intensity?: number;
}

export function LiquidField({ intensity = 0.35 }: LiquidFieldProps) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return undefined;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let renderer: THREE.WebGLRenderer | null = null;
    try {
      renderer = new THREE.WebGLRenderer({ canvas, alpha: false, antialias: false });
    } catch {
      return undefined;
    }
    if (!renderer) return undefined;

    const r = renderer;
    r.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    r.setSize(window.innerWidth, window.innerHeight, false);

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const uniforms = {
      uTime: { value: 0 },
      uPointer: { value: new THREE.Vector2(0, 0) },
      uScroll: { value: 0 },
      uIntensity: { value: intensity },
      uResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
    };
    const material = new THREE.ShaderMaterial({
      vertexShader: LIQUID_VERT,
      fragmentShader: LIQUID_FRAG,
      uniforms,
      depthWrite: false,
      depthTest: false,
    });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
    mesh.frustumCulled = false;
    scene.add(mesh);

    const target = { x: 0, y: 0 };
    const onPointer = (event: PointerEvent) => {
      target.x = (event.clientX / window.innerWidth) * 2 - 1;
      target.y = -((event.clientY / window.innerHeight) * 2 - 1);
    };
    const readScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      uniforms.uScroll.value = max > 0 ? window.scrollY / max : 0;
    };
    const onResize = () => {
      r.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
      r.setSize(window.innerWidth, window.innerHeight, false);
      uniforms.uResolution.value.set(window.innerWidth, window.innerHeight);
      readScroll();
    };

    window.addEventListener("pointermove", onPointer, { passive: true });
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", readScroll, { passive: true });
    readScroll();

    let raf = 0;
    let running = true;
    const render = (time: number) => {
      uniforms.uTime.value = time / 1000;
      const p = uniforms.uPointer.value;
      p.x += (target.x - p.x) * 0.06;
      p.y += (target.y - p.y) * 0.06;
      r.render(scene, camera);
    };

    if (reduce) {
      render(12000);
      const sync = () => readScroll();
      document.addEventListener("visibilitychange", sync);
      return () => {
        document.removeEventListener("visibilitychange", sync);
        window.removeEventListener("pointermove", onPointer);
        window.removeEventListener("resize", onResize);
        window.removeEventListener("scroll", readScroll);
        mesh.geometry.dispose();
        material.dispose();
        r.dispose();
      };
    }

    const loop = (time: number) => {
      if (!running) return;
      raf = requestAnimationFrame(loop);
      if (document.hidden) return;
      render(time);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onPointer);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", readScroll);
      mesh.geometry.dispose();
      material.dispose();
      r.dispose();
    };
  }, [intensity]);

  return (
    <canvas
      ref={ref}
      aria-hidden="true"
      data-testid="liquid-field"
      className="pointer-events-none fixed inset-0 z-0 h-full w-full"
    />
  );
}
