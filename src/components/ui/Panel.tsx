import React from 'react';
import { cn } from '@/lib/utils';

export interface PanelProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'interactive' | 'elevated';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

export const Panel = React.forwardRef<HTMLDivElement, PanelProps>(
  ({ className, variant = 'default', padding = 'md', children, ...props }, ref) => {
    const baseClasses = 'panel';
    
    const variantClasses = {
      default: '',
      interactive: 'panel-hover cursor-pointer',
      elevated: 'shadow-lg',
    };
    
    const paddingClasses = {
      none: '',
      sm: 'p-3',
      md: 'p-4',
      lg: 'p-6',
    };

    return (
      <div
        className={cn(
          baseClasses,
          variantClasses[variant],
          paddingClasses[padding],
          className
        )}
        ref={ref}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Panel.displayName = 'Panel';

export interface CardPanelProps extends PanelProps {
  header?: React.ReactNode;
  footer?: React.ReactNode;
}

export const CardPanel = React.forwardRef<HTMLDivElement, CardPanelProps>(
  ({ header, footer, children, padding = 'none', className, ...props }, ref) => {
    return (
      <Panel
        ref={ref}
        padding={padding}
        className={cn('overflow-hidden', className)}
        {...props}
      >
        {header && (
          <div className="px-4 py-3 border-b border-border">
            {header}
          </div>
        )}
        <div className="p-4">
          {children}
        </div>
        {footer && (
          <div className="px-4 py-3 border-t border-border" style={{ backgroundColor: 'rgba(30, 34, 54, 0.5)' }}>
            {footer}
          </div>
        )}
      </Panel>
    );
  }
);

CardPanel.displayName = 'CardPanel';

export interface StatPanelProps extends Omit<PanelProps, 'children'> {
  label: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  children?: React.ReactNode;
}

export const StatPanel = React.forwardRef<HTMLDivElement, StatPanelProps>(
  ({
    label,
    value,
    subtitle,
    icon,
    trend,
    trendValue,
    className,
    children,
    ...props
  }, ref) => {
    const trendColors = {
      up: 'text-success',
      down: 'text-danger',
      neutral: 'text-muted',
    };

    return (
      <Panel
        ref={ref}
        className={cn('stat-tile', className)}
        {...props}
      >
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-muted">{label}</p>
            <p className="text-2xl font-bold text-text mt-1">{value}</p>
            {subtitle && (
              <p className="text-sm text-muted mt-1">{subtitle}</p>
            )}
          </div>
          {icon && (
            <div className="text-brand opacity-20">
              {icon}
            </div>
          )}
        </div>
        
        {trend && trendValue && (
          <div className="flex items-center mt-4">
            <span className={cn('text-sm font-medium', trendColors[trend])}>
              {trend === 'up' && '↗'}
              {trend === 'down' && '↘'}
              {trend === 'neutral' && '→'}
              {trendValue}
            </span>
          </div>
        )}
      </Panel>
    );
  }
);

StatPanel.displayName = 'StatPanel';

export interface EmptyPanelProps extends PanelProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export const EmptyPanel = React.forwardRef<HTMLDivElement, EmptyPanelProps>(
  ({ icon, title, description, action, className, ...props }, ref) => {
    return (
      <Panel
        ref={ref}
        className={cn('empty-state', className)}
        {...props}
      >
        {icon && (
          <div className="empty-state-icon">
            {icon}
          </div>
        )}
        <h3 className="text-lg font-medium text-text mb-2">{title}</h3>
        {description && (
          <p className="text-muted mb-6">{description}</p>
        )}
        {action && action}
      </Panel>
    );
  }
);

EmptyPanel.displayName = 'EmptyPanel';