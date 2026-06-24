'use client'

import { useState } from 'react'
import { createClient } from '../lib/supabase'
import { useRouter } from 'next/navigation'

export default function SignupPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [message, setMessage] = useState(null)
  const router = useRouter()
  const supabase = createClient()

  const handleSignup = async () => {
    setError(null)
    setMessage(null)

    const { error } = await supabase.auth.signUp({
      email,
      password,
    })

    if (error) {
      setError(error.message)
    } else {
      setMessage('Account created! Please check your email to confirm.')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center"
      style={{ backgroundColor: '#0f0f0f' }}>
      <div className="p-8 rounded-xl w-full max-w-md border"
        style={{ backgroundColor: '#1a1a2e', borderColor: '#2d2d4e' }}>
        <h1 className="text-2xl font-bold mb-6 text-center text-white">
          Join LSU InterHub
        </h1>

        {error && <p className="text-red-400 mb-4">{error}</p>}
        {message && <p className="text-green-400 mb-4">{message}</p>}

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
          onClick={handleSignup}
          className="w-full p-3 rounded-lg font-medium text-white mb-4"
          style={{ backgroundColor: '#7c3aed' }}
        >
          Sign Up
        </button>

        <p className="text-center text-sm" style={{ color: '#a0a0b0' }}>
          Already have an account?{' '}
          <a href="/login" style={{ color: '#7c3aed' }}>
            Log in
          </a>
        </p>
      </div>
    </div>
  )
}