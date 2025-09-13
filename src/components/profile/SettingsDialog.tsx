'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Tab } from '@headlessui/react'
import { Settings, User, AlertTriangle, Save, Loader2 } from 'lucide-react'
import { Dialog } from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import { Field } from '@/components/ui/Field'
import { Listbox } from '@/components/ui/Listbox'
import { PriceSourceToggleWithLabel } from '@/components/ui/PriceSourceToggle'
import { cn } from '@/lib/utils'
import { updateUserPreferencesClient, getUserPreferencesClient, deleteUserCollectionClient, getUserCollectionCountClient, deleteUserAccountClient } from '@/lib/profile/preferences'
import { updateUserEmail, updateUserPassword, reauthenticateUser } from '@/lib/supabase/auth'
import type { CurrencyCode, PriceSource, UserPreferences } from '@/types'

interface SettingsDialogProps {
  open: boolean
  onClose: () => void
  userId: string
  userEmail: string
}

const CURRENCY_OPTIONS = [
  { value: 'EUR', label: 'Euro (€)', description: 'European currency' },
  { value: 'USD', label: 'US Dollar ($)', description: 'United States currency' },
  { value: 'GBP', label: 'British Pound (£)', description: 'United Kingdom currency' },
  { value: 'NOK', label: 'Norwegian Krone (kr)', description: 'Norwegian currency' },
]

export default function SettingsDialog({ open, onClose, userId, userEmail }: SettingsDialogProps) {
  const router = useRouter()
  
  // Tab state
  const [selectedTab, setSelectedTab] = useState(0)
  
  // Preferences state
  const [preferences, setPreferences] = useState<UserPreferences>({
    preferred_currency: 'EUR',
    preferred_price_source: 'cardmarket'
  })
  const [preferencesLoading, setPreferencesLoading] = useState(true)
  const [preferencesSaving, setPreferencesSaving] = useState(false)
  
  // Account state
  const [newEmail, setNewEmail] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [emailSaving, setEmailSaving] = useState(false)
  const [passwordSaving, setPasswordSaving] = useState(false)
  
  // Danger zone state
  const [collectionCount, setCollectionCount] = useState(0)
  const [deleteCollectionConfirm, setDeleteCollectionConfirm] = useState('')
  const [deleteAccountConfirm, setDeleteAccountConfirm] = useState('')
  const [deleteAccountPassword, setDeleteAccountPassword] = useState('')
  const [deletingCollection, setDeletingCollection] = useState(false)
  const [deletingAccount, setDeletingAccount] = useState(false)
  
  // Feedback state
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  // Load user preferences and collection count
  useEffect(() => {
    if (open && userId) {
      loadUserData()
    }
  }, [open, userId])

  const loadUserData = async () => {
    setPreferencesLoading(true)
    
    try {
      const [prefsResult, countResult] = await Promise.all([
        getUserPreferencesClient(userId),
        getUserCollectionCountClient(userId)
      ])
      
      if (prefsResult.success && prefsResult.data) {
        setPreferences(prefsResult.data)
      } else if (prefsResult.error) {
        console.error('Error loading preferences:', prefsResult.error)
      }
      
      if (countResult.success && countResult.count !== undefined) {
        setCollectionCount(countResult.count)
      } else if (countResult.error) {
        console.error('Error loading collection count:', countResult.error)
      }
    } catch (error) {
      console.error('Error loading user data:', error)
      setMessage({ type: 'error', text: 'Failed to load user data' })
    } finally {
      setPreferencesLoading(false)
    }
  }

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text })
    setTimeout(() => setMessage(null), 5000)
  }

  const handleSavePreferences = async () => {
    setPreferencesSaving(true)
    
    try {
      const result = await updateUserPreferencesClient(userId, preferences)
      
      if (result.success) {
        showMessage('success', 'Preferences saved successfully!')
        router.refresh() // Refresh to update UI with new preferences
      } else {
        showMessage('error', result.error || 'Failed to save preferences')
      }
    } catch (error) {
      showMessage('error', 'An unexpected error occurred')
    } finally {
      setPreferencesSaving(false)
    }
  }

  const handleUpdateEmail = async () => {
    if (!newEmail.trim()) {
      showMessage('error', 'Please enter a new email address')
      return
    }

    if (newEmail === userEmail) {
      showMessage('error', 'New email must be different from current email')
      return
    }

    setEmailSaving(true)
    
    try {
      const result = await updateUserEmail(newEmail)
      
      if (result.success) {
        showMessage('success', 'Email update requested! Check your inbox for verification.')
        setNewEmail('')
      } else {
        showMessage('error', result.error || 'Failed to update email')
      }
    } catch (error) {
      showMessage('error', 'An unexpected error occurred')
    } finally {
      setEmailSaving(false)
    }
  }

  const handleUpdatePassword = async () => {
    if (!currentPassword.trim()) {
      showMessage('error', 'Please enter your current password')
      return
    }

    if (!newPassword.trim()) {
      showMessage('error', 'Please enter a new password')
      return
    }

    if (newPassword.length < 6) {
      showMessage('error', 'New password must be at least 6 characters long')
      return
    }

    if (newPassword !== confirmPassword) {
      showMessage('error', 'New passwords do not match')
      return
    }

    setPasswordSaving(true)
    
    try {
      // First verify current password
      const authResult = await reauthenticateUser(currentPassword)
      
      if (!authResult.success) {
        showMessage('error', 'Current password is incorrect')
        setPasswordSaving(false)
        return
      }

      // Update password
      const result = await updateUserPassword(newPassword)
      
      if (result.success) {
        showMessage('success', 'Password updated successfully!')
        setCurrentPassword('')
        setNewPassword('')
        setConfirmPassword('')
      } else {
        showMessage('error', result.error || 'Failed to update password')
      }
    } catch (error) {
      showMessage('error', 'An unexpected error occurred')
    } finally {
      setPasswordSaving(false)
    }
  }

  const handleDeleteCollection = async () => {
    if (deleteCollectionConfirm !== 'DELETE') {
      showMessage('error', 'Please type "DELETE" to confirm')
      return
    }

    setDeletingCollection(true)
    
    try {
      const result = await deleteUserCollectionClient(userId)
      
      if (result.success) {
        showMessage('success', 'Collection deleted successfully!')
        setDeleteCollectionConfirm('')
        setCollectionCount(0)
        router.refresh()
      } else {
        showMessage('error', result.error || 'Failed to delete collection')
      }
    } catch (error) {
      showMessage('error', 'An unexpected error occurred')
    } finally {
      setDeletingCollection(false)
    }
  }

  const handleDeleteAccount = async () => {
    if (deleteAccountConfirm !== 'DELETE') {
      showMessage('error', 'Please type "DELETE" to confirm')
      return
    }

    if (!deleteAccountPassword.trim()) {
      showMessage('error', 'Please enter your password to confirm')
      return
    }

    setDeletingAccount(true)
    
    try {
      // Verify password first
      const authResult = await reauthenticateUser(deleteAccountPassword)
      
      if (!authResult.success) {
        showMessage('error', 'Password is incorrect')
        setDeletingAccount(false)
        return
      }

      // This would typically involve a server action for complete account deletion
      // For now, we'll show a message that this feature needs server implementation
      showMessage('error', 'Account deletion requires server-side implementation')
    } catch (error) {
      showMessage('error', 'An unexpected error occurred')
    } finally {
      setDeletingAccount(false)
    }
  }

  const tabs = [
    { name: 'Preferences', icon: Settings },
    { name: 'Account', icon: User },
    { name: 'Danger Zone', icon: AlertTriangle },
  ]

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Settings"
      description="Manage your account preferences and settings"
      size="lg"
    >
      <div className="w-full">
        {/* Message Banner */}
        {message && (
          <div className={cn(
            'mb-6 p-3 rounded-lg border',
            message.type === 'success' 
              ? 'bg-green-50 border-green-200 text-green-800'
              : 'bg-red-50 border-red-200 text-red-800'
          )}>
            {message.text}
          </div>
        )}

        <Tab.Group selectedIndex={selectedTab} onChange={setSelectedTab}>
          {/* Tab Navigation */}
          <Tab.List className="flex space-x-1 rounded-xl bg-panel2 p-1 mb-6">
            {tabs.map((tab, index) => (
              <Tab
                key={tab.name}
                className={({ selected }) =>
                  cn(
                    'w-full rounded-lg py-2.5 px-4 text-sm font-medium leading-5 transition-all',
                    'focus:outline-none focus:ring-2 focus:ring-brand2/50',
                    selected
                      ? 'bg-white text-brand2 shadow'
                      : 'text-muted hover:bg-white/50 hover:text-text'
                  )
                }
              >
                <div className="flex items-center justify-center space-x-2">
                  <tab.icon className="h-4 w-4" />
                  <span>{tab.name}</span>
                </div>
              </Tab>
            ))}
          </Tab.List>

          <Tab.Panels>
            {/* Preferences Tab */}
            <Tab.Panel className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-text mb-4">Display Preferences</h3>
                
                {preferencesLoading ? (
                  <div className="space-y-4">
                    <div className="h-16 skeleton rounded-lg" />
                    <div className="h-16 skeleton rounded-lg" />
                  </div>
                ) : (
                  <div className="space-y-6">
                    <Listbox
                      label="Preferred Currency"
                      options={CURRENCY_OPTIONS}
                      value={preferences.preferred_currency}
                      onChange={(value) => setPreferences(prev => ({ 
                        ...prev, 
                        preferred_currency: value as CurrencyCode 
                      }))}
                    />

                    <PriceSourceToggleWithLabel
                      label="Preferred Price Source"
                      value={preferences.preferred_price_source}
                      onChange={(value) => setPreferences(prev => ({ 
                        ...prev, 
                        preferred_price_source: value 
                      }))}
                      showDescriptions
                    />

                    <Button
                      onClick={handleSavePreferences}
                      disabled={preferencesSaving}
                      loading={preferencesSaving}
                      className="w-full"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      Save Preferences
                    </Button>
                  </div>
                )}
              </div>
            </Tab.Panel>

            {/* Account Tab */}
            <Tab.Panel className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-text mb-4">Account Settings</h3>
                
                {/* Email Section */}
                <div className="space-y-4 mb-8">
                  <h4 className="font-medium text-text">Change Email</h4>
                  <p className="text-sm text-muted">Current email: {userEmail}</p>
                  
                  <Field
                    label="New Email Address"
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="Enter new email address"
                  />
                  
                  <Button
                    onClick={handleUpdateEmail}
                    disabled={emailSaving || !newEmail.trim()}
                    loading={emailSaving}
                    size="sm"
                  >
                    Update Email
                  </Button>
                </div>

                {/* Password Section */}
                <div className="space-y-4 border-t border-border pt-6">
                  <h4 className="font-medium text-text">Change Password</h4>
                  
                  <Field
                    label="Current Password"
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password"
                  />
                  
                  <Field
                    label="New Password"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                  />
                  
                  <Field
                    label="Confirm New Password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                  />
                  
                  <Button
                    onClick={handleUpdatePassword}
                    disabled={passwordSaving || !currentPassword.trim() || !newPassword.trim() || newPassword !== confirmPassword}
                    loading={passwordSaving}
                    size="sm"
                  >
                    Update Password
                  </Button>
                </div>
              </div>
            </Tab.Panel>

            {/* Danger Zone Tab */}
            <Tab.Panel className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-danger mb-4">Danger Zone</h3>
                <p className="text-sm text-muted mb-6">
                  These actions are irreversible. Please be certain before proceeding.
                </p>
                
                {/* Delete Collection */}
                <div className="border border-red-200 rounded-lg p-4 mb-6">
                  <h4 className="font-medium text-text mb-2">Delete Collection</h4>
                  <p className="text-sm text-muted mb-4">
                    This will permanently delete all {collectionCount} cards in your collection. This action cannot be undone.
                  </p>
                  
                  <Field
                    label="Type 'DELETE' to confirm"
                    value={deleteCollectionConfirm}
                    onChange={(e) => setDeleteCollectionConfirm(e.target.value)}
                    placeholder="DELETE"
                  />
                  
                  <Button
                    onClick={handleDeleteCollection}
                    variant="danger"
                    disabled={deletingCollection || deleteCollectionConfirm !== 'DELETE'}
                    loading={deletingCollection}
                    size="sm"
                    className="mt-3"
                  >
                    Delete My Collection
                  </Button>
                </div>

                {/* Delete Account */}
                <div className="border border-red-200 rounded-lg p-4">
                  <h4 className="font-medium text-text mb-2">Delete Account</h4>
                  <p className="text-sm text-muted mb-4">
                    This will permanently delete your account and all associated data including your collection. This action cannot be undone.
                  </p>
                  
                  <div className="space-y-3">
                    <Field
                      label="Type 'DELETE' to confirm"
                      value={deleteAccountConfirm}
                      onChange={(e) => setDeleteAccountConfirm(e.target.value)}
                      placeholder="DELETE"
                    />
                    
                    <Field
                      label="Enter your password to confirm"
                      type="password"
                      value={deleteAccountPassword}
                      onChange={(e) => setDeleteAccountPassword(e.target.value)}
                      placeholder="Password"
                    />
                  </div>
                  
                  <Button
                    onClick={handleDeleteAccount}
                    variant="danger"
                    disabled={deletingAccount || deleteAccountConfirm !== 'DELETE' || !deleteAccountPassword.trim()}
                    loading={deletingAccount}
                    size="sm"
                    className="mt-3"
                  >
                    Delete My Account
                  </Button>
                </div>
              </div>
            </Tab.Panel>
          </Tab.Panels>
        </Tab.Group>
      </div>
    </Dialog>
  )
}