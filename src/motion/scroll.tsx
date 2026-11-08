/**
 * Scroll layer: Lenis smooth scroll synced to GSAP ScrollTrigger, plus the editorial
 * scroll hooks (masked line reveal, parallax, generic scrub, batched card reveal).
 *
 * One provider is mounted once from App.tsx. Every hook below reads its easing and
 * durations from tokens.css through the CSS variables, so no curve is invented here.
 * Reduced motion: no Lenis, no scrub, no hidden content; everything renders visible.
 */
import {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { CustomEase } from "gsap/CustomEase";
import Lenis from "lenis";
import { useReducedMotion } from "framer-motion";

gsap.registerPlugin(ScrollTrigger, CustomEase);

/** The slice of the router the provider needs: it only subscribes to location changes. */
export interface RouteSource {
  subscribe: (
    listener: (state: { location: { pathname: string } }) => void,
  ) => () => void;
}

const SmoothScrollContext = createContext<Lenis | null>(null);

/** The Lenis instance, or null under reduced motion / before mount. */
export function useSmoothScroll(): Lenis | null {
  return useContext(SmoothScrollContext);
}

/** Reads a duration token (`--dur-reveal: 640ms`) in seconds for GSAP. */
function durationToken(name: string, fallback: number): number {
  if (typeof window === "undefined") return fallback;
  const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  if (raw === "") return fallback;
  const value = Number.parseFloat(raw);
  if (!Number.isFinite(value)) return fallback;
  return raw.endsWith("ms") ? value / 1000 : value;
}

const easeCache = new Map<string, gsap.EaseFunction>();

/** Builds a GSAP CustomEase from the tokens' easing curve, so the curve stays in tokens.css. */
function easeToken(name: string, fallback: string): gsap.EaseFunction | string {
  if (typeof window === "undefined") return fallback;
  const cached = easeCache.get(name);
  if (cached) return cached;
  const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const points = raw
    .match(/\(([^)]+)\)/)?.[1]
    .split(",")
    .map((value) => Number.parseFloat(value.trim()));
  if (!points || points.length !== 4 || points.some((value) => !Number.isFinite(value))) {
    return fallback;
  }
  const ease = CustomEase.create(
    name.replace(/^--/, ""),
    `M0,0 C${points[0]},${points[1]} ${points[2]},${points[3]} 1,1`,
  );
  easeCache.set(name, ease);
  return ease;
}

export function ScrollProvider({ router, children }: { router?: RouteSource; children: ReactNode }) {
  const reduce = useReducedMotion() === true;
  const [lenis, setLenis] = useState<Lenis | null>(null);
  const lastPath = useRef<string | null>(null);

  useEffect(() => {
    if (reduce) return undefined;
    const root = document.documentElement;
    const instance = new Lenis({ lerp: 0.09, smoothWheel: true, wheelMultiplier: 0.9 });
    root.classList.add("has-smooth-scroll");
    setLenis(instance);

    const onScroll = (): void => {
      ScrollTrigger.update();
    };
    const raf = (time: number): void => {
      instance.raf(time * 1000);
    };

    instance.on("scroll", onScroll);
    gsap.ticker.add(raf);
    gsap.ticker.lagSmoothing(0);

    const refresh = (): void => {
      ScrollTrigger.refresh();
    };
    void document.fonts?.ready.then(refresh);
    window.addEventListener("load", refresh);

    lastPath.current = window.location.pathname;
    let timer = 0;
    const unsubscribe = router?.subscribe((state) => {
      const path = state.location.pathname;
      if (path === lastPath.current) return;
      lastPath.current = path;
      requestAnimationFrame(() => {
        instance.scrollTo(0, { immediate: true });
        ScrollTrigger.refresh();
      });
      window.clearTimeout(timer);
      timer = window.setTimeout(refresh, 480);
    });

    refresh();
    const settle = [
      window.setTimeout(refresh, 700),
      window.setTimeout(refresh, 1800),
    ];

    return () => {
      window.clearTimeout(timer);
      settle.forEach((id) => {
        window.clearTimeout(id);
      });
      unsubscribe?.();
      window.removeEventListener("load", refresh);
      instance.off("scroll", onScroll);
      gsap.ticker.remove(raf);
      instance.destroy();
      root.classList.remove("has-smooth-scroll");
      setLenis(null);
    };
  }, [reduce, router]);

  return <SmoothScrollContext.Provider value={lenis}>{children}</SmoothScrollContext.Provider>;
}

/** Media query as reactive state (desktop pin only >= 1024px). */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() =>
    typeof window === "undefined" ? false : window.matchMedia(query).matches,
  );

  useEffect(() => {
    const list = window.matchMedia(query);
    const sync = (): void => {
      setMatches(list.matches);
    };
    sync();
    list.addEventListener("change", sync);
    return () => {
      list.removeEventListener("change", sync);
    };
  }, [query]);

  return matches;
}

export interface RevealOptions {
  /** Elements inside the returned ref that rise out of their mask. Defaults to `[data-reveal-line]`. */
  selector?: string;
  start?: string;
  /** Seconds between lines. */
  stagger?: number;
}

/**
 * Masked line reveal for headings. Lines start one mask-height below and glide up
 * with the patient ease the first time the block enters the viewport.
 */
export function useReveal<T extends HTMLElement = HTMLDivElement>(options: RevealOptions = {}) {
  const reduce = useReducedMotion() === true;
  const { selector = "[data-reveal-line]", start = "top 88%", stagger = 0.08 } = options;
  const ref = useRef<T>(null);

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element || reduce) return undefined;
    const duration = durationToken("--dur-reveal", 0.64) * 1.35;
    const ease = easeToken("--ease-patient", "expo.out");

    const context = gsap.context(() => {
      const found = Array.from(element.querySelectorAll<HTMLElement>(selector));
      const lines = found.length > 0 ? found : [element];
      gsap.set(lines, { yPercent: 112, opacity: 0 });
      const show = (): void => {
        gsap.to(lines, {
          yPercent: 0,
          opacity: 1,
          duration,
          ease,
          stagger,
          overwrite: true,
          clearProps: "transform,opacity",
        });
      };
      ScrollTrigger.create({ trigger: element, start, once: true, onEnter: show });
      if (element.getBoundingClientRect().top < window.innerHeight * 0.92) show();
    }, element);

    return () => {
      context.revert();
    };
  }, [reduce, selector, start, stagger]);

  return ref;
}

export interface ParallaxOptions {
  /** Total travel in percent of the element height, split around zero. */
  distance?: number;
  start?: string;
  end?: string;
  /** Re-create when the element mounts after async data. */
  deps?: ReadonlyArray<unknown>;
}

/** Slow depth on a hero heading. Disabled under reduced motion and below 768px. */
export function useParallax<T extends HTMLElement = HTMLDivElement>(options: ParallaxOptions = {}) {
  const reduce = useReducedMotion() === true;
  const { distance = 8, start = "top bottom", end = "bottom top", deps = [] } = options;
  const ref = useRef<T>(null);

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element || reduce) return undefined;
    if (!window.matchMedia("(min-width: 768px)").matches) return undefined;

    const context = gsap.context(() => {
      gsap.fromTo(
        element,
        { yPercent: 0 },
        {
          yPercent: distance,
          ease: "none",
          scrollTrigger: { trigger: element, start, end, scrub: true },
        },
      );
    }, element);

    return () => {
      context.revert();
    };
    // deps lets the caller re-run once an async header mounts the element.
  }, [reduce, distance, start, end, ...deps]);

  return ref;
}

export interface ScrubOptions {
  /** Element that moves; defaults to the trigger element returned by the hook. */
  target?: RefObject<HTMLElement | null>;
  from?: gsap.TweenVars;
  to: gsap.TweenVars;
  start?: string;
  end?: string | (() => string);
  scrub?: boolean | number;
  pin?: boolean;
  pinSpacing?: boolean;
  /** Turn the whole thing off (mobile, reduced motion, no travel). */
  enabled?: boolean;
  /** Re-create the scrub when these values change (data arrives, breakpoint flips). */
  deps?: ReadonlyArray<unknown>;
}

/** Generic scroll-linked tween: parallax, pinned tracks, any scrub moment. */
export function useScrub<T extends HTMLElement = HTMLDivElement>(options: ScrubOptions) {
  const reduce = useReducedMotion() === true;
  const { enabled = true, deps = [] } = options;
  const latest = useRef(options);
  latest.current = options;
  const ref = useRef<T>(null);

  useLayoutEffect(() => {
    const trigger = ref.current;
    const current = latest.current;
    const moving = current.target?.current ?? trigger;
    if (!trigger || !moving || reduce || !current.enabled) return undefined;

    const context = gsap.context(() => {
      gsap.fromTo(moving, current.from ?? {}, {
        ...current.to,
        ease: "none",
        scrollTrigger: {
          trigger,
          start: current.start,
          end: current.end,
          scrub: current.scrub,
          pin: current.pin,
          pinSpacing: current.pinSpacing ?? true,
          invalidateOnRefresh: true,
          anticipatePin: 1,
        },
      });
    }, trigger);

    return () => {
      context.revert();
    };
    // deps is an explicit caller-provided list for when the scrub must be rebuilt.
  }, [reduce, enabled, ...deps]);

  return ref;
}

export interface BatchRevealOptions {
  selector?: string;
  start?: string;
  stagger?: number;
  /** Re-scan when data arrives (pass the item count). */
  deps?: ReadonlyArray<unknown>;
}

/**
 * Cards enter in one coordinated batch per ScrollTrigger group. Items only animate
 * once they are about to enter, so nothing is hidden if the trigger never fires.
 */
export function useBatchReveal<T extends HTMLElement = HTMLDivElement>(options: BatchRevealOptions = {}) {
  const reduce = useReducedMotion() === true;
  const { selector = "[data-reveal-item]", start = "top 92%", stagger = 0.08, deps = [] } = options;
  const ref = useRef<T>(null);
  const seen = useRef(new WeakSet<HTMLElement>());

  useLayoutEffect(() => {
    const root = ref.current;
    if (!root || reduce) return undefined;
    const duration = durationToken("--dur-panel", 0.42) * 1.6;
    const ease = easeToken("--ease-patient", "expo.out");
    const items = Array.from(root.querySelectorAll<HTMLElement>(selector)).filter(
      (item) => !seen.current.has(item),
    );
    if (items.length === 0) return undefined;

    const context = gsap.context(() => {
      const show = (batch: Element[]): void => {
        batch.forEach((item) => seen.current.add(item as HTMLElement));
        gsap.fromTo(
          batch,
          { opacity: 0, y: 24 },
          {
            opacity: 1,
            y: 0,
            duration,
            ease,
            stagger,
            overwrite: true,
            clearProps: "transform,opacity",
          },
        );
      };

      const limit = window.innerHeight * 0.98;
      const visible = items.filter((item) => item.getBoundingClientRect().top < limit);
      const pending = items.filter((item) => !visible.includes(item));
      if (visible.length > 0) show(visible);
      if (pending.length > 0) {
        ScrollTrigger.batch(pending, {
          start,
          once: true,
          onEnter: (batch) => show(batch),
        });
      }
    }, root);

    return () => {
      context.revert();
    };
    // deps lets the caller rescan after async data mounts new cards.
  }, [reduce, selector, start, stagger, ...deps]);

  return ref;
}
