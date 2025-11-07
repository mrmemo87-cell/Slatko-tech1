import React, { useEffect } from 'react';

interface MobileBottomNavProps {
  currentView: string;
  onNavigate: (view: string) => void;
  isDarkMode: boolean;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({ currentView, onNavigate, isDarkMode }) => {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', emoji: '📊' },
    { id: 'deliveries', label: 'Orders', emoji: '📦' },
    { id: 'production', label: 'Production', emoji: '🍰' },
    { id: 'materials', label: 'Materials', emoji: '📋' },
    { id: 'more', label: 'More', emoji: '⋯' },
  ];

  return (
    <nav className={`mobile-bottom-nav ${isDarkMode ? 'dark' : ''}`}>
      {navItems.map((item) => (
        <button
          key={item.id}
          onClick={() => onNavigate(item.id)}
          className={`mobile-nav-btn ${currentView === item.id ? 'active' : ''}`}
        >
          <span className="text-lg">{item.emoji}</span>
          <span className="mobile-nav-label">{item.label}</span>
        </button>
      ))}
    </nav>
  );
};

// Inject mobile bottom nav into the app
export const injectMobileBottomNav = (currentView: string, onNavigate: (view: string) => void, isDarkMode: boolean) => {
  if (typeof window === 'undefined') return;

  // Only on mobile
  if (window.innerWidth >= 768) return;

  // Create container if it doesn't exist
  let container = document.getElementById('mobile-bottom-nav-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'mobile-bottom-nav-container';
    document.body.appendChild(container);
  }

  // Render the nav using React Portal would be ideal, but for now just show raw HTML
  container.innerHTML = `
    <nav class="mobile-bottom-nav ${isDarkMode ? 'dark' : ''}">
      <button class="mobile-nav-btn ${currentView === 'dashboard' ? 'active' : ''}" data-view="dashboard">
        <span style="font-size: 24px;">📊</span>
        <span class="mobile-nav-label">Dashboard</span>
      </button>
      <button class="mobile-nav-btn ${currentView === 'deliveries' ? 'active' : ''}" data-view="deliveries">
        <span style="font-size: 24px;">📦</span>
        <span class="mobile-nav-label">Orders</span>
      </button>
      <button class="mobile-nav-btn ${currentView === 'production' ? 'active' : ''}" data-view="production">
        <span style="font-size: 24px;">🍰</span>
        <span class="mobile-nav-label">Production</span>
      </button>
      <button class="mobile-nav-btn ${currentView === 'materials' ? 'active' : ''}" data-view="materials">
        <span style="font-size: 24px;">📋</span>
        <span class="mobile-nav-label">Materials</span>
      </button>
      <button class="mobile-nav-btn ${currentView === 'more' ? 'active' : ''}" data-view="more">
        <span style="font-size: 24px;">⋯</span>
        <span class="mobile-nav-label">More</span>
      </button>
    </nav>
  `;

  // Add click handlers
  container.querySelectorAll('[data-view]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const view = (btn as HTMLElement).getAttribute('data-view');
      if (view) onNavigate(view);
    });
  });
};