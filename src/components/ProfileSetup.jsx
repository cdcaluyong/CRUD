import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { Camera, Loader2 } from 'lucide-react'

export default function ProfileSetup({ profile, onComplete }) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    username: profile?.username || '',
    full_name: '',
    bio: '',
    avatar_url: profile?.avatar_url || ''
  })
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      // Check if username is available
      const { data: existingUser } = await supabase
        .from('profiles')
        .select('username')
        .eq('username', formData.username)
        .neq('id', profile.id)
        .single()

      if (existingUser) {
        setError('Username is already taken')
        setLoading(false)
        return
      }

      // Update profile
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          username: formData.username,
          full_name: formData.full_name,
          bio: formData.bio,
          avatar_url: formData.avatar_url,
          is_setup_complete: true
        })
        .eq('id', profile.id)

      if (updateError) throw updateError

      onComplete()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-sm">
        <div className="bg-white border border-gray-300 rounded-lg p-8">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="w-24 h-24 mx-auto mb-4 relative">
              <img 
                src={formData.avatar_url} 
                alt="Profile"
                className="w-24 h-24 rounded-full"
              />
              <button className="absolute bottom-0 right-0 bg-blue-500 text-white p-2 rounded-full hover:bg-blue-600">
                <Camera className="w-4 h-4" />
              </button>
            </div>
            <h2 className="text-xl font-semibold mb-1">Complete Your Profile</h2>
            <p className="text-gray-500 text-sm">Add info to help people find you</p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-600 text-sm">
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Username
              </label>
              <input
                type="text"
                required
                minLength={3}
                placeholder="username"
                className="ig-input"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') })}
              />
              <p className="text-xs text-gray-500 mt-1">
                Only letters, numbers and underscores
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Full Name
              </label>
              <input
                type="text"
                placeholder="Full Name"
                className="ig-input"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Bio
              </label>
              <textarea
                placeholder="Tell us about yourself..."
                className="ig-input resize-none"
                rows="3"
                maxLength={150}
                value={formData.bio}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
              />
              <p className="text-xs text-gray-500 mt-1 text-right">
                {formData.bio.length}/150
              </p>
            </div>

            <button
              type="submit"
              disabled={loading || !formData.username}
              className="w-full ig-button py-2.5 mt-4 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading ? 'Setting up...' : 'Complete Setup'}
            </button>
          </form>
        </div>

        <div className="text-center mt-4">
          <button
            onClick={() => supabase.auth.signOut()}
            className="text-sm text-gray-600 hover:text-gray-800"
          >
            Log out
          </button>
        </div>
      </div>
    </div>
  )
}
