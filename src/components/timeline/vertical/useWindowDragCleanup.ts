import { useEffect } from 'react';

export function useWindowDragCleanup(onCleanup: () => void): void {
  useEffect(() => {
    window.addEventListener('dragend', onCleanup);
    window.addEventListener('drop', onCleanup);

    return () => {
      window.removeEventListener('dragend', onCleanup);
      window.removeEventListener('drop', onCleanup);
    };
  }, [onCleanup]);
}
