import { useEffect, useRef, useState } from "react";
import { BidCelebration } from "./BidCelebration";
import { BidTakenToast } from "../data/useBidTakenToasts";

type Props = {
  toasts: BidTakenToast[];
  onDismiss: (id: string) => void;
};

/**
 * Shows one full-screen bid-taken celebration at a time. If several takes
 * arrive in the same refresh, they queue up FIFO so each driver gets their
 * own moment.
 */
export function CelebrationStack({ toasts, onDismiss }: Props) {
  const [current, setCurrent] = useState<BidTakenToast | null>(null);
  const seenIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (current) return;
    const next = toasts.find((t) => !seenIds.current.has(t.id));
    if (next) {
      seenIds.current.add(next.id);
      setCurrent(next);
    }
  }, [toasts, current]);

  if (!current) return null;

  return (
    <BidCelebration
      celeb={current}
      variant={current.variant}
      onDone={() => {
        const id = current.id;
        setCurrent(null);
        onDismiss(id);
      }}
    />
  );
}
