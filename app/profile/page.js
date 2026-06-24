'use client'

import { useState, useEffect } from 'react'
import { createClient } from '../lib/supabase'
import { useRouter } from 'next/navigation'
import Navbar from '../components/Navbar'

export default function ProfilePage() {
  const [user, setUser] = useState(null)
  const [username, setUsername] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [message, setMessage] = useState(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const getProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }
      setUser(user)

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (profile) {
        setUsername(profile.username)
      }

      setLoading(false)
    }
    getProfile()
  }, [])

  const handleSave = async () => {
    setError(null)
    setMessage(null)
    setSaving(true)

    const { error } = await supabase
      .from('profiles')
      .upsert({
        id: user.id,
        email: user.email,
        username: username,
        university_id: '6cf86b77-d39f-4d34-963a-99941b8232d9',
      })

    if (error) {
      setError(error.message)
    } else {
      setMessage('Profile saved successfully!')
    }

    setSaving(false)
  }

  if (loading) return (
    <div className="min-h-screen" style={{ backgroundColor: '#0f0f0f' }}>
      <Navbar />
      <p className="p-4 text-center" style={{ color: '#a0a0b0' }}>Loading...</p>
    </div>
  )

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#0f0f0f' }}>
      <Navbar />
      <div className="max-w-2xl mx-auto p-4 mt-4">
        <h1 className="text-2xl font-bold mb-6 text-white">My Profile</h1>

        <div className="p-6 rounded-xl border"
          style={{ backgroundColor: '#1a1a2e', borderColor: '#2d2d4e' }}>
          {error && <p className="text-red-400 mb-4">{error}</p>}
          {message && <p className="text-green-400 mb-4">{message}</p>}

          <div className="mb-4">
            <label className="block text-sm font-medium mb-1" style={{ color: '#a0a0b0' }}>Email</label>
            <input
              type="text"
              value={user?.email || ''}
              disabled
              className="w-full p-3 rounded-lg text-gray-400"
              style={{ backgroundColor: '#16213e', border: '1px solid #2d2d4e' }}
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-1" style={{ color: '#a0a0b0' }}>Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Choose a username"
              className="w-full p-3 rounded-lg focus:outline-none"
              style={{
                backgroundColor: '#16213e',
                border: '1px solid #2d2d4e',
                color: '#ffffff',
              }}
            />
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium mb-1" style={{ color: '#a0a0b0' }}>University</label>
            <input
              type="text"
              value="Lupane State University"
              disabled
              className="w-full p-3 rounded-lg text-gray-400"
              style={{ backgroundColor: '#16213e', border: '1px solid #2d2d4e' }}
            />
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full p-3 rounded-lg font-medium text-white"
            style={{ backgroundColor: saving ? '#6d28d9' : '#7c3aed' }}
          >
            {saving ? 'Saving...' : 'Save Profile'}
          </button>
        </div>
      </div>
    </div>
  )
}