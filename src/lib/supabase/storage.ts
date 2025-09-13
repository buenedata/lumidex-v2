import { createClient } from './client'

/**
 * Upload avatar image to Supabase storage
 * Replaces existing avatar if one exists
 */
export async function uploadAvatar(userId: string, file: File): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    const supabase = createClient()
    
    // Validate file type and size
    if (!file.type.startsWith('image/')) {
      return { success: false, error: 'Please select an image file' }
    }
    
    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      return { success: false, error: 'File size must be less than 5MB' }
    }
    
    // Generate file name with user ID (this will replace existing file)
    const fileExt = file.name.split('.').pop()
    const fileName = `${userId}/avatar.${fileExt}`
    
    // Upload file to avatars bucket
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(fileName, file, {
        upsert: true, // This replaces the existing file
        contentType: file.type
      })
    
    if (uploadError) {
      console.error('Upload error:', uploadError)
      return { success: false, error: 'Failed to upload image' }
    }
    
    // Get public URL
    const { data: publicUrlData } = supabase.storage
      .from('avatars')
      .getPublicUrl(fileName)
    
    return { 
      success: true, 
      url: publicUrlData.publicUrl 
    }
    
  } catch (error) {
    console.error('Avatar upload error:', error)
    return { success: false, error: 'An unexpected error occurred' }
  }
}

/**
 * Upload banner image to Supabase storage
 * Replaces existing banner if one exists
 */
export async function uploadBanner(userId: string, file: File): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    const supabase = createClient()
    
    // Validate file type and size
    if (!file.type.startsWith('image/')) {
      return { success: false, error: 'Please select an image file' }
    }
    
    if (file.size > 10 * 1024 * 1024) { // 10MB limit for banners
      return { success: false, error: 'File size must be less than 10MB' }
    }
    
    // Generate file name with user ID (this will replace existing file)
    const fileExt = file.name.split('.').pop()
    const fileName = `${userId}/banner.${fileExt}`
    
    // Upload file to banners bucket
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('banners')
      .upload(fileName, file, {
        upsert: true, // This replaces the existing file
        contentType: file.type
      })
    
    if (uploadError) {
      console.error('Upload error:', uploadError)
      return { success: false, error: 'Failed to upload image' }
    }
    
    // Get public URL
    const { data: publicUrlData } = supabase.storage
      .from('banners')
      .getPublicUrl(fileName)
    
    return { 
      success: true, 
      url: publicUrlData.publicUrl 
    }
    
  } catch (error) {
    console.error('Banner upload error:', error)
    return { success: false, error: 'An unexpected error occurred' }
  }
}

/**
 * Delete avatar from storage
 */
export async function deleteAvatar(userId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createClient()
    
    // List files in user's avatar folder
    const { data: files, error: listError } = await supabase.storage
      .from('avatars')
      .list(`${userId}/`, {
        limit: 10
      })
    
    if (listError) {
      return { success: false, error: 'Failed to access storage' }
    }
    
    if (files && files.length > 0) {
      // Delete avatar files
      const filesToDelete = files
        .filter(file => file.name.startsWith('avatar.'))
        .map(file => `${userId}/${file.name}`)
      
      if (filesToDelete.length > 0) {
        const { error: deleteError } = await supabase.storage
          .from('avatars')
          .remove(filesToDelete)
        
        if (deleteError) {
          return { success: false, error: 'Failed to delete avatar' }
        }
      }
    }
    
    return { success: true }
    
  } catch (error) {
    console.error('Delete avatar error:', error)
    return { success: false, error: 'An unexpected error occurred' }
  }
}

/**
 * Delete banner from storage
 */
export async function deleteBanner(userId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createClient()
    
    // List files in user's banner folder
    const { data: files, error: listError } = await supabase.storage
      .from('banners')
      .list(`${userId}/`, {
        limit: 10
      })
    
    if (listError) {
      return { success: false, error: 'Failed to access storage' }
    }
    
    if (files && files.length > 0) {
      // Delete banner files
      const filesToDelete = files
        .filter(file => file.name.startsWith('banner.'))
        .map(file => `${userId}/${file.name}`)
      
      if (filesToDelete.length > 0) {
        const { error: deleteError } = await supabase.storage
          .from('banners')
          .remove(filesToDelete)
        
        if (deleteError) {
          return { success: false, error: 'Failed to delete banner' }
        }
      }
    }
    
    return { success: true }
    
  } catch (error) {
    console.error('Delete banner error:', error)
    return { success: false, error: 'An unexpected error occurred' }
  }
}

/**
 * Update user profile with new avatar/banner URLs
 */
export async function updateProfileImages(userId: string, updates: { avatar?: string; banner?: string }): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createClient()
    
    // In a real app, you'd update the profiles table with avatar/banner URLs
    // For now, this is a placeholder that would be implemented when the profiles table
    // includes avatar and banner URL fields
    
    console.log('Profile image URLs would be updated:', { userId, updates })
    
    // TODO: Implement actual profile update when profiles table is extended
    // const { error } = await supabase
    //   .from('profiles')
    //   .update(updates)
    //   .eq('id', userId)
    
    return { success: true }
    
  } catch (error) {
    console.error('Update profile images error:', error)
    return { success: false, error: 'An unexpected error occurred' }
  }
}