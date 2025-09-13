import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Panel } from '@/components/ui/Panel';
import { cn, formatCurrency } from '@/lib/utils';

export interface SetProgress {
  id: string;
  name: string;
  slug: string;
  totalCards: number;
  ownedCards: number;
  completionPercentage: number;
  image?: string;
  priority: 'high' | 'medium' | 'low';
  estimatedCost?: number;
  currency?: string;
  releaseDate?: Date;
  series?: string;
  missingRareCards?: number;
}

export interface SetCompletionListProps {
  sets: SetProgress[];
  maxSets?: number;
  showRecommendations?: boolean;
  className?: string;
}

export function SetCompletionList({ 
  sets, 
  maxSets = 5, 
  showRecommendations = true,
  className 
}: SetCompletionListProps) {
  const displaySets = sets.slice(0, maxSets);
  const recommendedSet = showRecommendations ? getRecommendedSet(sets) : null;

  if (sets.length === 0) {
    return (
      <Panel className={cn('dashboard-widget', className)}>
        <div className="space-y-4">
          <div>
            <h3 className="text-dashboard-title text-text font-semibold">Set Completion Status</h3>
            <p className="text-dashboard-caption text-muted mt-1">
              Track your progress on different sets
            </p>
          </div>
          
          <div className="empty-state py-8">
            <div className="empty-state-icon">
              <SetIcon />
            </div>
            <h4 className="text-lg font-medium text-text mb-2">No sets tracked</h4>
            <p className="text-muted mb-4">
              Start collecting to track your set completion progress
            </p>
            <Link href={"/pokemon/sets" as any} className="btn btn-primary btn-sm">
              Browse Sets
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
            <h3 className="text-dashboard-title text-text font-semibold">Set Completion Status</h3>
            <p className="text-dashboard-caption text-muted mt-1">
              Track your progress on different sets
            </p>
          </div>
          <Link
            href={"/pokemon/sets" as any}
            className="text-dashboard-caption text-brand2 hover:text-brand transition-colors"
          >
            View All Sets
          </Link>
        </div>
        
        {/* Recommendation */}
        {recommendedSet && showRecommendations && (
          <div className="p-3 rounded-lg bg-aurora-radial border border-brand/20">
            <div className="flex items-center space-x-2 mb-2">
              <span className="text-sm font-medium text-brand">💡 Recommendation</span>
            </div>
            <p className="text-dashboard-body text-text">
              Complete <strong>{recommendedSet.name}</strong> next - you're {recommendedSet.completionPercentage}% done
              {recommendedSet.estimatedCost && (
                <span className="text-muted">
                  {' '}(~{formatCurrency(recommendedSet.estimatedCost, recommendedSet.currency || 'EUR')} remaining)
                </span>
              )}
            </p>
          </div>
        )}
        
        {/* Sets List */}
        <div className="space-y-3">
          {displaySets.map((set) => (
            <SetProgressItem key={set.id} set={set} />
          ))}
        </div>
      </div>
    </Panel>
  );
}

interface SetProgressItemProps {
  set: SetProgress;
}

function SetProgressItem({ set }: SetProgressItemProps) {
  const priorityStyle = getPriorityStyle(set.priority);
  const isCompleted = set.completionPercentage >= 100;

  return (
    <Link href={`/pokemon/sets/${set.slug}` as any}>
      <div className={cn(
        'group p-4 rounded-lg border transition-all duration-200',
        'hover:border-brand2/50 hover:shadow-md hover:bg-panel2/30',
        isCompleted 
          ? 'bg-aurora-radial border-brand/20' 
          : 'bg-panel2/50 border-border'
      )}>
        <div className="flex items-center space-x-4">
          {/* Set Image */}
          {set.image && (
            <div className="flex-shrink-0 w-12 h-12 rounded-lg overflow-hidden bg-panel">
              <Image
                src={set.image}
                alt={`${set.name} set icon`}
                width={48}
                height={48}
                className="object-cover group-hover:scale-105 transition-transform duration-200"
              />
            </div>
          )}
          
          {/* Set Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1">
                <div className="flex items-center space-x-2">
                  <h4 className={cn(
                    'font-medium group-hover:text-gradient transition-colors',
                    isCompleted ? 'text-gradient' : 'text-text'
                  )}>
                    {set.name}
                    {isCompleted && <span className="ml-2">✨</span>}
                  </h4>
                  
                  {/* Priority Badge */}
                  <span className={cn(
                    'px-2 py-1 rounded-full text-xs font-medium',
                    priorityStyle.background,
                    priorityStyle.text
                  )}>
                    {set.priority}
                  </span>
                </div>
                
                {set.series && (
                  <p className="text-dashboard-caption text-muted">
                    {set.series}
                  </p>
                )}
              </div>
              
              {/* Progress Text */}
              <div className="flex-shrink-0 text-right ml-3">
                <span className={cn(
                  'text-dashboard-subtitle font-medium',
                  isCompleted ? 'text-success' : 'text-text'
                )}>
                  {set.ownedCards}/{set.totalCards}
                </span>
                <div className="text-xs text-muted">
                  {Math.round(set.completionPercentage)}%
                </div>
              </div>
            </div>
            
            {/* Progress Bar */}
            <div className="relative mb-3">
              <div className="w-full h-2 bg-panel rounded-full overflow-hidden">
                <div 
                  className={cn(
                    'h-full transition-all duration-700 ease-out rounded-full',
                    isCompleted 
                      ? 'bg-aurora animate-pulse' 
                      : 'bg-gradient-to-r from-brand2/60 to-brand/60'
                  )}
                  style={{ width: `${Math.min(set.completionPercentage, 100)}%` }}
                />
              </div>
            </div>
            
            {/* Additional Info */}
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center space-x-4 text-muted">
                {set.missingRareCards && set.missingRareCards > 0 && (
                  <span>
                    {set.missingRareCards} rare{set.missingRareCards !== 1 ? 's' : ''} missing
                  </span>
                )}
                {set.releaseDate && (
                  <span>
                    {set.releaseDate.getFullYear()}
                  </span>
                )}
              </div>
              
              {/* Estimated Cost */}
              {set.estimatedCost && set.estimatedCost > 0 && !isCompleted && (
                <span className="text-muted">
                  ~{formatCurrency(set.estimatedCost, set.currency || 'EUR')} to complete
                </span>
              )}
              
              {isCompleted && (
                <span className="text-success font-medium">
                  ✓ Complete
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

function getPriorityStyle(priority: SetProgress['priority']) {
  const styles = {
    high: {
      background: 'bg-danger/20',
      text: 'text-danger'
    },
    medium: {
      background: 'bg-warning/20',
      text: 'text-warning'
    },
    low: {
      background: 'bg-success/20',
      text: 'text-success'
    }
  };
  
  return styles[priority];
}

function getRecommendedSet(sets: SetProgress[]): SetProgress | null {
  // Find the set with highest completion percentage that's not 100%
  const incompleteSets = sets.filter(set => set.completionPercentage < 100);
  if (incompleteSets.length === 0) return null;
  
  return incompleteSets.reduce((recommended, current) => {
    if (current.completionPercentage > recommended.completionPercentage) {
      return current;
    }
    // If same percentage, prefer higher priority
    if (current.completionPercentage === recommended.completionPercentage) {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      if (priorityOrder[current.priority] > priorityOrder[recommended.priority]) {
        return current;
      }
    }
    return recommended;
  });
}

// Mock data for development
export const mockSetProgressData: SetProgress[] = [
  {
    id: '1',
    name: 'Base Set',
    slug: 'base-set',
    totalCards: 102,
    ownedCards: 87,
    completionPercentage: 85,
    image: 'https://images.pokemontcg.io/base1/symbol.png',
    priority: 'high',
    estimatedCost: 245.50,
    currency: 'EUR',
    releaseDate: new Date('1999-01-09'),
    series: 'Base',
    missingRareCards: 3
  },
  {
    id: '2',
    name: 'Jungle',
    slug: 'jungle',
    totalCards: 64,
    ownedCards: 38,
    completionPercentage: 59,
    image: 'https://images.pokemontcg.io/jungle/symbol.png',
    priority: 'medium',
    estimatedCost: 156.30,
    currency: 'EUR',
    releaseDate: new Date('1999-06-16'),
    series: 'Base',
    missingRareCards: 5
  },
  {
    id: '3',
    name: 'Fossil',
    slug: 'fossil',
    totalCards: 62,
    ownedCards: 18,
    completionPercentage: 29,
    image: 'https://images.pokemontcg.io/fossil/symbol.png',
    priority: 'low',
    estimatedCost: 298.75,
    currency: 'EUR',
    releaseDate: new Date('1999-10-10'),
    series: 'Base',
    missingRareCards: 8
  },
  {
    id: '4',
    name: 'Base Set 2',
    slug: 'base-set-2',
    totalCards: 130,
    ownedCards: 130,
    completionPercentage: 100,
    image: 'https://images.pokemontcg.io/base2/symbol.png',
    priority: 'medium',
    releaseDate: new Date('2000-02-24'),
    series: 'Base',
    missingRareCards: 0
  },
  {
    id: '5',
    name: 'Team Rocket',
    slug: 'team-rocket',
    totalCards: 83,
    ownedCards: 12,
    completionPercentage: 14,
    image: 'https://images.pokemontcg.io/tr/symbol.png',
    priority: 'low',
    estimatedCost: 445.20,
    currency: 'EUR',
    releaseDate: new Date('2000-04-24'),
    series: 'Base',
    missingRareCards: 12
  }
];

function SetIcon() {
  return (
    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
    </svg>
  );
}