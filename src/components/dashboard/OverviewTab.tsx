import Link from 'next/link';
import { SocialButtons } from '@/components/dashboard/SocialButtons';

interface OverviewTabProps {
  isAuthenticated: boolean;
  user: { name?: string; email?: string } | null;
}

export function OverviewTab({ isAuthenticated, user }: OverviewTabProps) {
  return (
    <div className="space-y-8">
      {/* Global Achievements & Community Activity */}
      <section>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Community Achievements */}
          <div className="panel p-6">
            <div className="mb-6">
              <h3 className="text-xl font-bold text-text mb-2">Community Achievements</h3>
              <p className="text-muted">Recent milestones and notable finds</p>
            </div>
            
            <div className="space-y-4">
              <AchievementNotification 
                icon="🏆"
                title="@RareHunter just completed Base Set Shadowless!"
                timeAgo="2 minutes ago"
              />
              <AchievementNotification 
                icon="💎"
                title="@CardNinja found a PSA 10 Charizard worth €5,000!"
                timeAgo="1 hour ago"
              />
              <AchievementNotification 
                icon="⭐"
                title="@SetMaster unlocked 'Neo Genesis Complete' achievement!"
                timeAgo="3 hours ago"
              />
              <AchievementNotification 
                icon="🔥"
                title="@TradePro completed their 100th successful trade!"
                timeAgo="5 hours ago"
              />
            </div>

            <div className="mt-6">
              <h4 className="text-lg font-semibold text-text mb-4">Community Goals</h4>
              <div className="space-y-3">
                <CommunityGoal 
                  title="3M Total Cards"
                  current={2500000}
                  target={3000000}
                  percentage={83}
                />
                <CommunityGoal 
                  title="20K Active Users"
                  current={15200}
                  target={20000}
                  percentage={76}
                />
              </div>
            </div>
          </div>

          {/* Trading & Community Hub */}
          <div className="panel p-6">
            <div className="mb-6">
              <h3 className="text-xl font-bold text-text mb-2">Trading & Community</h3>
              <p className="text-muted">Live activity and hot trades</p>
            </div>
            
            <div className="space-y-6">
              {/* Hot Trades */}
              <div>
                <h4 className="text-lg font-semibold text-text mb-3">🔥 Hot Trades</h4>
                <div className="space-y-2">
                  <TradingActivity 
                    title="Charizard Base ↔ Blastoise + €50"
                    subtitle="2 watchers • Ends in 2 days"
                  />
                  <TradingActivity 
                    title="Complete Jungle Set ↔ Modern EX lot"
                    subtitle="5 watchers • Ends in 1 day"
                  />
                  <TradingActivity 
                    title="PSA Graded lot ↔ Raw collection"
                    subtitle="8 watchers • Ends in 4 hours"
                  />
                </div>
              </div>

              {/* Active Now */}
              <div>
                <h4 className="text-lg font-semibold text-text mb-3">👥 Active Now</h4>
                <div className="flex flex-wrap gap-2">
                  <ActiveUserBadge name="CardMaster92" status="online" />
                  <ActiveUserBadge name="RareHunter" status="trading" />
                  <ActiveUserBadge name="SetCollector" status="browsing" />
                  <ActiveUserBadge name="TradeQueen" status="online" />
                </div>
              </div>

              {/* Market Stats */}
              <div>
                <h4 className="text-lg font-semibold text-text mb-3">📈 Today's Activity</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 rounded-lg bg-panel2/50">
                    <div className="text-xl font-bold text-success">47</div>
                    <div className="text-sm text-muted">Trades Completed</div>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-panel2/50">
                    <div className="text-xl font-bold text-brand">€12,847</div>
                    <div className="text-sm text-muted">Total Value</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 text-center">
              <Link href={"/trading" as any} className="btn btn-primary">
                Join Trading Hub
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Enhanced CTA Section */}
      <section className="panel p-8 bg-aurora-radial border border-brand/20">
        <div className="text-center space-y-6">
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-text">
              {isAuthenticated ? 'Level up your collection' : 'Ready to join our community?'}
            </h2>
            <p className="text-muted max-w-2xl mx-auto">
              {isAuthenticated 
                ? 'Climb the leaderboards, complete achievements, and connect with fellow collectors'
                : 'Join thousands of collectors in the ultimate Pokemon TCG community with trading, achievements, and real-time market data'
              }
            </p>
          </div>
          
          {/* Social Proof */}
          <div className="flex items-center justify-center space-x-8 text-sm text-muted">
            <div className="text-center">
              <div className="text-2xl font-bold text-text">2.5M+</div>
              <div>Cards Tracked</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-text">15K+</div>
              <div>Collectors</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-text">500+</div>
              <div>Sets Supported</div>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            {!isAuthenticated ? (
              <>
                <Link href="/auth/signin" className="btn btn-primary btn-lg">
                  Get Started Free
                </Link>
                <Link href="/sets" className="btn btn-ghost btn-lg">
                  Explore Sets
                </Link>
              </>
            ) : (
              <>
                <Link href={"/profile" as any} className="btn btn-primary btn-lg">
                  View My Profile
                </Link>
                <Link href={"/trading" as any} className="btn btn-ghost btn-lg">
                  Start Trading
                </Link>
              </>
            )}
          </div>

          {/* Social Media Buttons */}
          <div className="flex justify-center">
            <SocialButtons />
          </div>
        </div>
      </section>
    </div>
  );
}

// Helper Components (shared with main page)
interface AchievementNotificationProps {
  icon: string;
  title: string;
  timeAgo: string;
}

function AchievementNotification({ icon, title, timeAgo }: AchievementNotificationProps) {
  return (
    <div className="flex items-start space-x-3 p-3 rounded-lg bg-panel2/30">
      <span className="text-lg">{icon}</span>
      <div className="flex-1">
        <p className="text-sm font-medium text-text">{title}</p>
        <p className="text-xs text-muted mt-1">{timeAgo}</p>
      </div>
    </div>
  );
}

interface CommunityGoalProps {
  title: string;
  current: number;
  target: number;
  percentage: number;
}

function CommunityGoal({ title, current, target, percentage }: CommunityGoalProps) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-text">{title}</span>
        <span className="text-sm text-muted">{percentage}%</span>
      </div>
      <div className="w-full h-2 bg-panel2 rounded-full overflow-hidden">
        <div 
          className="h-full bg-gradient-to-r from-brand to-brand2 transition-all duration-700"
          style={{ width: `${percentage}%` }}
        />
      </div>
      <div className="flex items-center justify-between mt-1">
        <span className="text-xs text-muted">{current.toLocaleString()}</span>
        <span className="text-xs text-muted">{target.toLocaleString()}</span>
      </div>
    </div>
  );
}

interface TradingActivityProps {
  title: string;
  subtitle: string;
}

function TradingActivity({ title, subtitle }: TradingActivityProps) {
  return (
    <div className="p-2 rounded bg-panel2/20 hover:bg-panel2/40 transition-colors cursor-pointer">
      <p className="text-sm font-medium text-text">{title}</p>
      <p className="text-xs text-muted">{subtitle}</p>
    </div>
  );
}

interface ActiveUserBadgeProps {
  name: string;
  status: 'online' | 'trading' | 'browsing';
}

function ActiveUserBadge({ name, status }: ActiveUserBadgeProps) {
  const statusColors = {
    online: 'bg-success/20 text-success',
    trading: 'bg-brand/20 text-brand',
    browsing: 'bg-brand2/20 text-brand2'
  };

  return (
    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${statusColors[status]}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current mr-1.5" />
      {name}
    </span>
  );
}