import { useSyncExternalStore } from "react";
import { subscribe } from "../data/store";

/**
 * Re-render on any store change. The selector recomputes from localStorage each
 * time, which is cheap at this data scale and keeps a single source of truth.
 */
export function useStore<T>(selector: () => T): T {
  return useSyncExternalStore(subscribe, selector, selector);
}
