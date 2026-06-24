'use client'

import { useState, useEffect } from 'react'
import { createClient } from '../lib/supabase'
import { useRouter } from 'next/navigation'

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
      await fetchPosts()
      setLoading(false)
    }
    initialize()
  }, [])

  const fetchPosts = async () => {
    const { data, error } = await supabase
      .from('posts')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error(error)
    } else {
      setPosts(data)
    }
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

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (loading) return <p className="p-4">Loading...</p>

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto p-4">

        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">LSU InterHub</h1>
          <div className="flex gap-2">
            <a href="/profile" className="text-blue-600 hover:underline text-sm">
              My Profile
            </a>
            <button
              onClick={handleLogout}
              className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 text-sm"
            >
              Logout
            </button>
          </div>
        </div>

        {/* Create Post */}
        <div className="bg-white p-4 rounded shadow mb-6">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="What's on your mind?"
            className="w-full border p-2 rounded mb-2 resize-none"
            rows={3}
          />
          {error && <p className="text-red-500 text-sm mb-2">{error}</p>}
          <button
            onClick={handlePost}
            disabled={posting}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            {posting ? 'Posting...' : 'Post'}
          </button>
        </div>

        {/* Posts */}
        <div className="space-y-4">
          {posts.length === 0 && (
            <p className="text-gray-400 text-center">No posts yet. Be the first to post!</p>
          )}
          {posts.map((post) => (
            <div key={post.id} className="bg-white p-4 rounded shadow">
              <p className="text-gray-800 mb-2">{post.content}</p>
              <div className="flex justify-between items-center">
                <p className="text-gray-400 text-xs">
                  {new Date(post.created_at).toLocaleString()}
                </p>
                {post.user_id === user.id && (
                  <button
                    onClick={() => handleDelete(post.id)}
                    className="text-red-500 text-xs hover:underline"
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