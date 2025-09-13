import React from 'react';
import Link from 'next/link';
import { Panel } from '@/components/ui/Panel';
import { cn } from '@/lib/utils';

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  currentProgress: number;
  targetProgress: number;
  category: 'collection' | 'trading' | 'social' | 'market';
  rewards?: string[];
  isUnlocked?: boolean;
  unlockedAt?: Date;
}

export interface AchievementProgressProps {
  achievements: Achievement[];
  showAll?: boolean;
  maxAchievements?: number;
  className?: string;
}

export function AchievementProgress({ 
  achievements, 
  showAll = false, 
  maxAchievements = 4,
  className 
}: AchievementProgressProps) {
  const displayAchievements = showAll ? achievements : achievements.slice(0, maxAchievements);
  const hasMoreAchievements = achievements.length > maxAchievements;

  if (achievements.length === 0) {
    return (
      <Panel className={cn('dashboard-widget', className)}>
        <div className="space-y-4">
          <div>
            <h3 className="text-dashboard-title text-text font-semibold">Achievement Progress</h3>
            <p className="text-dashboard-caption text-muted mt-1">
              Track your collection milestones
            </p>
          </div>
          
          <div className="empty-state py-6">
            <div className="empty-state-icon">
              <TrophyIcon />
            </div>
            <h4 className="text-base font-medium text-text mb-2">No achievements yet</h4>
            <p className="text-muted text-sm">
              Start collecting to unlock achievements
            </p>
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
            <h3 className="text-dashboard-title text-text font-semibold">Achievement Progress</h3>
            <p className="text-dashboard-caption text-muted mt-1">
              Track your collection milestones
            </p>
          </div>
          {hasMoreAchievements && !showAll && (
            <Link 
              href={"/achievements" as any}
              className="text-dashboard-caption text-brand2 hover:text-brand transition-colors"
            >
              View All
            </Link>
          )}
        </div>
        
        <div className="space-y-3">
          {displayAchievements.map((achievement) => (
            <AchievementItem key={achievement.id} achievement={achievement} />
          ))}
        </div>
      </div>
    </Panel>
  );
}

interface AchievementItemProps {
  achievement: Achievement;
}

function AchievementItem({ achievement }: AchievementItemProps) {
  const progressPercentage = Math.min((achievement.currentProgress / achievement.targetProgress) * 100, 100);
  const isCompleted = achievement.currentProgress >= achievement.targetProgress;
  const categoryStyle = getCategoryStyle(achievement.category);

  return (
    <div className={cn(
      'p-4 rounded-lg border transition-all duration-200 hover:border-brand2/30',
      isCompleted ? 'bg-aurora-radial border-brand/20' : 'bg-panel2/50 border-border'
    )}>
      <div className="flex items-start space-x-3">
        {/* Icon */}
        <div className={cn(
          'flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center text-lg',
          isCompleted ? 'bg-aurora text-white' : categoryStyle.background
        )}>
          {isCompleted ? '🏆' : achievement.icon}
        </div>
        
        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between mb-2">
            <div>
              <h4 className={cn(
                'text-dashboard-subtitle font-medium',
                isCompleted ? 'text-gradient' : 'text-text'
              )}>
                {achievement.title}
                {isCompleted && <span className="ml-2">✨</span>}
              </h4>
              <p className="text-dashboard-caption text-muted">
                {achievement.description}
              </p>
            </div>
            
            {/* Progress Text */}
            <div className="flex-shrink-0 ml-3 text-right">
              <span className={cn(
                'text-dashboard-caption font-medium',
                isCompleted ? 'text-success' : 'text-muted'
              )}>
                {achievement.currentProgress}/{achievement.targetProgress}
              </span>
              <div className="text-xs text-muted">
                {Math.round(progressPercentage)}%
              </div>
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="relative">
            <div className="w-full h-2 bg-panel rounded-full overflow-hidden">
              <div 
                className={cn(
                  'h-full transition-all duration-700 ease-out rounded-full',
                  isCompleted 
                    ? 'bg-aurora' 
                    : 'bg-gradient-to-r from-brand2/50 to-brand/50'
                )}
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
            
            {/* Glow effect for completed achievements */}
            {isCompleted && (
              <div className="absolute inset-0 h-2 bg-aurora rounded-full animate-pulse opacity-50" />
            )}
          </div>
          
          {/* Rewards */}
          {achievement.rewards && achievement.rewards.length > 0 && (
            <div className="mt-3 flex items-center space-x-2">
              <span className="text-xs text-muted">Rewards:</span>
              <div className="flex items-center space-x-1">
                {achievement.rewards.map((reward, index) => (
                  <span 
                    key={index}
                    className={cn(
                      'text-xs px-2 py-1 rounded-full',
                      isCompleted 
                        ? 'bg-aurora/20 text-brand border border-brand/20' 
                        : 'bg-panel text-muted border border-border'
                    )}
                  >
                    {reward}
                  </span>
                ))}
              </div>
            </div>
          )}
          
          {/* Unlocked timestamp */}
          {isCompleted && achievement.unlockedAt && (
            <div className="mt-2">
              <span className="text-xs text-success">
                ✓ Unlocked {formatDate(achievement.unlockedAt)}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function getCategoryStyle(category: Achievement['category']) {
  const styles = {
    collection: {
      background: 'bg-brand/10 text-brand'
    },
    trading: {
      background: 'bg-brand2/10 text-brand2'
    },
    social: {
      background: 'bg-accent/10 text-accent'
    },
    market: {
      background: 'bg-success/10 text-success'
    }
  };
  
  return styles[category] || styles.collection;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric' 
  });
}

// Mock data for development
export const mockAchievementData: Achievement[] = [
  {
    id: '1',
    title: 'Collection Master',
    description: 'Own 100 unique cards',
    icon: '📚',
    currentProgress: 87,
    targetProgress: 100,
    category: 'collection',
    rewards: ['Badge', '50 XP']
  },
  {
    id: '2',
    title: 'High Roller',
    description: 'Collection worth €1000+',
    icon: '💎',
    currentProgress: 750,
    targetProgress: 1000,
    category: 'collection',
    rewards: ['Premium Badge', '100 XP']
  },
  {
    id: '3',
    title: 'Market Watcher',
    description: 'Set 10 price alerts',
    icon: '📈',
    currentProgress: 3,
    targetProgress: 10,
    category: 'market',
    rewards: ['Market Badge', '25 XP']
  },
  {
    id: '4',
    title: 'Set Completionist',
    description: 'Complete your first set',
    icon: '🏆',
    currentProgress: 1,
    targetProgress: 1,
    category: 'collection',
    rewards: ['Gold Badge', '200 XP'],
    isUnlocked: true,
    unlockedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
  },
  {
    id: '5',
    title: 'Social Trader',
    description: 'Complete 5 trades',
    icon: '🤝',
    currentProgress: 2,
    targetProgress: 5,
    category: 'trading',
    rewards: ['Trader Badge', '75 XP']
  },
  {
    id: '6',
    title: 'Community Member',
    description: 'Connect with 10 friends',
    icon: '👥',
    currentProgress: 6,
    targetProgress: 10,
    category: 'social',
    rewards: ['Social Badge', '50 XP']
  }
];

function TrophyIcon() {
  return (
    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
    </svg>
  );
}