import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import ProfileHeader from '@/components/profile/ProfileHeader'
import CollectionOverview from '@/components/profile/CollectionOverview'
import PersonalStatistics from '@/components/profile/PersonalStatistics'
import CollectionManagerWithSuspense from '@/components/profile/CollectionManagerWithSuspense'
import RecentActivity from '@/components/profile/RecentActivity'
import AchievementsList from '@/components/profile/AchievementsList'
import { getCurrentUser } from '@/lib/supabase/server'
import { createClient } from '@/lib/supabase/server'

export default async function ProfilePage() {
  // Get the authenticated user
  const authUser = await getCurrentUser()
  
  if (!authUser) {
    redirect('/auth/signin')
  }

  // Get user profile from database
  const supabase = createClient()
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', authUser.id)
    .single()

  // If no profile exists, create one with defaults
  if (!profile) {
    await supabase
      .from('profiles')
      .upsert({
        id: authUser.id,
        username: authUser.email?.split('@')[0] || null,
        preferred_currency: 'EUR',
        preferred_price_source: 'cardmarket'
      })
  }

  // Combine auth user data with profile data, prioritizing database profile data
  const user = {
    id: authUser.id,
    name: profile?.display_name || profile?.username || authUser.email?.split('@')[0] || 'User',
    email: authUser.email || '',
    joinedDate: profile?.created_at ? new Date(profile.created_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    avatar: profile?.avatar_url || authUser.user_metadata?.avatar_url || null,
    banner: profile?.banner_url || null,
    bio: profile?.bio || authUser.user_metadata?.bio || null,
    location: profile?.location || authUser.user_metadata?.location || null,
    website: profile?.website || authUser.user_metadata?.website || null
  }

  return (
    <div className="min-h-screen bg-bg">
      {/* Profile Header with Banner/Avatar */}
      <Suspense fallback={<div className="h-64 skeleton" />}>
        <ProfileHeader user={user} />
      </Suspense>

      {/* Main Profile Content */}
      <div className="dashboard-container py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Personal Stats & Overview */}
          <div className="lg:col-span-1 space-y-6">
            <Suspense fallback={<div className="widget-sm skeleton rounded-2xl" />}>
              <PersonalStatistics userId={user.id} />
            </Suspense>
            
            <Suspense fallback={<div className="widget-lg skeleton rounded-2xl" />}>
              <CollectionOverview userId={user.id} />
            </Suspense>

            <Suspense fallback={<div className="widget-sm skeleton rounded-2xl" />}>
              <AchievementsList userId={user.id} />
            </Suspense>
          </div>

          {/* Right Column - Collection Management */}
          <div className="lg:col-span-2 space-y-6">
            <CollectionManagerWithSuspense userId={user.id} />

            <Suspense fallback={<div className="widget-lg skeleton rounded-2xl" />}>
              <RecentActivity userId={user.id} />
            </Suspense>
          </div>
        </div>
      </div>
    </div>
  )
}