import Link from 'next/link';

interface WantedBoardTabProps {
  isAuthenticated: boolean;
}

export function WantedBoardTab({ isAuthenticated }: WantedBoardTabProps) {
  // Mock data for the wanted board
  const wantedPosts = [
    {
      id: '1',
      cardName: 'Charizard Base Set Holo',
      setName: 'Base Set',
      condition: 'Near Mint',
      maxPrice: 150,
      userName: 'CardHunter92',
      timeAgo: '2 hours ago',
      userOwnsCard: true
    },
    {
      id: '2',
      cardName: 'Blastoise Base Set Holo',
      setName: 'Base Set',
      condition: 'Light Play',
      maxPrice: 80,
      userName: 'WaterMaster',
      timeAgo: '4 hours ago',
      userOwnsCard: false
    },
    {
      id: '3',
      cardName: 'Pikachu Illustrator',
      setName: 'Promo',
      condition: 'Any',
      maxPrice: 2000,
      userName: 'GrailSeeker',
      timeAgo: '1 day ago',
      userOwnsCard: false
    },
    {
      id: '4',
      cardName: 'Alakazam Base Set Holo',
      setName: 'Base Set',
      condition: 'Near Mint',
      maxPrice: 45,
      userName: 'PsychicCollector',
      timeAgo: '1 day ago',
      userOwnsCard: true
    }
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <section className="text-center space-y-4">
        <h2 className="text-2xl md:text-3xl font-bold text-gradient">Wanted Board</h2>
        <p className="text-lg text-muted">
          Community marketplace for wanted cards
        </p>
      </section>

      {/* Wanted Board Stats */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="panel p-4 text-center">
          <div className="text-2xl font-bold text-brand">47</div>
          <div className="text-sm text-muted">Active Posts</div>
        </div>
        <div className="panel p-4 text-center">
          <div className="text-2xl font-bold text-success">23</div>
          <div className="text-sm text-muted">Active Users</div>
        </div>
        <div className="panel p-4 text-center">
          <div className="text-2xl font-bold text-accent">€1,247</div>
          <div className="text-sm text-muted">Total Value</div>
        </div>
        <div className="panel p-4 text-center">
          <div className="text-2xl font-bold text-warning">2.3h</div>
          <div className="text-sm text-muted">Avg Response</div>
        </div>
      </section>

      {/* Wanted Posts */}
      <section className="panel p-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-text mb-2">Recent Wanted Posts</h3>
            <p className="text-muted">Cards that collectors are actively seeking</p>
          </div>
          {isAuthenticated && (
            <Link href={"/wishlist" as any} className="btn btn-primary">
              Post Your Wants
            </Link>
          )}
        </div>
        
        <div className="space-y-4">
          {wantedPosts.map((post) => (
            <WantedPostItem key={post.id} post={post} isAuthenticated={isAuthenticated} />
          ))}
        </div>

        <div className="mt-6 text-center">
          <Link href={"/wanted-board" as any} className="btn btn-secondary">
            View All Posts
          </Link>
        </div>
      </section>

      {/* How It Works */}
      <section className="panel p-6">
        <div className="mb-6">
          <h3 className="text-xl font-bold text-text mb-2">How the Wanted Board Works</h3>
          <p className="text-muted">Connect with other collectors to find the cards you need</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center space-y-3">
            <div className="w-12 h-12 bg-brand/20 rounded-full flex items-center justify-center mx-auto">
              <span className="text-xl">📝</span>
            </div>
            <h4 className="font-semibold text-text">1. Post Your Wants</h4>
            <p className="text-sm text-muted">
              Add cards you're looking for to your wishlist. Set your preferred condition and maximum price.
            </p>
          </div>
          
          <div className="text-center space-y-3">
            <div className="w-12 h-12 bg-success/20 rounded-full flex items-center justify-center mx-auto">
              <span className="text-xl">🔍</span>
            </div>
            <h4 className="font-semibold text-text">2. Get Matched</h4>
            <p className="text-sm text-muted">
              Other collectors who have your wanted cards will see your posts and can reach out to trade.
            </p>
          </div>
          
          <div className="text-center space-y-3">
            <div className="w-12 h-12 bg-accent/20 rounded-full flex items-center justify-center mx-auto">
              <span className="text-xl">🤝</span>
            </div>
            <h4 className="font-semibold text-text">3. Complete Trades</h4>
            <p className="text-sm text-muted">
              Negotiate terms, exchange contact information, and complete your trades safely.
            </p>
          </div>
        </div>
      </section>

      {/* Trading Tips */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="panel p-6">
          <div className="mb-4">
            <h3 className="text-lg font-bold text-text mb-2">💡 Trading Tips</h3>
          </div>
          
          <div className="space-y-3">
            <TradingTip
              icon="✅"
              title="Be Specific"
              description="Include exact card names, set details, and condition preferences"
            />
            <TradingTip
              icon="💰"
              title="Fair Pricing"
              description="Research market values and set reasonable maximum prices"
            />
            <TradingTip
              icon="📸"
              title="Request Photos"
              description="Always ask for photos before finalizing high-value trades"
            />
            <TradingTip
              icon="🛡️"
              title="Use Protection"
              description="For valuable cards, consider using tracking and insurance"
            />
          </div>
        </div>

        <div className="panel p-6">
          <div className="mb-4">
            <h3 className="text-lg font-bold text-text mb-2">📊 Market Insights</h3>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-lg bg-panel2/30">
              <div>
                <span className="text-sm font-medium text-text">Most Wanted Card</span>
                <p className="text-xs text-muted">Charizard Base Set Holo</p>
              </div>
              <span className="text-sm font-bold text-brand">47 requests</span>
            </div>
            
            <div className="flex items-center justify-between p-3 rounded-lg bg-panel2/30">
              <div>
                <span className="text-sm font-medium text-text">Average Response Time</span>
                <p className="text-xs text-muted">Time to first contact</p>
              </div>
              <span className="text-sm font-bold text-success">2.3 hours</span>
            </div>
            
            <div className="flex items-center justify-between p-3 rounded-lg bg-panel2/30">
              <div>
                <span className="text-sm font-medium text-text">Success Rate</span>
                <p className="text-xs text-muted">Wanted posts that lead to trades</p>
              </div>
              <span className="text-sm font-bold text-accent">73%</span>
            </div>
          </div>
        </div>
      </section>

      {/* Call to Action */}
      {!isAuthenticated ? (
        <section className="panel p-8 bg-aurora-radial border border-brand/20 text-center">
          <div className="space-y-4">
            <h3 className="text-xl font-bold text-text">Ready to find your cards?</h3>
            <p className="text-muted">
              Join the community and start posting your wanted cards today
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/auth/signin" className="btn btn-primary">
                Sign Up Free
              </Link>
              <Link href="/sets" className="btn btn-ghost">
                Browse Sets
              </Link>
            </div>
          </div>
        </section>
      ) : (
        <section className="text-center">
          <Link href={"/wishlist" as any} className="btn btn-primary btn-lg">
            Post Your Wants
          </Link>
        </section>
      )}
    </div>
  );
}

// Helper Components
interface WantedPost {
  id: string;
  cardName: string;
  setName: string;
  condition: string;
  maxPrice: number;
  userName: string;
  timeAgo: string;
  userOwnsCard: boolean;
}

interface WantedPostItemProps {
  post: WantedPost;
  isAuthenticated: boolean;
}

function WantedPostItem({ post, isAuthenticated }: WantedPostItemProps) {
  return (
    <div className={`p-4 rounded-lg border transition-colors ${
      post.userOwnsCard
        ? 'border-success/50 bg-success/5'
        : 'border-border bg-panel2/30 hover:bg-panel2/50'
    }`}>
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-start justify-between mb-2">
            <div>
              <h4 className="font-semibold text-text">{post.cardName}</h4>
              <p className="text-sm text-muted">{post.setName} • {post.condition}</p>
              <p className="text-sm text-brand font-medium mt-1">
                Max: €{post.maxPrice}
              </p>
            </div>
            
            <div className="text-right">
              <p className="text-sm font-medium text-text">{post.userName}</p>
              <p className="text-xs text-muted">{post.timeAgo}</p>
            </div>
          </div>
          
          {post.userOwnsCard && (
            <div className="flex items-center space-x-2 mt-3">
              <button className="btn btn-primary btn-sm">
                <span className="text-xs">Offer Trade</span>
              </button>
              <button className="btn btn-secondary btn-sm">
                <span className="text-xs">Message</span>
              </button>
              <div className="flex items-center space-x-1 text-success text-xs ml-auto">
                <span>✓</span>
                <span>You have this card!</span>
              </div>
            </div>
          )}
          
          {!post.userOwnsCard && isAuthenticated && (
            <div className="mt-3">
              <button className="btn btn-ghost btn-sm">
                <span className="text-xs">Contact User</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface TradingTipProps {
  icon: string;
  title: string;
  description: string;
}

function TradingTip({ icon, title, description }: TradingTipProps) {
  return (
    <div className="flex items-start space-x-3">
      <span className="text-lg flex-shrink-0 mt-0.5">{icon}</span>
      <div>
        <h4 className="text-sm font-medium text-text">{title}</h4>
        <p className="text-xs text-muted mt-1">{description}</p>
      </div>
    </div>
  );
}