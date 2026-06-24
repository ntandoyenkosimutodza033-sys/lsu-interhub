'use client'

import { useState, useEffect } from 'react'
import { createClient } from '../lib/supabase'
import { useRouter } from 'next/navigation'
import Navbar from '../components/Navbar'

export default function FeedPage() {
  const [user, setUser] = useState(null)
  const [posts, setPosts] = useState([])
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(true)
  const [posting, setPosting] = useState(false)
  const [error, setError] = useState(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const initialize = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }
      setUser(user)

      const { data: profile } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', user.id)
        .single()

      if (!profile || !profile.username) {
        router.push('/profile')
        return
      }

      await fetchPosts()
      setLoading(false)
    }
    initialize()
  }, [])

  const fetchPosts = async () => {
    const { data: postsData, error } = await supabase
      .from('posts')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error(error)
      return
    }

    const postsWithUsernames = await Promise.all(
      postsData.map(async (post) => {
        const { data: profile } = await supabase
          .from('profiles')
          .select('username')
          .eq('id', post.user_id)
          .single()
        return { ...post, username: profile?.username || post.user_id }
      })
    )

    setPosts(postsWithUsernames)
  }

  const handlePost = async () => {
    if (!content.trim()) return
    setPosting(true)
    setError(null)

    const { error } = await supabase
      .from('posts')
      .insert({ user_id: user.id, content: content })

    if (error) {
      setError(error.message)
    } else {
      setContent('')
      await fetchPosts()
    }
    setPosting(false)
  }

  const handleDelete = async (postId) => {
    const { error } = await supabase
      .from('posts')
      .delete()
      .eq('id', postId)
      .eq('user_id', user.id)

    if (error) {
      console.error(error)
    } else {
      await fetchPosts()
    }
  }

  if (loading) return (
    <div className="min-h-screen" style={{ backgroundColor: '#0f0f0f' }}>
      <Navbar />
      <p className="p-4 text-center" style={{ color: '#a0a0b0' }}>Loading...</p>
    </div>
  )

  return (
    <div className="min-h-screen pb-6" style={{ backgroundColor: '#0f0f0f' }}>
      <Navbar />
      <div className="max-w-2xl mx-auto p-4">

        {/* Create Post */}
        <div className="p-4 rounded-xl mb-6 mt-4 border"
          style={{ backgroundColor: '#1a1a2e', borderColor: '#2d2d4e' }}>
          <p className="font-semibold mb-2" style={{ color: '#a0a0b0' }}>
            Share something with LSU
          </p>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="What's on your mind?"
            className="w-full p-3 rounded-lg mb-3 resize-none focus:outline-none"
            style={{
              backgroundColor: '#16213e',
              color: '#ffffff',
              border: '1px solid #2d2d4e',
            }}
            rows={3}
          />
          {error && <p className="text-red-400 text-sm mb-2">{error}</p>}
          <button
            onClick={handlePost}
            disabled={posting}
            className="px-6 py-2 rounded-lg font-medium text-white"
            style={{ backgroundColor: posting ? '#6d28d9' : '#7c3aed' }}
          >
            {posting ? 'Posting...' : 'Post'}
          </button>
        </div>

        {/* Posts */}
        <div className="space-y-4">
          {posts.length === 0 && (
            <p className="text-center py-8" style={{ color: '#a0a0b0' }}>
              No posts yet. Be the first to post!
            </p>
          )}
          {posts.map((post) => (
            <div key={post.id} className="p-4 rounded-xl border"
              style={{ backgroundColor: '#1a1a2e', borderColor: '#2d2d4e' }}>

              {/* Username */}
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold"
                  style={{ backgroundColor: '#7c3aed' }}>
                  {post.username?.[0]?.toUpperCase()}
                </div>
                <span className="font-semibold text-sm" style={{ color: '#ffffff' }}>
                  {post.username}
                </span>
              </div>

              <p className="mb-3" style={{ color: '#e0e0e0' }}>{post.content}</p>

              <div className="flex justify-between items-center">
                <p className="text-xs" style={{ color: '#a0a0b0' }}>
                  {new Date(post.created_at).toLocaleString()}
                </p>
                {post.user_id === user.id && (
                  <button
                    onClick={() => handleDelete(post.id)}
                    className="text-xs hover:underline"
                    style={{ color: '#ef4444' }}
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  )
}