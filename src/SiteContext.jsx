import { createContext, useContext } from 'react';

export const SiteContext = createContext(null);

export function useSite() {
  const ctx = useContext(SiteContext);
  if (!ctx) throw new Error('useSite must be used inside <SiteContext.Provider>');
  return ctx;
}