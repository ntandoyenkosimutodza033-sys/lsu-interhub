'use client'

import { createClient } from '../lib/supabase'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

export default function Navbar() {
  const [user, setUser] = useState(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
    }
    getUser()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <nav className="sticky top-0 z-50 px-4 py-3 flex justify-between items-center border-b"
      style={{ backgroundColor: '#0f0f0f', borderColor: '#2d2d4e' }}>
      <a href="/feed" className="text-xl font-bold"
        style={{ color: '#7c3aed' }}>
        LSU InterHub
      </a>
      {user && (
        <div className="flex items-center gap-4">
          <a href="/profile" className="text-sm"
            style={{ color: '#a0a0b0' }}>
            My Profile
          </a>
          <button
            onClick={handleLogout}
            className="text-sm px-3 py-1 rounded-lg border"
            style={{ borderColor: '#7c3aed', color: '#7c3aed' }}
          >
            Logout
          </button>
        </div>
      )}
    </nav>
  )
}