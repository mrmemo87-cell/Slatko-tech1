// Mobile Layout Wrapper for Slatko App
// This wrapper detects mobile screens and optimizes the UI accordingly

import React, { useEffect, useState } from 'react';

interface MobileLayoutWrapperProps {
  children: React.ReactNode;
}

export const MobileLayoutWrapper: React.FC<MobileLayoutWrapperProps> = ({ children }) => {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      
      // Hide sidebar on mobile
      const sidebar = document.querySelector('[class*="glass-sidebar"]') as HTMLElement;
      if (sidebar) {
        if (mobile) {
          sidebar.style.display = 'none';
        } else {
          sidebar.style.display = '';
        }
      }

      // Add padding to main content on mobile
      const main = document.querySelector('main') as HTMLElement;
      if (main && mobile) {
        main.style.paddingBottom = '80px'; // Space for bottom nav
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize(); // Call once on mount

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return <>{children}</>;
};