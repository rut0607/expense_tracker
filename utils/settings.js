import { supabase } from './supabase'

export const getUserPreferences = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()

    if (error) throw error

    return { success: true, data }
  } catch (error) {
    console.error('Error fetching preferences:', error)
    return { success: false, error: error.message }
  }
}

export const saveUserPreferences = async (userId, preferences) => {
  try {
    const { error } = await supabase
      .from('user_preferences')
      .upsert({
        user_id: userId,
        ...preferences,
        updated_at: new Date().toISOString()
      })

    if (error) throw error

    return { success: true }
  } catch (error) {
    console.error('Error saving preferences:', error)
    return { success: false, error: error.message }
  }
}

export const uploadAvatar = async (userId, file) => {
  try {
    const fileExt = file.name.split('.').pop()
    const fileName = `${userId}/${Date.now()}.${fileExt}`
    
    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(fileName, file)

    if (uploadError) throw uploadError

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl(fileName)

    // Update user profile with avatar URL
    const { error: updateError } = await supabase
      .from('users')
      .update({ avatar_url: publicUrl })
      .eq('id', userId)

    if (updateError) throw updateError

    return { success: true, avatarUrl: publicUrl }
  } catch (error) {
    console.error('Error uploading avatar:', error)
    return { success: false, error: error.message }
  }
}