import React from 'react';
import Link from 'next/link';
import { Panel } from '@/components/ui/Panel';
import { cn, formatCurrency } from '@/lib/utils';

export interface ActivityItem {
  id: string;
  type: 'card_added' | 'achievement' | 'price_alert' | 'trade' | 'set_completed' | 'goal_reached' | 'market_update';
  title: string;
  description?: string;
  timestamp: Date;
  icon: string;
  value?: number;
  currency?: string;
  metadata?: Record<string, any>;
  href?: string;
}

export interface ActivityFeedProps {
  activities: ActivityItem[];
  maxItems?: number;
  showViewAll?: boolean;
  className?: string;
}

export function ActivityFeed({ 
  activities, 
  maxItems = 6, 
  showViewAll = true, 
  className 
}: ActivityFeedProps) {
  const displayActivities = activities.slice(0, maxItems);

  if (activities.length === 0) {
    return (
      <Panel className={cn('dashboard-widget', className)}>
        <div className="space-y-4">
          <div>
            <h3 className="text-dashboard-title text-text font-semibold">Recent Activity</h3>
            <p className="text-dashboard-caption text-muted mt-1">
              Your latest collection updates
            </p>
          </div>
          
          <div className="empty-state py-8">
            <div className="empty-state-icon">
              <ActivityIcon />
            </div>
            <h4 className="text-lg font-medium text-text mb-2">No activity yet</h4>
            <p className="text-muted mb-4">
              Start building your collection to see your activity here
            </p>
            <Link href="/cards" className="btn btn-primary btn-sm">
              Add Your First Card
            </Link>
          </div>
        </div>
      </Panel>
    );
  }

  return (
    <Panel className={cn('dashboard-widget', className)}>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-dashboard-title text-text font-semibold">Recent Activity</h3>
            <p className="text-dashboard-caption text-muted mt-1">
              Your latest collection updates
            </p>
          </div>
          {showViewAll && activities.length > maxItems && (
            <Link
              href={"/activity" as any}
              className="text-dashboard-caption text-brand2 hover:text-brand transition-colors"
            >
              View All
            </Link>
          )}
        </div>
        
        <div className="space-y-3">
          {displayActivities.map((activity) => (
            <ActivityItem key={activity.id} activity={activity} />
          ))}
        </div>
      </div>
    </Panel>
  );
}

interface ActivityItemProps {
  activity: ActivityItem;
}

function ActivityItem({ activity }: ActivityItemProps) {
  const activityStyles = getActivityStyles(activity.type);
  const timeAgo = formatTimeAgo(activity.timestamp);
  
  const content = (
    <div className={cn(
      'flex items-start space-x-3 p-3 rounded-lg transition-colors duration-150',
      'hover:bg-panel2 cursor-pointer group'
    )}>
      {/* Icon */}
      <div className={cn(
        'flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-sm',
        activityStyles.background,
        activityStyles.text
      )}>
        {activity.icon}
      </div>
      
      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-dashboard-body text-text font-medium group-hover:text-gradient transition-colors">
              {activity.title}
            </p>
            {activity.description && (
              <p className="text-dashboard-caption text-muted mt-1">
                {activity.description}
              </p>
            )}
          </div>
          
          {/* Value */}
          {activity.value && activity.currency && (
            <div className="flex-shrink-0 ml-3">
              <span className={cn(
                'text-dashboard-caption font-medium',
                activity.type === 'price_alert' && activity.value > 0 ? 'text-success' : 'text-text'
              )}>
                {activity.type === 'price_alert' && activity.value > 0 ? '+' : ''}
                {formatCurrency(activity.value, activity.currency)}
              </span>
            </div>
          )}
        </div>
        
        {/* Timestamp */}
        <p className="text-dashboard-caption text-muted mt-2">
          {timeAgo}
        </p>
      </div>
    </div>
  );
  
  if (activity.href) {
    return (
      <Link href={activity.href as any} className="block">
        {content}
      </Link>
    );
  }
  
  return content;
}

function getActivityStyles(type: ActivityItem['type']) {
  const styles = {
    card_added: {
      background: 'bg-brand/10',
      text: 'text-brand'
    },
    achievement: {
      background: 'bg-warning/10',
      text: 'text-warning'
    },
    price_alert: {
      background: 'bg-success/10',
      text: 'text-success'
    },
    trade: {
      background: 'bg-brand2/10',
      text: 'text-brand2'
    },
    set_completed: {
      background: 'bg-accent/10',
      text: 'text-accent'
    },
    goal_reached: {
      background: 'bg-warning/10',
      text: 'text-warning'
    },
    market_update: {
      background: 'bg-muted/10',
      text: 'text-muted'
    }
  };
  
  return styles[type] || styles.card_added;
}

function formatTimeAgo(timestamp: Date): string {
  const now = new Date();
  const diffInMs = now.getTime() - timestamp.getTime();
  const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
  const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
  
  if (diffInMinutes < 1) {
    return 'Just now';
  } else if (diffInMinutes < 60) {
    return `${diffInMinutes} minute${diffInMinutes === 1 ? '' : 's'} ago`;
  } else if (diffInHours < 24) {
    return `${diffInHours} hour${diffInHours === 1 ? '' : 's'} ago`;
  } else if (diffInDays < 7) {
    return `${diffInDays} day${diffInDays === 1 ? '' : 's'} ago`;
  } else {
    return timestamp.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric'
    });
  }
}

// Mock data for development
export const mockActivityData: ActivityItem[] = [
  {
    id: '1',
    type: 'card_added',
    title: 'Added Charizard ex',
    description: 'Base Set Unlimited',
    timestamp: new Date(Date.now() - 2 * 60 * 1000), // 2 minutes ago
    icon: '🎴',
    value: 45.50,
    currency: 'EUR',
    href: '/collection?card=charizard-ex'
  },
  {
    id: '2',
    type: 'set_completed',
    title: 'Completed Base Set Booster Pack',
    description: 'All 11 cards collected',
    timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000), // 1 hour ago
    icon: '🏆',
    href: '/pokemon/sets/base-set'
  },
  {
    id: '3',
    type: 'price_alert',
    title: 'Price alert: Pikachu Promo',
    description: 'Price increased by 15%',
    timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000), // 3 hours ago
    icon: '📈',
    value: 2.30,
    currency: 'EUR',
    href: '/cards/pikachu-promo'
  },
  {
    id: '4',
    type: 'trade',
    title: 'Trade request from @user123',
    description: 'Wants your Blastoise for Venusaur',
    timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000), // 5 hours ago
    icon: '🤝',
    href: '/trading/requests'
  },
  {
    id: '5',
    type: 'achievement',
    title: 'Achievement unlocked: First 100!',
    description: 'Collected your first 100 cards',
    timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
    icon: '🏅',
    href: '/achievements'
  },
  {
    id: '6',
    type: 'goal_reached',
    title: 'Collection goal reached',
    description: 'Base Set completion: 90%',
    timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
    icon: '🎯',
    href: '/collection/goals'
  }
];

function ActivityIcon() {
  return (
    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  );
}