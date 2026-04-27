"use client";
import { createContext, useContext, useState } from "react";

type UICtxType = {
  sidebarOpen: boolean;
  setSidebarOpen: (v: boolean) => void;
  splitSlug: string | null;
  setSplitSlug: (v: string | null) => void;
};

const UICtx = createContext<UICtxType>({
  sidebarOpen: false,
  setSidebarOpen: () => {},
  splitSlug: null,
  setSplitSlug: () => {},
});

export function UIProvider({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [splitSlug, setSplitSlug]     = useState<string | null>(null);
  return (
    <UICtx.Provider value={{ sidebarOpen, setSidebarOpen, splitSlug, setSplitSlug }}>
      {children}
    </UICtx.Provider>
  );
}

export function useUI() { return useContext(UICtx); }
