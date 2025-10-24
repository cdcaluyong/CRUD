import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import ProfileSetup from './ProfileSetup'
import ProfilePage from './ProfilePage'
import { 
  Heart, MessageCircle, Send, Bookmark, MoreHorizontal,
  Home, PlusSquare, Film, LogOut, Smile, X, Loader2, Search
} from 'lucide-react'

export default function PostList() {
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [isCreating, setIsCreating] = useState(false)
  const [currentPage, setCurrentPage] = useState('home') // 'home' or 'profile'
  const [formData, setFormData] = useState({ content: '', media: null })
  const [previewUrl, setPreviewUrl] = useState(null)
  const [uploadingMedia, setUploadingMedia] = useState(false)

  useEffect(() => {
    initializeUser()
  }, [])

  async function initializeUser() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      
      setUser(user)
      
      const { data: profileData, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle()
      
      if (error) {
        console.error('Profile fetch error:', error)
        return
      }
      
      if (!profileData) {
        const { data: newProfile, error: insertError } = await supabase
          .from('profiles')
          .insert({
            id: user.id,
            username: 'user_' + user.id.substring(0, 8),
            avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.id}`,
            is_setup_complete: false
          })
          .select()
          .single()
        
        if (insertError) {
          console.error('Profile creation error:', insertError)
          return
        }
        
        setProfile(newProfile)
      } else {
        setProfile(profileData)
        
        if (profileData.is_setup_complete) {
          fetchPosts()
          subscribeToChanges()
        }
      }
    } catch (err) {
      console.error('Init error:', err)
    }
  }

  function subscribeToChanges() {
    const channel = supabase
      .channel('posts_channel')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'posts' },
        () => {
          if (currentPage === 'home') {
            fetchPosts()
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }

  async function fetchPosts() {
    try {
      setLoading(true)
      
      const { data: postsData, error: postsError } = await supabase
        .from('posts')
        .select('*')
        .order('created_at', { ascending: false })
      
      if (postsError) throw postsError
      
      if (!postsData || postsData.length === 0) {
        setPosts([])
        setLoading(false)
        return
      }
      
      const postsWithProfiles = await Promise.all(
        postsData.map(async (post) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('username, full_name, avatar_url')
            .eq('id', post.user_id)
            .maybeSingle()
          
          return {
            ...post,
            profile: profile
          }
        })
      )
      
      setPosts(postsWithProfiles)
    } catch (err) {
      console.error('Fetch posts error:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleFileUpload(file) {
    const fileExt = file.name.split('.').pop()
    const fileName = `${user.id}/${Date.now()}.${fileExt}`
    
    setUploadingMedia(true)
    const { error: uploadError } = await supabase.storage
      .from('post-media')
      .upload(fileName, file)
    
    if (uploadError) throw uploadError
    
    const { data } = supabase.storage.from('post-media').getPublicUrl(fileName)
    setUploadingMedia(false)
    return data.publicUrl
  }

  function handleMediaChange(file) {
    if (file) {
      setFormData({ ...formData, media: file })
      const url = URL.createObjectURL(file)
      setPreviewUrl(url)
    }
  }

  async function createPost() {
    if (!formData.content) return
    
    try {
      let mediaUrl = null
      let mediaType = null

      if (formData.media) {
        mediaUrl = await handleFileUpload(formData.media)
        mediaType = formData.media.type.startsWith('image/') ? 'image' : 'video'
      }

      const { error } = await supabase.from('posts').insert({
        user_id: user.id,
        content: formData.content,
        media_url: mediaUrl,
        media_type: mediaType
      })

      if (error) throw error
      
      setFormData({ content: '', media: null })
      setPreviewUrl(null)
      setIsCreating(false)
      
      await fetchPosts()
    } catch (err) {
      console.error('Create post error:', err)
      alert('Error creating post: ' + err.message)
    }
  }

  async function deletePost(id, mediaUrl) {
    if (!confirm('Delete this post?')) return
    
    try {
      if (mediaUrl) {
        const path = mediaUrl.split('/post-media/')[1]
        await supabase.storage.from('post-media').remove([path])
      }
      
      const { error } = await supabase.from('posts').delete().eq('id', id)
      if (error) throw error
      
      await fetchPosts()
    } catch (err) {
      console.error('Delete error:', err)
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut()
  }

  function handleProfileUpdate(updatedProfile) {
    setProfile(updatedProfile)
  }

  // Show profile setup if not complete
  if (profile && !profile.is_setup_complete) {
    return <ProfileSetup profile={profile} onComplete={initializeUser} />
  }

  // Show loading while checking profile
  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    )
  }

  // Show profile page
  if (currentPage === 'profile') {
    return (
      <ProfilePage 
        user={user} 
        profile={profile}
        onBack={() => setCurrentPage('home')}
        onProfileUpdate={handleProfileUpdate}
      />
    )
  }

  // Show home feed
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Instagram Header */}
      <header className="fixed top-0 left-0 right-0 bg-white border-b border-gray-300 z-50">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <h1 className="text-2xl font-bold cursor-pointer" style={{fontFamily: 'Billabong, cursive'}}>
            Instagram
          </h1>
          
          <div className="flex items-center gap-5">
            <Home 
              className="w-6 h-6 ig-icon-button" 
              onClick={() => setCurrentPage('home')}
            />
            <Search className="w-6 h-6 ig-icon-button" />
            <PlusSquare 
              className="w-6 h-6 ig-icon-button" 
              onClick={() => setIsCreating(!isCreating)}
            />
            <Film className="w-6 h-6 ig-icon-button" />
            <img 
              src={profile.avatar_url} 
              alt={profile.username}
              className="w-7 h-7 rounded-full cursor-pointer border border-gray-300 hover:opacity-80"
              onClick={() => setCurrentPage('profile')}
            />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-2xl mx-auto pt-20 pb-10 px-4">
        {/* Create Post Modal */}
        {isCreating && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b border-gray-300 p-3 flex items-center justify-between">
                <button 
                  onClick={() => {
                    setIsCreating(false)
                    setPreviewUrl(null)
                    setFormData({ content: '', media: null })
                  }} 
                  className="text-sm font-semibold"
                >
                  Cancel
                </button>
                <h3 className="font-semibold">Create new post</h3>
                <button 
                  onClick={createPost}
                  disabled={!formData.content || uploadingMedia}
                  className="text-sm font-semibold text-blue-500 disabled:opacity-50"
                >
                  {uploadingMedia ? 'Uploading...' : 'Share'}
                </button>
              </div>

              <div className="p-4 space-y-3">
                <div className="flex items-center gap-3 pb-3 border-b border-gray-200">
                  <img 
                    src={profile.avatar_url} 
                    alt={profile.username}
                    className="w-10 h-10 rounded-full"
                  />
                  <span className="font-semibold text-sm">{profile.username}</span>
                </div>

                <textarea
                  placeholder="Write a caption..."
                  className="w-full px-0 py-2 border-0 focus:outline-none resize-none text-sm"
                  rows="4"
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                />

                {previewUrl ? (
                  <div className="relative">
                    {formData.media?.type.startsWith('image/') ? (
                      <img src={previewUrl} alt="Preview" className="w-full rounded-lg" />
                    ) : (
                      <video src={previewUrl} className="w-full rounded-lg" controls />
                    )}
                    <button
                      onClick={() => {
                        setPreviewUrl(null)
                        setFormData({ ...formData, media: null })
                      }}
                      className="absolute top-2 right-2 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-70"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <label className="block">
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center cursor-pointer hover:bg-gray-50">
                      <PlusSquare className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                      <p className="text-sm text-gray-600 font-medium">Add photo or video</p>
                    </div>
                    <input
                      type="file"
                      accept="image/*,video/*"
                      className="hidden"
                      onChange={(e) => handleMediaChange(e.target.files[0])}
                    />
                  </label>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Posts Feed */}
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-20">
            <Film className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <h3 className="text-2xl font-semibold text-gray-900 mb-2">No posts yet</h3>
            <p className="text-gray-500 mb-4">When you share posts, they'll appear here.</p>
            <button
              onClick={() => setIsCreating(true)}
              className="ig-button px-6 py-2"
            >
              Create your first post
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {posts.map((post) => (
              <article key={post.id} className="bg-white border border-gray-300 rounded-lg">
                <div className="flex items-center justify-between p-3">
                  <div className="flex items-center gap-3">
                    <img 
                      src={post.profile?.avatar_url || 'https://via.placeholder.com/32'} 
                      alt={post.profile?.username || 'user'}
                      className="w-8 h-8 rounded-full cursor-pointer"
                      onClick={() => post.user_id === user.id && setCurrentPage('profile')}
                    />
                    <span className="font-semibold text-sm">
                      {post.profile?.username || 'user'}
                    </span>
                  </div>
                  
                  {user?.id === post.user_id && (
                    <button onClick={() => deletePost(post.id, post.media_url)}>
                      <MoreHorizontal className="w-6 h-6 ig-icon-button" />
                    </button>
                  )}
                </div>

                {post.media_url && (
                  <div className="w-full">
                    {post.media_type === 'image' ? (
                      <img 
                        src={post.media_url} 
                        alt="Post content"
                        className="w-full"
                      />
                    ) : (
                      <video 
                        src={post.media_url} 
                        controls 
                        className="w-full"
                      />
                    )}
                  </div>
                )}

                <div className="p-3">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-4">
                      <Heart className="w-6 h-6 ig-icon-button" />
                      <MessageCircle className="w-6 h-6 ig-icon-button" />
                      <Send className="w-6 h-6 ig-icon-button" />
                    </div>
                    <Bookmark className="w-6 h-6 ig-icon-button" />
                  </div>

                  <div className="text-sm">
                    <p className="mb-1">
                      <span className="font-semibold mr-2">
                        {post.profile?.username || 'user'}
                      </span>
                      {post.content}
                    </p>
                    <p className="text-gray-500 text-xs">
                      {new Date(post.created_at).toLocaleDateString('en-US', {
                        month: 'long',
                        day: 'numeric'
                      })}
                    </p>
                  </div>

                  <div className="flex items-center gap-3 mt-3 pt-3 border-t border-gray-200">
                    <Smile className="w-6 h-6 text-gray-400" />
                    <input 
                      type="text" 
                      placeholder="Add a comment..."
                      className="flex-1 text-sm focus:outline-none"
                    />
                    <button className="text-blue-500 font-semibold text-sm">Post</button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
