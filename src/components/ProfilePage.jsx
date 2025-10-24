import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { Settings, Grid, Bookmark, UserPlus, Camera, Loader2 } from 'lucide-react'

export default function ProfilePage({ user, profile, onBack, onProfileUpdate }) {
  const [myPosts, setMyPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [stats, setStats] = useState({ posts: 0, followers: 0, following: 0 })

  useEffect(() => {
    fetchMyPosts()
  }, [user])

  async function fetchMyPosts() {
    try {
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
      
      if (error) throw error
      setMyPosts(data || [])
      setStats({ ...stats, posts: data?.length || 0 })
    } catch (err) {
      console.error('Fetch my posts error:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleAvatarUpload(event) {
    try {
      const file = event.target.files[0]
      if (!file) return

      // Validate file
      if (!file.type.startsWith('image/')) {
        alert('Please upload an image file')
        return
      }

      if (file.size > 5 * 1024 * 1024) {
        alert('Image must be less than 5MB')
        return
      }

      setUploading(true)

      // Delete old avatar if exists
      if (profile.avatar_url && profile.avatar_url.includes('post-media')) {
        const oldPath = profile.avatar_url.split('/post-media/')[1]
        await supabase.storage.from('post-media').remove([oldPath])
      }

      // Upload new avatar
      const fileExt = file.name.split('.').pop()
      const fileName = `${user.id}/avatar_${Date.now()}.${fileExt}`
      
      const { error: uploadError } = await supabase.storage
        .from('post-media')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (uploadError) throw uploadError

      // Get public URL
      const { data } = supabase.storage
        .from('post-media')
        .getPublicUrl(fileName)

      // Update profile
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: data.publicUrl })
        .eq('id', user.id)

      if (updateError) throw updateError

      // Update local state
      onProfileUpdate({ ...profile, avatar_url: data.publicUrl })
      
      alert('Profile picture updated!')
    } catch (err) {
      console.error('Avatar upload error:', err)
      alert('Error uploading image: ' + err.message)
    } finally {
      setUploading(false)
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut()
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white border-b border-gray-300 px-4 py-3 flex items-center justify-between">
        <button onClick={onBack} className="text-2xl font-semibold">
          ←
        </button>
        <h1 className="font-semibold text-lg">{profile.username}</h1>
        <Settings className="w-6 h-6 cursor-pointer" onClick={handleLogout} />
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Profile Header */}
        <div className="flex items-start gap-8 mb-6">
          {/* Avatar */}
          <div className="relative">
            <img 
              src={profile.avatar_url} 
              alt={profile.username}
              className="w-32 h-32 rounded-full object-cover"
            />
            <label 
              htmlFor="avatar-upload"
              className="absolute bottom-0 right-0 bg-blue-500 text-white p-2 rounded-full cursor-pointer hover:bg-blue-600 shadow-lg"
            >
              {uploading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Camera className="w-5 h-5" />
              )}
            </label>
            <input
              id="avatar-upload"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarUpload}
              disabled={uploading}
            />
          </div>

          {/* Stats */}
          <div className="flex-1">
            <div className="flex items-center gap-6 mb-4">
              <div className="text-center">
                <div className="font-semibold text-lg">{stats.posts}</div>
                <div className="text-gray-500 text-sm">posts</div>
              </div>
              <div className="text-center cursor-pointer">
                <div className="font-semibold text-lg">{stats.followers}</div>
                <div className="text-gray-500 text-sm">followers</div>
              </div>
              <div className="text-center cursor-pointer">
                <div className="font-semibold text-lg">{stats.following}</div>
                <div className="text-gray-500 text-sm">following</div>
              </div>
            </div>

            <div className="mb-4">
              <div className="font-semibold">{profile.full_name || profile.username}</div>
              <div className="text-sm text-gray-600 whitespace-pre-wrap">{profile.bio || 'No bio yet'}</div>
            </div>

            <div className="flex gap-2">
              <button className="flex-1 bg-gray-200 hover:bg-gray-300 font-semibold py-1.5 px-4 rounded-lg text-sm">
                Edit profile
              </button>
              <button className="flex-1 bg-gray-200 hover:bg-gray-300 font-semibold py-1.5 px-4 rounded-lg text-sm">
                Share profile
              </button>
              <button className="bg-gray-200 hover:bg-gray-300 p-2 rounded-lg">
                <UserPlus className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-t border-gray-300">
          <div className="flex justify-center gap-12">
            <button className="flex items-center gap-2 py-3 border-t-2 border-black -mt-px">
              <Grid className="w-4 h-4" />
              <span className="text-xs font-semibold uppercase">Posts</span>
            </button>
            <button className="flex items-center gap-2 py-3 text-gray-400">
              <Bookmark className="w-4 h-4" />
              <span className="text-xs font-semibold uppercase">Saved</span>
            </button>
          </div>
        </div>

        {/* Posts Grid */}
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
          </div>
        ) : myPosts.length === 0 ? (
          <div className="text-center py-20">
            <Camera className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <h3 className="text-2xl font-semibold mb-2">Share Photos</h3>
            <p className="text-gray-500">When you share photos, they'll appear on your profile.</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-1 mt-1">
            {myPosts.map((post) => (
              <div key={post.id} className="aspect-square relative group cursor-pointer">
                {post.media_url ? (
                  post.media_type === 'image' ? (
                    <img 
                      src={post.media_url} 
                      alt={post.content}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <video 
                      src={post.media_url}
                      className="w-full h-full object-cover"
                    />
                  )
                ) : (
                  <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                    <p className="text-xs text-gray-500 p-2 text-center">{post.content}</p>
                  </div>
                )}
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all"></div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
