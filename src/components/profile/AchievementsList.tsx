'use client'

import { Trophy, Star, Lock, CheckCircle, Target, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AchievementsListProps {
  userId: string
}

interface Achievement {
  id: string
  name: string
  description: string
  icon: 'trophy' | 'star' | 'target' | 'zap'
  category: 'collection' | 'trading' | 'completion' | 'milestone'
  isUnlocked: boolean
  unlockedAt?: string
  progress?: {
    current: number
    total: number
  }
  rarity: 'common' | 'rare' | 'epic' | 'legendary'
  points: number
}

export default function AchievementsList({ userId }: AchievementsListProps) {
  // Mock data - this would come from your database
  const achievements: Achievement[] = [
    {
      id: '1',
      name: 'First Steps',
      description: 'Add your first card to the collection',
      icon: 'star',
      category: 'collection',
      isUnlocked: true,
      unlockedAt: '2024-01-15T10:00:00Z',
      rarity: 'common',
      points: 10
    },
    {
      id: '2',
      name: 'Holo Hunter',
      description: 'Collect 10 holographic cards',
      icon: 'trophy',
      category: 'collection',
      isUnlocked: true,
      unlockedAt: '2024-01-15T14:30:00Z',
      progress: {
        current: 10,
        total: 10
      },
      rarity: 'rare',
      points: 50
    },
    {
      id: '3',
      name: 'Set Completionist',
      description: 'Complete your first full set',
      icon: 'target',
      category: 'completion',
      isUnlocked: false,
      progress: {
        current: 87,
        total: 102
      },
      rarity: 'epic',
      points: 100
    },
    {
      id: '4',
      name: 'Speed Collector',
      description: 'Add 20 cards in a single day',
      icon: 'zap',
      category: 'milestone',
      isUnlocked: false,
      progress: {
        current: 3,
        total: 20
      },
      rarity: 'rare',
      points: 75
    },
    {
      id: '5',
      name: 'Trading Master',
      description: 'Complete 50 successful trades',
      icon: 'trophy',
      category: 'trading',
      isUnlocked: false,
      progress: {
        current: 0,
        total: 50
      },
      rarity: 'legendary',
      points: 200
    }
  ]

  const getAchievementIcon = (icon: Achievement['icon'], isUnlocked: boolean) => {
    const iconClasses = cn(
      'h-5 w-5',
      isUnlocked ? 'text-white' : 'text-gray-400'
    )
    
    switch (icon) {
      case 'trophy':
        return <Trophy className={iconClasses} />
      case 'star':
        return <Star className={iconClasses} />
      case 'target':
        return <Target className={iconClasses} />
      case 'zap':
        return <Zap className={iconClasses} />
      default:
        return <Trophy className={iconClasses} />
    }
  }

  const getRarityColor = (rarity: Achievement['rarity']) => {
    switch (rarity) {
      case 'common':
        return 'bg-muted'
      case 'rare':
        return 'bg-brand2'
      case 'epic':
        return 'bg-brand2'
      case 'legendary':
        return 'bg-accent'
      default:
        return 'bg-muted'
    }
  }

  const getRarityBorder = (rarity: Achievement['rarity']) => {
    switch (rarity) {
      case 'common':
        return 'border-border'
      case 'rare':
        return 'border-brand2/20'
      case 'epic':
        return 'border-brand2/20'
      case 'legendary':
        return 'border-accent/20'
      default:
        return 'border-border'
    }
  }

  const unlockedAchievements = achievements.filter(a => a.isUnlocked)
  const lockedAchievements = achievements.filter(a => !a.isUnlocked)
  const totalPoints = unlockedAchievements.reduce((sum, a) => sum + a.points, 0)

  return (
    <div className="panel p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-medium text-text">Achievements</h3>
          <p className="text-sm text-muted">
            {unlockedAchievements.length}/{achievements.length} unlocked • {totalPoints} points
          </p>
        </div>
        <button className="text-sm text-brand hover:text-brand2 font-medium transition-colors">
          View All →
        </button>
      </div>

      <div className="space-y-3">
        {/* Unlocked Achievements */}
        {unlockedAchievements.slice(0, 3).map((achievement) => (
          <div
            key={achievement.id}
            className={cn(
              'flex items-center space-x-3 p-3 rounded-xl border-2 activity-price',
              getRarityBorder(achievement.rarity)
            )}
          >
            {/* Achievement Icon */}
            <div className={cn(
              'flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center',
              getRarityColor(achievement.rarity)
            )}>
              {getAchievementIcon(achievement.icon, true)}
            </div>

            {/* Achievement Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2">
                <h4 className="font-medium text-text text-sm">{achievement.name}</h4>
                <CheckCircle className="h-4 w-4 text-success" />
                <span className="text-xs font-medium text-success">
                  +{achievement.points} pts
                </span>
              </div>
              <p className="text-xs text-muted mt-1">{achievement.description}</p>
              {achievement.unlockedAt && (
                <p className="text-xs text-muted mt-1">
                  Unlocked {new Date(achievement.unlockedAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'numeric',
                    day: 'numeric'
                  })}
                </p>
              )}
            </div>
          </div>
        ))}

        {/* Locked Achievements */}
        {lockedAchievements.slice(0, 2).map((achievement) => (
          <div
            key={achievement.id}
            className={cn(
              'flex items-center space-x-3 p-3 rounded-xl border bg-panel2',
              getRarityBorder(achievement.rarity)
            )}
          >
            {/* Achievement Icon */}
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-panel border border-border flex items-center justify-center">
              <Lock className="h-5 w-5 text-muted" />
            </div>

            {/* Achievement Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2">
                <h4 className="font-medium text-text text-sm">{achievement.name}</h4>
                <span className="text-xs font-medium text-muted">
                  {achievement.points} pts
                </span>
              </div>
              <p className="text-xs text-muted mt-1">{achievement.description}</p>
              
              {/* Progress Bar */}
              {achievement.progress && (
                <div className="mt-2">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs text-muted">
                      {achievement.progress.current}/{achievement.progress.total}
                    </span>
                    <span className="text-xs text-muted">
                      {Math.round((achievement.progress.current / achievement.progress.total) * 100)}%
                    </span>
                  </div>
                  <div className="progress-container">
                    <div
                      className="progress-fill"
                      style={{
                        width: `${(achievement.progress.current / achievement.progress.total) * 100}%`
                      }}
                    ></div>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {achievements.length === 0 && (
        <div className="empty-state">
          <div className="empty-state-icon">
            <Trophy className="w-12 h-12" />
          </div>
          <h4 className="text-sm font-medium text-text mb-1">No achievements yet</h4>
          <p className="text-sm text-muted">
            Start collecting cards to unlock achievements!
          </p>
        </div>
      )}
    </div>
  )
}