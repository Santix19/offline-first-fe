import { useEffect, useRef } from "react";
import * as THREE from "three";
import { ORB_FRAG, ORB_VERT } from "./shaders";

export function PondOrb() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return undefined;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let renderer: THREE.WebGLRenderer | null = null;
    try {
      renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    } catch {
      return undefined;
    }
    if (!renderer) return undefined;
    const r = renderer;
    const SIZE = 320;
    r.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    r.setSize(SIZE, SIZE, false);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 20);
    camera.position.set(0, 0, 5.4);
    camera.lookAt(0, 0, 0);

    const uniforms = { uTime: { value: 0 } };
    const material = new THREE.ShaderMaterial({
      vertexShader: ORB_VERT,
      fragmentShader: ORB_FRAG,
      uniforms,
    });
    const group = new THREE.Group();
    const mesh = new THREE.Mesh(new THREE.IcosahedronGeometry(1.15, 24), material);
    group.add(mesh);
    scene.add(group);

    const tilt = { x: 0, y: 0 };
    const onPointer = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      tilt.y = (event.clientX - cx) / window.innerWidth;
      tilt.x = (event.clientY - cy) / window.innerHeight;
    };
    window.addEventListener("pointermove", onPointer, { passive: true });

    let raf = 0;
    let running = true;
    const render = (time: number) => {
      uniforms.uTime.value = time / 1000;
      group.rotation.x += ((tilt.x * 0.7 - group.rotation.x) * 0.05 + 0.0016);
      group.rotation.y += (tilt.y * 0.9 - group.rotation.y) * 0.05 + 0.0028;
      r.render(scene, camera);
    };

    if (reduce) {
      render(12000);
      return () => {
        window.removeEventListener("pointermove", onPointer);
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
      mesh.geometry.dispose();
      material.dispose();
      r.dispose();
    };
  }, []);

  return (
    <canvas
      ref={ref}
      aria-hidden="true"
      data-testid="pond-orb"
      width={320}
      height={320}
      className="pointer-events-none mx-auto block size-80 max-w-full"
    />
  );
}
