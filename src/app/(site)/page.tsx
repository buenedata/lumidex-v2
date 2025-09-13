import { Tabs } from '@/components/ui/Tabs';
import { OverviewTab } from '@/components/dashboard/OverviewTab';
import { LeaderboardsTab } from '@/components/dashboard/LeaderboardsTab';
import { WantedBoardTab } from '@/components/dashboard/WantedBoardTab';
import { cn } from '@/lib/utils';

export default function HomePage() {
  // Mock user data for authenticated users
  const isAuthenticated = false; // This would come from your auth system
  const user: { name?: string; email?: string } | null = isAuthenticated ? { name: 'Collector', email: 'user@example.com' } : null;

  // Mock community data - in real app this would come from API/database
  const communityStats = {
    totalCollectors: 15247,
    totalCards: 2500000,
    totalValue: 2500000,
    todayTrades: 1203
  };

  const tabs = [
    {
      id: 'overview',
      label: 'Overview',
      icon: <HomeIcon className="w-4 h-4" />,
      content: <OverviewTab isAuthenticated={isAuthenticated} user={user} />
    },
    {
      id: 'leaderboards',
      label: 'Leaderboards',
      icon: <TrophyIcon className="w-4 h-4" />,
      content: <LeaderboardsTab isAuthenticated={isAuthenticated} />
    },
    {
      id: 'wanted-board',
      label: 'Wanted Board',
      icon: <StarIcon className="w-4 h-4" />,
      badge: '12',
      content: <WantedBoardTab isAuthenticated={isAuthenticated} />
    }
  ];

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <section className="space-y-6">
        <div className="text-center space-y-4">
          <h1 className="text-3xl md:text-4xl font-bold text-gradient">
            {isAuthenticated
              ? `Welcome back, ${user?.name || 'Collector'}! 🏆`
              : 'Lumidex'
            }
          </h1>
          <p className="text-lg md:text-xl text-muted">
            {isAuthenticated
              ? 'Join the action in our thriving collector community'
              : `${communityStats.totalCollectors.toLocaleString()} active collectors • €${(communityStats.totalValue / 1000000).toFixed(1)}M+ cards tracked • ${communityStats.todayTrades.toLocaleString()} trades today`
            }
          </p>
        </div>
      </section>

      {/* Tabbed Dashboard */}
      <section>
        <Tabs
          tabs={tabs}
          defaultTab="overview"
          variant="default"
          size="md"
        />
      </section>
    </div>
  );
}

// Icons for tabs
function HomeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  );
}

function TrophyIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
    </svg>
  );
}

function StarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
    </svg>
  );
}