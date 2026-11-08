// Chart motion, shared by the four chart components. Recharts draws the series on mount at the
// reveal duration; the optimal band fades in first. Every prop below is the reduced-motion path:
// draw disabled, band rendered statically. Only presets durations/eases are used.
import type { ReactElement } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { duration, ease } from "../../motion/presets";

/** Line/bar draw length in ms, from the reveal token (640). Recharts takes ms. */
export const DRAW_MS = duration.reveal * 1000;

interface BandRectProps {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  clipPath?: string;
}

/** "Ver tabla" swap: chart and table crossfade in place (state). Reduced: opacity 120 ms. */
export function useChartSwap() {
  const reduce = useReducedMotion();
  return {
    initial: { opacity: 0 },
    animate: {
      opacity: 1,
      transition: { duration: reduce ? duration.micro : duration.state, ease: ease.out },
    },
    exit: {
      opacity: 0,
      transition: {
        duration: reduce ? duration.micro : duration.state * 0.6,
        ease: ease.in,
      },
    },
  };
}

export function useChartMotion() {
  const reduce = useReducedMotion();

  return {
    reduce,
    /** Props shared by Line / Area / Bar: draw on mount, ease-out, no draw under reduced motion. */
    draw: {
      isAnimationActive: !reduce,
      animationDuration: DRAW_MS,
      animationEasing: "ease-out" as const,
    },
    /**
     * ReferenceArea has no animation of its own, so it renders through `shape`: a plain rect
     * under reduced motion, a rect that fades in (state, 220 ms) otherwise.
     */
    bandShape: (props: BandRectProps): ReactElement<SVGElement> => {
      const rect = {
        x: props.x,
        y: props.y,
        width: props.width,
        height: props.height,
        clipPath: props.clipPath,
        fill: "var(--chart-band-optimo)",
        fillOpacity: 0.5,
      };
      if (reduce) return <rect {...rect} /> as ReactElement<SVGElement>;
      return (
        <motion.rect
          {...rect}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: duration.state, ease: ease.out }}
        />
      ) as ReactElement<SVGElement>;
    },
  };
}
