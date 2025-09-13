'use client';

import React, { useState } from 'react';
import { cn } from '@/lib/utils';

export interface Tab {
  id: string;
  label: string;
  icon?: React.ReactNode;
  badge?: string | number;
  content: React.ReactNode;
}

export interface TabsProps {
  tabs: Tab[];
  defaultTab?: string;
  className?: string;
  variant?: 'default' | 'pills' | 'underline';
  size?: 'sm' | 'md' | 'lg';
  onChange?: (tabId: string) => void;
}

export function Tabs({ 
  tabs, 
  defaultTab, 
  className, 
  variant = 'default',
  size = 'md',
  onChange 
}: TabsProps) {
  const [activeTab, setActiveTab] = useState(defaultTab || tabs[0]?.id);

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    onChange?.(tabId);
  };

  const activeTabContent = tabs.find(tab => tab.id === activeTab)?.content;

  const sizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg'
  };

  const variantClasses = {
    default: {
      container: 'border-b border-border',
      tab: 'px-4 py-2 font-medium transition-colors border-b-2 border-transparent',
      active: 'border-brand text-brand',
      inactive: 'text-muted hover:text-text hover:border-border'
    },
    pills: {
      container: 'p-1 bg-panel2 rounded-lg',
      tab: 'px-4 py-2 font-medium transition-all rounded-md',
      active: 'bg-brand text-white shadow-sm',
      inactive: 'text-muted hover:text-text hover:bg-panel'
    },
    underline: {
      container: 'border-b border-border',
      tab: 'px-3 py-2 font-medium transition-colors relative',
      active: 'text-brand after:content-[""] after:absolute after:bottom-[-1px] after:left-0 after:right-0 after:h-0.5 after:bg-brand',
      inactive: 'text-muted hover:text-text'
    }
  };

  const classes = variantClasses[variant];

  return (
    <div className={cn('w-full', className)}>
      {/* Tab Headers */}
      <div className={cn('flex justify-center', classes.container)}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleTabChange(tab.id)}
            className={cn(
              classes.tab,
              sizeClasses[size],
              activeTab === tab.id ? classes.active : classes.inactive,
              'flex items-center space-x-2 relative'
            )}
          >
            {tab.icon && (
              <span className="flex-shrink-0">
                {tab.icon}
              </span>
            )}
            <span>{tab.label}</span>
            {tab.badge && (
              <span className={cn(
                'flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 rounded-full text-xs font-medium',
                activeTab === tab.id
                  ? 'bg-white text-brand'
                  : 'bg-brand text-white'
              )}>
                {typeof tab.badge === 'number' && tab.badge > 99 ? '99+' : tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {activeTabContent}
      </div>
    </div>
  );
}

// Alternative simplified tab component for basic use cases
export interface SimpleTabsProps {
  children: React.ReactElement<SimpleTabPanelProps>[];
  defaultIndex?: number;
  className?: string;
  onChange?: (index: number) => void;
}

export interface SimpleTabPanelProps {
  label: string;
  icon?: React.ReactNode;
  badge?: string | number;
  children: React.ReactNode;
}

export function SimpleTabPanel({ children }: SimpleTabPanelProps) {
  return <>{children}</>;
}

export function SimpleTabs({ children, defaultIndex = 0, className, onChange }: SimpleTabsProps) {
  const [activeIndex, setActiveIndex] = useState(defaultIndex);

  const handleTabChange = (index: number) => {
    setActiveIndex(index);
    onChange?.(index);
  };

  const tabs = React.Children.toArray(children) as React.ReactElement<SimpleTabPanelProps>[];

  return (
    <div className={cn('w-full', className)}>
      {/* Tab Headers */}
      <div className="flex justify-center border-b border-border">
        {tabs.map((tab, index) => (
          <button
            key={index}
            onClick={() => handleTabChange(index)}
            className={cn(
              'px-4 py-2 font-medium transition-colors border-b-2 border-transparent flex items-center space-x-2',
              activeIndex === index 
                ? 'border-brand text-brand' 
                : 'text-muted hover:text-text hover:border-border'
            )}
          >
            {tab.props.icon && (
              <span className="flex-shrink-0">
                {tab.props.icon}
              </span>
            )}
            <span>{tab.props.label}</span>
            {tab.props.badge && (
              <span className={cn(
                'flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 rounded-full text-xs font-medium',
                activeIndex === index 
                  ? 'bg-brand text-white' 
                  : 'bg-panel2 text-muted'
              )}>
                {typeof tab.props.badge === 'number' && tab.props.badge > 99 ? '99+' : tab.props.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {tabs[activeIndex]?.props.children}
      </div>
    </div>
  );
}