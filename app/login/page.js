'use client'

import { useState } from 'react'
import { createClient } from '../lib/supabase'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const router = useRouter()
  const supabase = createClient()

  const handleLogin = async () => {
    setError(null)

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setError(error.message)
    } else {
      router.push('/feed')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center"
      style={{ backgroundColor: '#0f0f0f' }}>
      <div className="p-8 rounded-xl w-full max-w-md border"
        style={{ backgroundColor: '#1a1a2e', borderColor: '#2d2d4e' }}>
        <h1 className="text-2xl font-bold mb-6 text-center text-white">
          Login to LSU InterHub
        </h1>

        {error && <p className="text-red-400 mb-4">{error}</p>}

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full p-3 rounded-lg mb-4 focus:outline-none"
          style={{
            backgroundColor: '#16213e',
            border: '1px solid #2d2d4e',
            color: '#ffffff',
          }}
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full p-3 rounded-lg mb-4 focus:outline-none"
          style={{
            backgroundColor: '#16213e',
            border: '1px solid #2d2d4e',
            color: '#ffffff',
          }}
        />
        <button
          onClick={handleLogin}
          className="w-full p-3 rounded-lg font-medium text-white mb-4"
          style={{ backgroundColor: '#7c3aed' }}
        >
          Log In
        </button>

        <p className="text-center text-sm" style={{ color: '#a0a0b0' }}>
          Don't have an account?{' '}
          <a href="/signup" style={{ color: '#7c3aed' }}>
            Sign up
          </a>
        </p>
      </div>
    </div>
  )
}