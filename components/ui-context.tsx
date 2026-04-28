"use client";
import { createContext, useContext, useState } from "react";

type UICtxType = {
  splitSlug: string | null;
  setSplitSlug: (v: string | null) => void;
};

const UICtx = createContext<UICtxType>({
  splitSlug: null,
  setSplitSlug: () => {},
});

export function UIProvider({ children }: { children: React.ReactNode }) {
  const [splitSlug, setSplitSlug] = useState<string | null>(null);
  return (
    <UICtx.Provider value={{ splitSlug, setSplitSlug }}>
      {children}
    </UICtx.Provider>
  );
}

export function useUI() { return useContext(UICtx); }
