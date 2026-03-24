import { useEffect } from 'react';

// Dark Matter — permanent dark theme, no toggle
export function useTheme() {
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', 'dark');
  }, []);
}
