import {
  CircleCheck,
  CircleDashed,
  OctagonX,
  TriangleAlert,
} from "lucide-react";
import type { LightState } from "@/lib/light/light";
import { cn } from "@/lib/utils";

/**
 * Colour is never the only channel (D7 design constraints): every state has
 * its own icon shape and a text label next to it.
 */
const ICONS = {
  green: CircleCheck,
  yellow: TriangleAlert,
  red: OctagonX,
  unknown: CircleDashed,
} as const;

export const STATE_TEXT: Record<LightState, string> = {
  green: "text-signal-green",
  yellow: "text-signal-yellow",
  red: "text-signal-red",
  unknown: "text-signal-unknown",
};

export const STATE_SURFACE: Record<LightState, string> = {
  green: "border-signal-green-border bg-signal-green-tint",
  yellow: "border-signal-yellow-border bg-signal-yellow-tint",
  red: "border-signal-red-border bg-signal-red-tint",
  unknown: "border-signal-unknown-border bg-signal-unknown-tint",
};

export function SignalIcon({
  state,
  className,
}: {
  state: LightState;
  className?: string;
}) {
  const Icon = ICONS[state];
  return (
    <Icon
      aria-hidden
      className={cn("size-4 shrink-0", STATE_TEXT[state], className)}
    />
  );
}
