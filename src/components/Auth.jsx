import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { Instagram } from 'lucide-react'

export default function AuthComponent() {
  const [loading, setLoading] = useState(false)
  const [isSignUp, setIsSignUp] = useState(false)
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: ''
  })
  const [message, setMessage] = useState({ type: '', text: '' })

  async function handleAuth(e) {
    e.preventDefault()
    setLoading(true)
    setMessage({ type: '', text: '' })

    try {
      if (isSignUp) {
        if (formData.password !== formData.confirmPassword) {
          setMessage({ type: 'error', text: 'Passwords do not match!' })
          setLoading(false)
          return
        }
        
        const { error } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
        })
        
        if (error) throw error
        setMessage({ 
          type: 'success', 
          text: 'Account created successfully!' 
        })
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password,
        })
        
        if (error) throw error
      }
    } catch (error) {
      setMessage({ type: 'error', text: error.message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-sm">
        {/* Auth Box */}
        <div className="ig-card rounded-lg p-10 mb-3">
          {/* Instagram Logo */}
          <div className="flex justify-center mb-8">
            <h1 className="text-4xl font-bold" style={{fontFamily: 'Billabong, cursive'}}>
              Instagram
            </h1>
          </div>

          {/* Message Display */}
          {message.text && (
            <div className={`mb-4 p-3 rounded text-sm ${
              message.type === 'error' 
                ? 'bg-red-50 text-red-600 border border-red-200' 
                : 'bg-green-50 text-green-600 border border-green-200'
            }`}>
              {message.text}
            </div>
          )}

          {/* Auth Form */}
          <form onSubmit={handleAuth} className="space-y-2">
            <input
              type="email"
              required
              placeholder="Email"
              className="ig-input"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />

            <input
              type="password"
              required
              placeholder="Password"
              className="ig-input"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            />

            {isSignUp && (
              <input
                type="password"
                required
                placeholder="Confirm Password"
                className="ig-input"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
              />
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full ig-button py-2 mt-4 disabled:opacity-50"
            >
              {loading ? 'Please wait...' : (isSignUp ? 'Sign up' : 'Log in')}
            </button>
          </form>
        </div>

        {/* Sign Up / Log In Toggle */}
        <div className="ig-card rounded-lg p-5 text-center text-sm">
          <p>
            {isSignUp ? 'Have an account? ' : "Don't have an account? "}
            <button
              onClick={() => {
                setIsSignUp(!isSignUp)
                setMessage({ type: '', text: '' })
                setFormData({ email: '', password: '', confirmPassword: '' })
              }}
              className="ig-text-link"
            >
              {isSignUp ? 'Log in' : 'Sign up'}
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}
