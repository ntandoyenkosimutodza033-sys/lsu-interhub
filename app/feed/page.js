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

  if (loading) return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <p className="p-4 text-center text-gray-500">Loading...</p>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-2xl mx-auto p-4">

        {/* Create Post */}
        <div className="bg-white p-4 rounded-xl shadow mb-6 mt-4">
          <p className="font-semibold text-gray-700 mb-2">Share something with LSU</p>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="What's on your mind?"
            className="w-full border border-gray-200 p-3 rounded-lg mb-3 resize-none focus:outline-none focus:ring-2 focus:ring-blue-300 text-gray-900 placeholder-gray-500"
            rows={3}
          />
          {error && <p className="text-red-500 text-sm mb-2">{error}</p>}
          <button
            onClick={handlePost}
            disabled={posting}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 font-medium"
          >
            {posting ? 'Posting...' : 'Post'}
          </button>
        </div>

        {/* Posts */}
        <div className="space-y-4">
          {posts.length === 0 && (
            <p className="text-gray-400 text-center py-8">No posts yet. Be the first to post!</p>
          )}
          {posts.map((post) => (
            <div key={post.id} className="bg-white p-4 rounded-xl shadow">
              <p className="text-gray-800 mb-3">{post.content}</p>
              <div className="flex justify-between items-center">
                <p className="text-gray-400 text-xs">
                  {new Date(post.created_at).toLocaleString()}
                </p>
                {post.user_id === user.id && (
                  <button
                    onClick={() => handleDelete(post.id)}
                    className="text-red-400 text-xs hover:text-red-600 hover:underline"
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