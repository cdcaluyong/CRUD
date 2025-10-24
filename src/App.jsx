import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { supabase } from './lib/supabaseClient'
import AuthComponent from './components/Auth'
import PostList from './components/PostList'
import ProtectedRoute from './components/ProtectedRoute'

function App() {
  const [session, setSession] = useState(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  return (
    <BrowserRouter>
      <Routes>
        <Route 
          path="/login" 
          element={!session ? <AuthComponent /> : <Navigate to="/feed" />} 
        />
        <Route
          path="/feed"
          element={
            <ProtectedRoute>
              <PostList />
            </ProtectedRoute>
          }
        />
        <Route path="/" element={<Navigate to={session ? "/feed" : "/login"} />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
