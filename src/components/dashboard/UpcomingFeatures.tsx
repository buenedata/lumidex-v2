import React from 'react';
import Link from 'next/link';
import { Panel } from '@/components/ui/Panel';
import { cn } from '@/lib/utils';

export interface UpcomingFeature {
  id: string;
  title: string;
  description: string;
  status: 'coming_soon' | 'beta' | 'planned' | 'in_development';
  estimatedDate?: string;
  progress?: number;
  icon: string;
  category: 'trading' | 'analytics' | 'social' | 'ui' | 'integration';
  priority: 'high' | 'medium' | 'low';
  userVotes?: number;
  isUserRequested?: boolean;
}

export interface UpcomingFeaturesProps {
  features: UpcomingFeature[];
  showTips?: boolean;
  allowVoting?: boolean;
  maxFeatures?: number;
  className?: string;
}

export function UpcomingFeatures({ 
  features, 
  showTips = true, 
  allowVoting = false,
  maxFeatures = 4,
  className 
}: UpcomingFeaturesProps) {
  const displayFeatures = features.slice(0, maxFeatures);
  const tip = getRandomTip();

  return (
    <Panel className={cn('dashboard-widget', className)}>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-dashboard-title text-text font-semibold">Upcoming Features</h3>
            <p className="text-dashboard-caption text-muted mt-1">
              What's coming next to Lumidex
            </p>
          </div>
          <Link 
            href={"/roadmap" as any}
            className="text-dashboard-caption text-brand2 hover:text-brand transition-colors"
          >
            Full Roadmap
          </Link>
        </div>
        
        {/* Coming Soon Banner */}
        <div className="p-4 rounded-lg bg-aurora-radial border border-brand/20">
          <div className="flex items-center space-x-2 mb-2">
            <span className="text-lg">🚀</span>
            <span className="text-dashboard-subtitle font-medium text-text">Next Major Update</span>
          </div>
          <p className="text-dashboard-body text-text mb-3">
            Advanced Trading System launching soon with peer-to-peer trading, escrow protection, and reputation system.
          </p>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-brand rounded-full animate-pulse" />
              <span className="text-dashboard-caption text-muted">Expected Q2 2024</span>
            </div>
            <Link href={"/beta-signup" as any} className="btn btn-primary btn-sm">
              Join Beta
            </Link>
          </div>
        </div>
        
        {/* Features List */}
        <div className="space-y-3">
          {displayFeatures.map((feature) => (
            <UpcomingFeatureItem 
              key={feature.id} 
              feature={feature} 
              allowVoting={allowVoting}
            />
          ))}
        </div>
        
        {/* Tip Section */}
        {showTips && tip && (
          <div className="pt-3 border-t border-border">
            <div className="flex items-start space-x-3 p-3 rounded-lg bg-panel2/30">
              <div className="text-lg">💡</div>
              <div>
                <h5 className="text-dashboard-subtitle font-medium text-text mb-1">
                  Pro Tip
                </h5>
                <p className="text-dashboard-caption text-muted">
                  {tip}
                </p>
              </div>
            </div>
          </div>
        )}
        
        {/* Feedback CTA */}
        <div className="pt-3 border-t border-border">
          <div className="text-center">
            <p className="text-dashboard-caption text-muted mb-3">
              Have a feature request or feedback?
            </p>
            <div className="flex items-center justify-center space-x-3">
              <Link href={"/feedback" as any} className="btn btn-secondary btn-sm">
                Send Feedback
              </Link>
              <Link href={"/discord" as any} className="btn btn-secondary btn-sm">
                Join Discord
              </Link>
            </div>
          </div>
        </div>
      </div>
    </Panel>
  );
}

interface UpcomingFeatureItemProps {
  feature: UpcomingFeature;
  allowVoting?: boolean;
}

function UpcomingFeatureItem({ feature, allowVoting = false }: UpcomingFeatureItemProps) {
  const statusStyle = getStatusStyle(feature.status);
  const categoryColor = getCategoryColor(feature.category);
  
  return (
    <div className="flex items-start space-x-3 p-3 rounded-lg bg-panel2/30 hover:bg-panel2/50 transition-colors group">
      {/* Icon */}
      <div className={cn(
        'flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center text-lg',
        categoryColor.background
      )}>
        {feature.icon}
      </div>
      
      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-1">
              <h4 className="text-dashboard-subtitle font-medium text-text group-hover:text-gradient transition-colors">
                {feature.title}
              </h4>
              
              {/* Status Badge */}
              <span className={cn(
                'px-2 py-1 rounded-full text-xs font-medium',
                statusStyle.background,
                statusStyle.text
              )}>
                {getStatusLabel(feature.status)}
              </span>
              
              {/* Priority Indicator */}
              {feature.priority === 'high' && (
                <span className="w-2 h-2 bg-brand rounded-full" title="High Priority" />
              )}
            </div>
            
            <p className="text-dashboard-caption text-muted mb-2">
              {feature.description}
            </p>
            
            {/* Progress Bar */}
            {feature.progress !== undefined && (
              <div className="w-full h-1.5 bg-panel rounded-full overflow-hidden mb-2">
                <div 
                  className="h-full bg-gradient-to-r from-brand2 to-brand transition-all duration-500"
                  style={{ width: `${feature.progress}%` }}
                />
              </div>
            )}
            
            {/* Meta Info */}
            <div className="flex items-center space-x-3 text-xs text-muted">
              {feature.estimatedDate && (
                <span>📅 {feature.estimatedDate}</span>
              )}
              {feature.progress !== undefined && (
                <span>🔄 {feature.progress}% complete</span>
              )}
              {feature.userVotes && feature.userVotes > 0 && (
                <span>👍 {feature.userVotes} votes</span>
              )}
              {feature.isUserRequested && (
                <span className="text-brand">👤 User requested</span>
              )}
            </div>
          </div>
          
          {/* Voting */}
          {allowVoting && (
            <div className="flex-shrink-0 ml-3">
              <button className="btn btn-ghost btn-sm p-2">
                <span className="text-sm">👍</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function getStatusStyle(status: UpcomingFeature['status']) {
  const styles = {
    coming_soon: {
      background: 'bg-brand/20',
      text: 'text-brand'
    },
    beta: {
      background: 'bg-warning/20',
      text: 'text-warning'
    },
    planned: {
      background: 'bg-muted/20',
      text: 'text-muted'
    },
    in_development: {
      background: 'bg-brand2/20',
      text: 'text-brand2'
    }
  };
  
  return styles[status];
}

function getStatusLabel(status: UpcomingFeature['status']): string {
  const labels = {
    coming_soon: 'Coming Soon',
    beta: 'Beta',
    planned: 'Planned',
    in_development: 'In Development'
  };
  
  return labels[status];
}

function getCategoryColor(category: UpcomingFeature['category']) {
  const colors = {
    trading: { background: 'bg-brand2/10 text-brand2' },
    analytics: { background: 'bg-success/10 text-success' },
    social: { background: 'bg-accent/10 text-accent' },
    ui: { background: 'bg-brand/10 text-brand' },
    integration: { background: 'bg-warning/10 text-warning' }
  };
  
  return colors[category] || colors.ui;
}

function getRandomTip(): string {
  const tips = [
    "Enable price alerts to never miss a good deal on your wishlist cards",
    "Use the quick actions panel to speed up your daily collection management",
    "Set collection goals to track your progress and stay motivated",
    "Join our Discord community to connect with other collectors and get tips",
    "Check your achievement progress regularly - you might be closer to unlocking rewards than you think",
    "The market insights panel helps you buy low and avoid overpaying",
    "Track multiple sets simultaneously to optimize your collection strategy",
    "Export your collection data regularly as a backup"
  ];
  
  return tips[Math.floor(Math.random() * tips.length)];
}

// Mock data for development
export const mockUpcomingFeatures: UpcomingFeature[] = [
  {
    id: '1',
    title: 'Advanced Trading System',
    description: 'Peer-to-peer trading with escrow protection and reputation system',
    status: 'in_development',
    estimatedDate: 'Q2 2024',
    progress: 75,
    icon: '🤝',
    category: 'trading',
    priority: 'high',
    userVotes: 342,
    isUserRequested: true
  },
  {
    id: '2',
    title: 'Achievement Badges',
    description: 'Visual badges and rewards for collection milestones',
    status: 'coming_soon',
    estimatedDate: 'March 2024',
    progress: 90,
    icon: '🏆',
    category: 'ui',
    priority: 'medium',
    userVotes: 198
  },
  {
    id: '3',
    title: 'Collection Analytics Dashboard',
    description: 'Advanced charts and insights about your collection performance',
    status: 'beta',
    estimatedDate: 'Available now',
    icon: '📊',
    category: 'analytics',
    priority: 'medium',
    userVotes: 156
  },
  {
    id: '4',
    title: 'Social Features & Friends',
    description: 'Connect with friends, share collections, and create groups',
    status: 'planned',
    estimatedDate: 'Q3 2024',
    icon: '👥',
    category: 'social',
    priority: 'low',
    userVotes: 89
  },
  {
    id: '5',
    title: 'TCGPlayer Integration',
    description: 'Direct integration with TCGPlayer for seamless buying',
    status: 'planned',
    estimatedDate: 'Q4 2024',
    icon: '🛒',
    category: 'integration',
    priority: 'medium',
    userVotes: 267,
    isUserRequested: true
  },
  {
    id: '6',
    title: 'Mobile Companion App',
    description: 'Native mobile app for iOS and Android',
    status: 'planned',
    estimatedDate: '2025',
    icon: '📱',
    category: 'ui',
    priority: 'low',
    userVotes: 445
  }
];