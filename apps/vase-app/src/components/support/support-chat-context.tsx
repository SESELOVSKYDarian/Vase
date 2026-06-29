"use client";

import { createContext, useContext, useMemo, useState, type PropsWithChildren } from "react";

type SupportChatContextValue = {
  isOpen: boolean;
  openSupportChat: () => void;
  closeSupportChat: () => void;
};

const SupportChatContext = createContext<SupportChatContextValue | null>(null);

export function SupportChatProvider({ children }: PropsWithChildren) {
  const [isOpen, setIsOpen] = useState(false);

  const value = useMemo<SupportChatContextValue>(
    () => ({
      isOpen,
      openSupportChat: () => setIsOpen(true),
      closeSupportChat: () => setIsOpen(false),
    }),
    [isOpen],
  );

  return <SupportChatContext.Provider value={value}>{children}</SupportChatContext.Provider>;
}

export function useSupportChat() {
  const context = useContext(SupportChatContext);

  if (!context) {
    throw new Error("useSupportChat must be used within SupportChatProvider");
  }

  return context;
}

