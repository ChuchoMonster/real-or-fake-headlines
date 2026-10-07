"use client";

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";

export type CollectedReal = {
  id: string;
  headline: string;
  source?: string;
};

type Ctx = {
  reals: CollectedReal[];
  add: (r: CollectedReal) => void;
  clear: () => void;
};

const CollectedRealsContext = createContext<Ctx | null>(null);

const MAX = 30;

export function CollectedRealsProvider({ children }: { children: ReactNode }) {
  const [reals, setReals] = useState<CollectedReal[]>([]);

  const add = useCallback((r: CollectedReal) => {
    setReals((prev) => {
      if (prev.some((x) => x.id === r.id)) return prev;
      return [r, ...prev].slice(0, MAX);
    });
  }, []);

  const clear = useCallback(() => setReals([]), []);

  return (
    <CollectedRealsContext.Provider value={{ reals, add, clear }}>
      {children}
    </CollectedRealsContext.Provider>
  );
}

export function useCollectedReals(): Ctx {
  const ctx = useContext(CollectedRealsContext);
  if (!ctx) {
    throw new Error("useCollectedReals must be used inside <CollectedRealsProvider>");
  }
  return ctx;
}
