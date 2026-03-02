import { useState, useEffect } from 'react';

/**
 * Hook to detect media query matches
 * Useful for responsive behavior in components
 */
export function useMediaQuery(query) {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia(query);
    
    // Set initial value
    setMatches(mediaQuery.matches);

    // Create listener
    const handleChange = (e) => setMatches(e.matches);
    
    // Use addEventListener for better compatibility
    mediaQuery.addEventListener('change', handleChange);
    
    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, [query]);

  return matches;
}