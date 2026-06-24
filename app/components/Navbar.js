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
    <nav className="bg-blue-700 text-white px-4 py-3 flex justify-between items-center shadow-md">
      <a href="/feed" className="text-xl font-bold tracking-tight">
        LSU InterHub
      </a>
      {user && (
        <div className="flex items-center gap-4">
          <a href="/profile" className="text-sm hover:underline">
            My Profile
          </a>
          <button
            onClick={handleLogout}
            className="bg-white text-blue-700 text-sm px-3 py-1 rounded hover:bg-gray-100"
          >
            Logout
          </button>
        </div>
      )}
    </nav>
  )
}