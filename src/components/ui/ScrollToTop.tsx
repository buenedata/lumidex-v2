'use client';

import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface ScrollToTopProps {
  /** Scroll position threshold to show the button (default: 300) */
  threshold?: number;
  /** Smooth scroll behavior duration (default: 800ms) */
  duration?: number;
  /** Additional CSS classes */
  className?: string;
}

export const ScrollToTop: React.FC<ScrollToTopProps> = ({
  threshold = 300,
  duration = 800,
  className
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isScrolling, setIsScrolling] = useState(false);

  // Handle scroll position detection
  useEffect(() => {
    const toggleVisibility = () => {
      if (window.pageYOffset > threshold) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener('scroll', toggleVisibility);
    return () => window.removeEventListener('scroll', toggleVisibility);
  }, [threshold]);

  // Smooth scroll to top function
  const scrollToTop = () => {
    if (isScrolling) return; // Prevent multiple clicks during scroll
    
    setIsScrolling(true);
    const startPosition = window.pageYOffset;
    const startTime = performance.now();

    const easeOutCubic = (t: number): number => {
      return 1 - Math.pow(1 - t, 3);
    };

    const animateScroll = (currentTime: number) => {
      const timeElapsed = currentTime - startTime;
      const progress = Math.min(timeElapsed / duration, 1);
      const ease = easeOutCubic(progress);
      
      window.scrollTo(0, startPosition * (1 - ease));
      
      if (progress < 1) {
        requestAnimationFrame(animateScroll);
      } else {
        setIsScrolling(false);
      }
    };

    requestAnimationFrame(animateScroll);
  };

  return (
    <button
      onClick={scrollToTop}
      disabled={isScrolling}
      className={cn(
        // Base positioning
        'fixed bottom-8 right-8 z-50',
        
        // Button styling - matches Aurora Crimson design
        'w-12 h-12 rounded-full',
        'bg-panel2 border border-border',
        'text-text hover:text-white',
        'shadow-soft hover:shadow-lg',
        
        // Focus states
        'focus:outline-none focus:ring-2 focus:ring-brand2/50',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand2/50',
        
        // Hover effects
        'hover:bg-panel hover:border-brand2/50',
        'hover:transform hover:-translate-y-1',
        
        // Transitions
        'transition-all duration-300 ease-out',
        
        // Visibility animation
        isVisible 
          ? 'opacity-100 translate-y-0 pointer-events-auto' 
          : 'opacity-0 translate-y-4 pointer-events-none',
        
        // Loading state
        isScrolling && 'opacity-75 cursor-not-allowed',
        
        className
      )}
      aria-label="Scroll to top"
      title="Scroll to top"
    >
      {isScrolling ? (
        // Loading spinner during scroll
        <svg
          className="w-5 h-5 animate-spin mx-auto"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      ) : (
        // Arrow up icon
        <svg
          className="w-5 h-5 mx-auto"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M5 10l7-7m0 0l7 7m-7-7v18"
          />
        </svg>
      )}
    </button>
  );
};

export default ScrollToTop;