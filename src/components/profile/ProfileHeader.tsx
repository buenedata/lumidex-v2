'use client'

import { useState, Fragment } from 'react'
import { useRouter } from 'next/navigation'
import { Camera, MapPin, Globe, Calendar, Edit3, Loader2, Check, X, Settings } from 'lucide-react'
import { Dialog, Transition } from '@headlessui/react'
import { cn } from '@/lib/utils'
import { uploadAvatar, uploadBanner } from '@/lib/supabase/storage'
import { updateProfileClient } from '@/lib/profile/client'
import SettingsDialog from './SettingsDialog'

interface User {
  id: string
  name: string
  email: string
  joinedDate: string
  avatar?: string | null
  banner?: string | null
  bio?: string
  location?: string
  website?: string
}

interface ProfileHeaderProps {
  user: User
}

export default function ProfileHeader({ user }: ProfileHeaderProps) {
  const router = useRouter()
  const [isEditingBio, setIsEditingBio] = useState(false)
  const [isEditingDisplayName, setIsEditingDisplayName] = useState(false)
  const [bio, setBio] = useState(user.bio || '')
  const [displayName, setDisplayName] = useState(user.name || '')
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false)
  const [isUploadingBanner, setIsUploadingBanner] = useState(false)
  const [isSavingBio, setIsSavingBio] = useState(false)
  const [isSavingDisplayName, setIsSavingDisplayName] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState(user.avatar)
  const [bannerUrl, setBannerUrl] = useState(user.banner)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [showSettings, setShowSettings] = useState(false)

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setIsUploadingAvatar(true)
    setUploadError(null)

    try {
      const result = await uploadAvatar(user.id, file)
      
      if (result.success && result.url) {
        setAvatarUrl(result.url)
        // Update profile in database
        const updateResult = await updateProfileClient(user.id, { avatar_url: result.url })
        if (updateResult.success) {
          // Refresh the page to get updated data from server
          router.refresh()
        } else {
          setUploadError(updateResult.error || 'Failed to update profile')
        }
      } else {
        setUploadError(result.error || 'Failed to upload avatar')
      }
    } catch (error) {
      setUploadError('An unexpected error occurred')
    } finally {
      setIsUploadingAvatar(false)
      // Clear the input
      event.target.value = ''
    }
  }

  const handleBannerUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setIsUploadingBanner(true)
    setUploadError(null)

    try {
      const result = await uploadBanner(user.id, file)
      
      if (result.success && result.url) {
        setBannerUrl(result.url)
        // Update profile in database
        const updateResult = await updateProfileClient(user.id, { banner_url: result.url })
        if (updateResult.success) {
          // Refresh the page to get updated data from server
          router.refresh()
        } else {
          setUploadError(updateResult.error || 'Failed to update profile')
        }
      } else {
        setUploadError(result.error || 'Failed to upload banner')
      }
    } catch (error) {
      setUploadError('An unexpected error occurred')
    } finally {
      setIsUploadingBanner(false)
      // Clear the input
      event.target.value = ''
    }
  }

  const handleSaveBio = async () => {
    setIsSavingBio(true)
    try {
      const result = await updateProfileClient(user.id, { bio })
      if (result.success) {
        setIsEditingBio(false)
        // Refresh the page to get updated data from server
        router.refresh()
      } else {
        setUploadError(result.error || 'Failed to save bio')
      }
    } catch (error) {
      setUploadError('An unexpected error occurred')
    } finally {
      setIsSavingBio(false)
    }
  }

  const handleSaveDisplayName = async () => {
    setIsSavingDisplayName(true)
    try {
      const result = await updateProfileClient(user.id, { display_name: displayName })
      if (result.success) {
        setIsEditingDisplayName(false)
        // Refresh the page to get updated data from server
        router.refresh()
      } else {
        setUploadError(result.error || 'Failed to save display name')
      }
    } catch (error) {
      setUploadError('An unexpected error occurred')
    } finally {
      setIsSavingDisplayName(false)
    }
  }

  const formatJoinDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric'
    })
  }

  return (
    <div className="relative">
      {/* Banner Section */}
      <div className="relative h-48 sm:h-64 bg-aurora overflow-hidden">
        {bannerUrl && (
          <img
            src={bannerUrl}
            alt="Profile banner"
            className="w-full h-full object-cover"
          />
        )}
        
        {/* Banner Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
        
        {/* Banner Upload Button */}
        <label className={cn(
          "btn btn-ghost absolute top-4 right-4 p-2 z-10",
          isUploadingBanner ? "cursor-not-allowed opacity-75" : "cursor-pointer"
        )}>
          {isUploadingBanner ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Camera className="h-5 w-5" />
          )}
          <input
            type="file"
            accept="image/*"
            onChange={handleBannerUpload}
            disabled={isUploadingBanner}
            className="hidden"
          />
        </label>
      </div>

      {/* Profile Content */}
      <div className="relative dashboard-container">
        <div className="sm:flex sm:items-end sm:space-x-5">
          {/* Avatar */}
          <div className="relative -mt-12 sm:-mt-16">
            <div className="relative">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={user.name}
                  className="h-24 w-24 sm:h-32 sm:w-32 rounded-full ring-4 ring-panel bg-panel object-cover object-center"
                />
              ) : (
                <div className="h-24 w-24 sm:h-32 sm:w-32 rounded-full ring-4 ring-panel bg-aurora flex items-center justify-center">
                  <span className="text-white text-2xl sm:text-3xl font-bold">
                    {user.name.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
              
              {/* Avatar Upload Button */}
              <label className={cn(
                "absolute bottom-0 right-0 bg-panel border-2 border-border rounded-full p-1.5 hover:bg-panel2 transition-colors shadow-sm",
                isUploadingAvatar ? "cursor-not-allowed opacity-75" : "cursor-pointer"
              )}>
                {isUploadingAvatar ? (
                  <Loader2 className="h-4 w-4 text-muted animate-spin" />
                ) : (
                  <Camera className="h-4 w-4 text-muted" />
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  disabled={isUploadingAvatar}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* User Info */}
          <div className="mt-6 sm:flex-1 sm:min-w-0 sm:flex sm:items-center sm:justify-end sm:space-x-6 sm:pb-1">
            <div className="sm:hidden md:block mt-6 min-w-0 flex-1">
              {isEditingDisplayName ? (
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="text-2xl font-bold text-text bg-transparent border-b-2 border-brand focus:outline-none focus:border-brand2 field"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveDisplayName()
                      if (e.key === 'Escape') {
                        setDisplayName(user.name)
                        setIsEditingDisplayName(false)
                      }
                    }}
                  />
                  <button
                    onClick={handleSaveDisplayName}
                    disabled={isSavingDisplayName}
                    className="text-success hover:text-success/80 disabled:opacity-50"
                  >
                    {isSavingDisplayName ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  </button>
                  <button
                    onClick={() => {
                      setDisplayName(user.name)
                      setIsEditingDisplayName(false)
                    }}
                    className="text-muted hover:text-text"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <h1 className="text-2xl font-bold text-text truncate">
                    {displayName}
                  </h1>
                  <button
                    onClick={() => setIsEditingDisplayName(true)}
                    className="text-muted hover:text-text"
                  >
                    <Edit3 className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
            
            {/* Settings Button */}
            <div className="mt-6 sm:mt-0">
              <button
                onClick={() => setShowSettings(true)}
                className="btn btn-secondary btn-sm flex items-center space-x-2"
                title="Settings"
              >
                <Settings className="h-4 w-4" />
                <span className="hidden sm:block">Settings</span>
              </button>
            </div>
          </div>
        </div>

        {/* User Details */}
        <div className="hidden sm:block md:hidden mt-6 min-w-0 flex-1">
          {isEditingDisplayName ? (
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="text-2xl font-bold text-text bg-transparent border-b-2 border-brand focus:outline-none focus:border-brand2 field"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveDisplayName()
                  if (e.key === 'Escape') {
                    setDisplayName(user.name)
                    setIsEditingDisplayName(false)
                  }
                }}
              />
              <button
                onClick={handleSaveDisplayName}
                disabled={isSavingDisplayName}
                className="text-success hover:text-success/80 disabled:opacity-50"
              >
                {isSavingDisplayName ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              </button>
              <button
                onClick={() => {
                  setDisplayName(user.name)
                  setIsEditingDisplayName(false)
                }}
                className="text-muted hover:text-text"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-bold text-text truncate">
                {displayName}
              </h1>
              <button
                onClick={() => setIsEditingDisplayName(true)}
                className="text-muted hover:text-text"
              >
                <Edit3 className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>

        <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Bio Section */}
          <div className="lg:col-span-2">
            <div className="panel p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-medium text-text">About</h2>
                <button
                  onClick={() => setIsEditingBio(!isEditingBio)}
                  className="text-muted hover:text-text"
                >
                  <Edit3 className="h-4 w-4" />
                </button>
              </div>
              
              {isEditingBio ? (
                <div className="space-y-3">
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    className="field w-full"
                    rows={3}
                    placeholder="Tell us about your collection journey..."
                  />
                  <div className="flex space-x-2">
                    <button
                      onClick={handleSaveBio}
                      disabled={isSavingBio}
                      className="btn btn-primary btn-sm flex items-center space-x-1"
                    >
                      {isSavingBio && <Loader2 className="h-3 w-3 animate-spin" />}
                      <span>Save</span>
                    </button>
                    <button
                      onClick={() => {
                        setBio(user.bio || '')
                        setIsEditingBio(false)
                      }}
                      className="btn btn-secondary btn-sm"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-muted">
                  {bio || 'No bio added yet. Click the edit button to add one!'}
                </p>
              )}
            </div>
          </div>

          {/* Profile Info */}
          <div className="space-y-4">
            <div className="panel p-6">
              <h3 className="text-lg font-medium text-text mb-4">Profile Info</h3>
              <div className="space-y-3">
                <div className="flex items-center text-sm text-muted">
                  <Calendar className="h-4 w-4 mr-2" />
                  Joined {formatJoinDate(user.joinedDate)}
                </div>
                
                {user.location && (
                  <div className="flex items-center text-sm text-muted">
                    <MapPin className="h-4 w-4 mr-2" />
                    {user.location}
                  </div>
                )}
                
                {user.website && (
                  <div className="flex items-center text-sm text-muted">
                    <Globe className="h-4 w-4 mr-2" />
                    <a
                      href={user.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-brand hover:text-brand2 transition-colors"
                    >
                      {user.website}
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {uploadError && (
          <div className="mt-4 p-3 activity-danger border border-border text-danger rounded-xl">
            {uploadError}
            <button
              onClick={() => setUploadError(null)}
              className="ml-2 text-danger hover:opacity-80"
            >
              ×
            </button>
          </div>
        )}

        {/* Settings Dialog */}
        <SettingsDialog
          open={showSettings}
          onClose={() => setShowSettings(false)}
          userId={user.id}
          userEmail={user.email}
        />
      </div>
    </div>
  )
}