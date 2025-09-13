import Link from 'next/link';
import { cn } from '@/lib/utils';

interface LeaderboardsTabProps {
  isAuthenticated: boolean;
}

export function LeaderboardsTab({ isAuthenticated }: LeaderboardsTabProps) {
  return (
    <div className="space-y-8">
      {/* Header */}
      <section className="text-center space-y-4">
        <h2 className="text-2xl md:text-3xl font-bold text-gradient">Community Leaderboards</h2>
        <p className="text-lg text-muted">
          See how you rank among fellow collectors
        </p>
      </section>

      {/* Main Leaderboards */}
      <section className="panel p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Most Cards */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-text flex items-center">
              🏆 Most Cards
            </h3>
            <div className="space-y-3">
              <LeaderboardEntry rank={1} name="CardMaster92" value="2,847 cards" />
              <LeaderboardEntry rank={2} name="SetHunter" value="2,104 cards" />
              <LeaderboardEntry rank={3} name="You!" value="1,847 cards" highlight={isAuthenticated} />
              <LeaderboardEntry rank={4} name="CollectorPro" value="1,654 cards" />
              <LeaderboardEntry rank={5} name="PokémaniaX" value="1,432 cards" />
            </div>
          </div>

          {/* Most Valuable */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-text flex items-center">
              💎 Most Valuable
            </h3>
            <div className="space-y-3">
              <LeaderboardEntry rank={1} name="PokéWhale" value="€45,230" />
              <LeaderboardEntry rank={2} name="RareCollector" value="€38,150" />
              <LeaderboardEntry rank={3} name="DiamondHands" value="€31,890" />
              <LeaderboardEntry rank={4} name="VintageKing" value="€28,560" />
              <LeaderboardEntry rank={5} name="GoldRush" value="€25,340" />
            </div>
          </div>

          {/* Best Traders */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-text flex items-center">
              📈 Best Traders
            </h3>
            <div className="space-y-3">
              <LeaderboardEntry rank={1} name="TradeKing" value="4.9★ (147)" />
              <LeaderboardEntry rank={2} name="FastTrade" value="4.8★ (203)" />
              <LeaderboardEntry rank={3} name="QuickDeal" value="4.7★ (89)" />
              <LeaderboardEntry rank={4} name="FairTrader" value="4.7★ (156)" />
              <LeaderboardEntry rank={5} name="SwapMaster" value="4.6★ (234)" />
            </div>
          </div>
        </div>
      </section>

      {/* Additional Leaderboards */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Set Completion Leaders */}
        <div className="panel p-6">
          <div className="mb-6">
            <h3 className="text-xl font-bold text-text mb-2">🎯 Set Completion Champions</h3>
            <p className="text-muted">Most completed sets</p>
          </div>
          
          <div className="space-y-3">
            <SetCompletionEntry 
              rank={1} 
              name="SetMaster" 
              completedSets={47} 
              totalSets={52} 
              percentage={90}
            />
            <SetCompletionEntry 
              rank={2} 
              name="CompletionistX" 
              completedSets={43} 
              totalSets={50} 
              percentage={86}
            />
            <SetCompletionEntry 
              rank={3} 
              name="PerfectCollector" 
              completedSets={38} 
              totalSets={45} 
              percentage={84}
            />
            <SetCompletionEntry 
              rank={4} 
              name="FullSetHunter" 
              completedSets={35} 
              totalSets={42} 
              percentage={83}
            />
            <SetCompletionEntry 
              rank={5} 
              name="VintageComplete" 
              completedSets={32} 
              totalSets={40} 
              percentage={80}
            />
          </div>
        </div>

        {/* Recent Activity Leaders */}
        <div className="panel p-6">
          <div className="mb-6">
            <h3 className="text-xl font-bold text-text mb-2">⚡ Most Active This Week</h3>
            <p className="text-muted">Cards added and trades completed</p>
          </div>
          
          <div className="space-y-3">
            <ActivityEntry 
              rank={1} 
              name="HyperActive" 
              cardsAdded={127} 
              tradesCompleted={8}
              isActive
            />
            <ActivityEntry 
              rank={2} 
              name="TradingMachine" 
              cardsAdded={89} 
              tradesCompleted={12}
              isActive
            />
            <ActivityEntry 
              rank={3} 
              name="CardHunter" 
              cardsAdded={76} 
              tradesCompleted={3}
            />
            <ActivityEntry 
              rank={4} 
              name="QuickCollector" 
              cardsAdded={54} 
              tradesCompleted={6}
            />
            <ActivityEntry 
              rank={5} 
              name="ActiveUser" 
              cardsAdded={43} 
              tradesCompleted={4}
            />
          </div>
        </div>
      </section>

      {/* Achievement Showcase */}
      <section className="panel p-6">
        <div className="mb-6">
          <h3 className="text-xl font-bold text-text mb-2">🏅 Recent Achievement Unlocks</h3>
          <p className="text-muted">Latest milestones reached by the community</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <AchievementShowcase
            achievement="Master Collector"
            description="Complete 10 different sets"
            unlockedBy="@SetKing"
            timeAgo="2 hours ago"
            rarity="legendary"
          />
          <AchievementShowcase
            achievement="Trading Expert"
            description="Complete 50 successful trades"
            unlockedBy="@TradeQueen"
            timeAgo="5 hours ago"
            rarity="epic"
          />
          <AchievementShowcase
            achievement="Vintage Hunter"
            description="Collect 100 cards from Base Set"
            unlockedBy="@RetroCollector"
            timeAgo="1 day ago"
            rarity="rare"
          />
          <AchievementShowcase
            achievement="Speed Trader"
            description="Complete 5 trades in one day"
            unlockedBy="@FastDeal"
            timeAgo="1 day ago"
            rarity="uncommon"
          />
          <AchievementShowcase
            achievement="Holo Master"
            description="Collect 50 holographic cards"
            unlockedBy="@ShinyHunter"
            timeAgo="2 days ago"
            rarity="rare"
          />
          <AchievementShowcase
            achievement="Community Helper"
            description="Help 10 new collectors get started"
            unlockedBy="@FriendlyHelper"
            timeAgo="3 days ago"
            rarity="epic"
          />
        </div>
      </section>

      {/* View All Button */}
      <section className="text-center">
        <Link href={"/leaderboards" as any} className="btn btn-primary btn-lg">
          View Full Leaderboards
        </Link>
      </section>
    </div>
  );
}

// Helper Components
interface LeaderboardEntryProps {
  rank: number;
  name: string;
  value: string;
  highlight?: boolean;
}

function LeaderboardEntry({ rank, name, value, highlight }: LeaderboardEntryProps) {
  return (
    <div className={cn(
      'flex items-center justify-between p-3 rounded-lg transition-colors',
      highlight 
        ? 'bg-aurora-radial border border-brand/20 text-gradient font-medium' 
        : 'bg-panel2/30 hover:bg-panel2/50'
    )}>
      <div className="flex items-center space-x-3">
        <span className="text-sm font-bold text-muted w-6">#{rank}</span>
        <span className="font-medium">{name}</span>
        {highlight && <span className="text-sm">🎯</span>}
      </div>
      <span className="text-sm font-semibold">{value}</span>
    </div>
  );
}

interface SetCompletionEntryProps {
  rank: number;
  name: string;
  completedSets: number;
  totalSets: number;
  percentage: number;
}

function SetCompletionEntry({ rank, name, completedSets, totalSets, percentage }: SetCompletionEntryProps) {
  return (
    <div className="flex items-center justify-between p-3 rounded-lg bg-panel2/30 hover:bg-panel2/50 transition-colors">
      <div className="flex items-center space-x-3">
        <span className="text-sm font-bold text-muted w-6">#{rank}</span>
        <div>
          <span className="font-medium text-text">{name}</span>
          <div className="flex items-center space-x-2 mt-1">
            <div className="w-16 h-1.5 bg-panel2 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-brand to-brand2"
                style={{ width: `${percentage}%` }}
              />
            </div>
            <span className="text-xs text-muted">{percentage}%</span>
          </div>
        </div>
      </div>
      <span className="text-sm font-semibold text-brand">
        {completedSets}/{totalSets}
      </span>
    </div>
  );
}

interface ActivityEntryProps {
  rank: number;
  name: string;
  cardsAdded: number;
  tradesCompleted: number;
  isActive?: boolean;
}

function ActivityEntry({ rank, name, cardsAdded, tradesCompleted, isActive }: ActivityEntryProps) {
  return (
    <div className="flex items-center justify-between p-3 rounded-lg bg-panel2/30 hover:bg-panel2/50 transition-colors">
      <div className="flex items-center space-x-3">
        <span className="text-sm font-bold text-muted w-6">#{rank}</span>
        <div>
          <div className="flex items-center space-x-2">
            <span className="font-medium text-text">{name}</span>
            {isActive && (
              <span className="w-2 h-2 bg-success rounded-full animate-pulse"></span>
            )}
          </div>
          <div className="text-xs text-muted">
            {cardsAdded} cards • {tradesCompleted} trades
          </div>
        </div>
      </div>
    </div>
  );
}

interface AchievementShowcaseProps {
  achievement: string;
  description: string;
  unlockedBy: string;
  timeAgo: string;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
}

function AchievementShowcase({ achievement, description, unlockedBy, timeAgo, rarity }: AchievementShowcaseProps) {
  const rarityColors = {
    common: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
    uncommon: 'bg-green-500/20 text-green-400 border-green-500/30',
    rare: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    epic: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    legendary: 'bg-orange-500/20 text-orange-400 border-orange-500/30'
  };

  const rarityIcons = {
    common: '⚪',
    uncommon: '🟢',
    rare: '🔵',
    epic: '🟣',
    legendary: '🟠'
  };

  return (
    <div className={cn(
      'p-4 rounded-lg border transition-colors hover:scale-105',
      rarityColors[rarity]
    )}>
      <div className="flex items-start justify-between mb-2">
        <span className="text-lg">{rarityIcons[rarity]}</span>
        <span className="text-xs font-medium uppercase tracking-wide opacity-75">
          {rarity}
        </span>
      </div>
      <h4 className="font-semibold text-text mb-1">{achievement}</h4>
      <p className="text-sm text-muted mb-3">{description}</p>
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium">{unlockedBy}</span>
        <span className="text-muted">{timeAgo}</span>
      </div>
    </div>
  );
}