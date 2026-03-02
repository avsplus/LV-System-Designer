import { useEffect } from 'react';

/**
 * Sets iOS viewport meta tags for proper mobile rendering
 * This component should be rendered once in the app root
 */
export function setupMobileViewport() {
  if (typeof document !== 'undefined') {
    // Ensure viewport meta tag exists
    let viewportMeta = document.querySelector('meta[name="viewport"]');
    if (!viewportMeta) {
      viewportMeta = document.createElement('meta');
      viewportMeta.name = 'viewport';
      document.head.appendChild(viewportMeta);
    }
    
    viewportMeta.content = 
      'width=device-width, initial-scale=1.0, viewport-fit=cover, user-scalable=no, shrink-to-fit=no';

    // Set status bar appearance for iOS
    let statusBarMeta = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]');
    if (!statusBarMeta) {
      statusBarMeta = document.createElement('meta');
      statusBarMeta.name = 'apple-mobile-web-app-status-bar-style';
      document.head.appendChild(statusBarMeta);
    }
    statusBarMeta.content = 'black-translucent';
  }
}

// Component version for use in app
export default function MobileViewportSetup() {
  useEffect(() => {
    setupMobileViewport();
  }, []);

  return null;
}