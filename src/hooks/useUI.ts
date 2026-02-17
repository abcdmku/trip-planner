import { useContext } from 'react';
import { UIContext, type UIContextValue } from '../contexts/UIContext';

export function useUI(): UIContextValue {
  const ctx = useContext(UIContext);
  if (!ctx) {
    throw new Error('useUI must be used within a UIProvider');
  }
  return ctx;
}
