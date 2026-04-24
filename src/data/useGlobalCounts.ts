// Thin re-export so existing callers keep working; numbers now come straight
// from the baked roster module so they're synchronous and always populated.

import { HEADLINE_COUNTS } from "./roster";

export type HubBidCounts = {
  total: number;
  taken: number;
  available: number;
};

export type HubOnCallCounts = {
  total: number;
  filled: number;
};

export type GlobalCounts = {
  toledoBids: HubBidCounts;
  nblohBids: HubBidCounts;
  onCallToledo: HubOnCallCounts;
  onCallNbloh: HubOnCallCounts;
  ready: boolean;
};

export function useGlobalCounts(): GlobalCounts {
  return {
    toledoBids: HEADLINE_COUNTS.toledo,
    nblohBids: HEADLINE_COUNTS.nbloh,
    onCallToledo: HEADLINE_COUNTS.onCallToledo,
    onCallNbloh: HEADLINE_COUNTS.onCallNbloh,
    ready: true,
  };
}
