'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '../lib/supabase'
import { useRouter } from 'next/navigation'
import Navbar from '../components/Navbar'

const EMOJIS = ['❤️', '😂', '😮', '😢', '👍', '🔥']

export default function FeedPage() {
  const [user, setUser] = useState(null)
  const [posts, setPosts] = useState([])
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(true)
  const [posting, setPosting] = useState(false)
  const [error, setError] = useState(null)
  const [openMenuId, setOpenMenuId] = useState(null)
  const [editingPostId, setEditingPostId] = useState(null)
  const [editContent, setEditContent] = useState('')
  const [openCommentsId, setOpenCommentsId] = useState(null)
  const [comments, setComments] = useState({})
  const [commentInput, setCommentInput] = useState('')
  const [reactions, setReactions] = useState({})
  const [openEmojiId, setOpenEmojiId] = useState(null)
  const [detailsPost, setDetailsPost] = useState(null)
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

    // Fetch reactions for all posts
    const { data: reactionsData } = await supabase
      .from('reactions')
      .select('*')

    if (reactionsData) {
      const grouped = {}
      reactionsData.forEach((r) => {
        if (!grouped[r.post_id]) grouped[r.post_id] = {}
        if (!grouped[r.post_id][r.emoji]) grouped[r.post_id][r.emoji] = []
        grouped[r.post_id][r.emoji].push(r.user_id)
      })
      setReactions(grouped)
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
    await supabase.from('posts').delete().eq('id', postId).eq('user_id', user.id)
    setOpenMenuId(null)
    await fetchPosts()
  }

  const handleEdit = async (postId) => {
    await supabase.from('posts').update({ content: editContent }).eq('id', postId).eq('user_id', user.id)
    setEditingPostId(null)
    setEditContent('')
    await fetchPosts()
  }

 const handleReaction = async (postId, emoji) => {
    const existingEmoji = Object.keys(reactions[postId] || {}).find(e =>
      reactions[postId][e]?.includes(user.id)
    )

    if (existingEmoji === emoji) {
      // Remove reaction if clicking the same emoji
      await supabase.from('reactions').delete()
        .eq('post_id', postId)
        .eq('user_id', user.id)
    } else {
      // Replace old reaction with new one
      await supabase.from('reactions').delete()
        .eq('post_id', postId)
        .eq('user_id', user.id)

      await supabase.from('reactions').insert({
        post_id: postId,
        user_id: user.id,
        emoji
      })
    }

    setOpenEmojiId(null)
    await fetchPosts()
  }

  const fetchComments = async (postId) => {
    const { data } = await supabase
      .from('comments')
      .select('*')
      .eq('post_id', postId)
      .order('created_at', { ascending: true })

    if (data) {
      const withUsernames = await Promise.all(
        data.map(async (comment) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('username')
            .eq('id', comment.user_id)
            .single()
          return { ...comment, username: profile?.username || comment.user_id }
        })
      )
      setComments((prev) => ({ ...prev, [postId]: withUsernames }))
    }
  }

  const handleOpenComments = async (postId) => {
    if (openCommentsId === postId) {
      setOpenCommentsId(null)
      return
    }
    setOpenCommentsId(postId)
    await fetchComments(postId)
  }

  const handleAddComment = async (postId) => {
    if (!commentInput.trim()) return
    await supabase.from('comments').insert({
      post_id: postId,
      user_id: user.id,
      content: commentInput,
    })
    setCommentInput('')
    await fetchComments(postId)
  }

  const handleShare = (post) => {
    navigator.clipboard.writeText(post.content)
    alert('Post copied to clipboard!')
  }

  const totalReactions = (postId) => {
    if (!reactions[postId]) return 0
    return Object.values(reactions[postId]).reduce((sum, arr) => sum + arr.length, 0)
  }

  const commentCount = (postId) => comments[postId]?.length || 0

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
            style={{ backgroundColor: '#16213e', color: '#ffffff', border: '1px solid #2d2d4e' }}
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

              {/* Post Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                    style={{ backgroundColor: '#7c3aed' }}>
                    {post.username?.[0]?.toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-white">{post.username}</p>
                    <p className="text-xs" style={{ color: '#a0a0b0' }}>
                      {new Date(post.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>

                {/* Three Dot Menu */}
                <div className="relative">
                  <button
                    onClick={() => setOpenMenuId(openMenuId === post.id ? null : post.id)}
                    className="text-lg px-2"
                    style={{ color: '#a0a0b0' }}
                  >
                    ···
                  </button>
                  {openMenuId === post.id && (
                    <div className="absolute right-0 top-8 rounded-xl border z-10 w-36"
                      style={{ backgroundColor: '#1a1a2e', borderColor: '#2d2d4e' }}>
                      {post.user_id === user.id ? (
                        <>
                          <button
                            onClick={() => { setEditingPostId(post.id); setEditContent(post.content); setOpenMenuId(null) }}
                            className="w-full text-left px-4 py-2 text-sm text-white hover:opacity-75"
                          >
                            ✏️ Edit
                          </button>
                          <button
                            onClick={() => handleDelete(post.id)}
                            className="w-full text-left px-4 py-2 text-sm text-red-400 hover:opacity-75"
                          >
                            🗑️ Delete
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => { setDetailsPost(post); setOpenMenuId(null) }}
                          className="w-full text-left px-4 py-2 text-sm text-white hover:opacity-75"
                        >
                          ℹ️ Details
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Edit Mode */}
              {editingPostId === post.id ? (
                <div className="mb-3">
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className="w-full p-3 rounded-lg resize-none focus:outline-none"
                    style={{ backgroundColor: '#16213e', color: '#ffffff', border: '1px solid #7c3aed' }}
                    rows={3}
                  />
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={() => handleEdit(post.id)}
                      className="px-4 py-1 rounded-lg text-sm text-white"
                      style={{ backgroundColor: '#7c3aed' }}
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setEditingPostId(null)}
                      className="px-4 py-1 rounded-lg text-sm"
                      style={{ color: '#a0a0b0', border: '1px solid #2d2d4e' }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <p className="mb-3" style={{ color: '#e0e0e0' }}>{post.content}</p>
              )}

              {/* Reaction Summary */}
              {reactions[post.id] && Object.keys(reactions[post.id]).length > 0 && (
                <div className="flex gap-1 mb-2 flex-wrap">
                  {Object.entries(reactions[post.id]).map(([emoji, users]) => (
                    <button
                      key={emoji}
                      onClick={() => handleReaction(post.id, emoji)}
                      className="text-xs px-2 py-1 rounded-full border"
                      style={{
                        borderColor: users.includes(user.id) ? '#7c3aed' : '#2d2d4e',
                        backgroundColor: users.includes(user.id) ? '#2d1b69' : 'transparent',
                        color: '#ffffff'
                      }}
                    >
                      {emoji} {users.length}
                    </button>
                  ))}
                </div>
              )}

              {/* Action Bar */}
              <div className="flex items-center gap-4 pt-2 border-t" style={{ borderColor: '#2d2d4e' }}>

                {/* React */}
                <div className="relative">
                  <button
                    onClick={() => setOpenEmojiId(openEmojiId === post.id ? null : post.id)}
                    className="flex items-center gap-1 text-sm"
                    style={{ color: '#a0a0b0' }}
                  >
                    ❤️ {totalReactions(post.id) || ''}
                  </button>
                  {openEmojiId === post.id && (
                    <div className="absolute left-0 bottom-8 flex gap-1 p-2 rounded-xl border z-10"
                      style={{ backgroundColor: '#1a1a2e', borderColor: '#2d2d4e' }}>
                      {EMOJIS.map((emoji) => (
                        <button
                          key={emoji}
                          onClick={() => handleReaction(post.id, emoji)}
                          className="text-xl hover:scale-125 transition-transform"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Comment */}
                <button
                  onClick={() => handleOpenComments(post.id)}
                  className="flex items-center gap-1 text-sm"
                  style={{ color: '#a0a0b0' }}
                >
                  💬 {comments[post.id]?.length || ''}
                </button>

                {/* Share */}
                <button
                  onClick={() => handleShare(post)}
                  className="flex items-center gap-1 text-sm"
                  style={{ color: '#a0a0b0' }}
                >
                  🔗 Share
                </button>
              </div>

              {/* Comments Section */}
              {openCommentsId === post.id && (
                <div className="mt-3 pt-3 border-t" style={{ borderColor: '#2d2d4e' }}>
                  {comments[post.id]?.length === 0 && (
                    <p className="text-xs mb-2" style={{ color: '#a0a0b0' }}>No comments yet.</p>
                  )}
                  {comments[post.id]?.map((comment) => (
                    <div key={comment.id} className="flex gap-2 mb-2">
                      <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                        style={{ backgroundColor: '#7c3aed' }}>
                        {comment.username?.[0]?.toUpperCase()}
                      </div>
                      <div>
                        <span className="text-xs font-semibold text-white">{comment.username} </span>
                        <span className="text-xs" style={{ color: '#e0e0e0' }}>{comment.content}</span>
                      </div>
                    </div>
                  ))}
                  <div className="flex gap-2 mt-2">
                    <input
                      type="text"
                      value={commentInput}
                      onChange={(e) => setCommentInput(e.target.value)}
                      placeholder="Write a comment..."
                      className="flex-1 p-2 rounded-lg text-sm focus:outline-none"
                      style={{ backgroundColor: '#16213e', color: '#ffffff', border: '1px solid #2d2d4e' }}
                    />
                    <button
                      onClick={() => handleAddComment(post.id)}
                      className="px-3 py-2 rounded-lg text-sm text-white"
                      style={{ backgroundColor: '#7c3aed' }}
                    >
                      Send
                    </button>
                  </div>
                </div>
              )}

            </div>
          ))}
        </div>
      </div>

      {/* Details Modal */}
      {detailsPost && (
        <div className="fixed inset-0 flex items-center justify-center z-50"
          style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}
          onClick={() => setDetailsPost(null)}>
          <div className="p-6 rounded-xl border w-80"
            style={{ backgroundColor: '#1a1a2e', borderColor: '#2d2d4e' }}
            onClick={(e) => e.stopPropagation()}>
            <h2 className="font-bold text-white mb-4">Post Details</h2>
            <p className="text-sm mb-2" style={{ color: '#a0a0b0' }}>
              <span className="text-white">Posted by: </span>{detailsPost.username}
            </p>
            <p className="text-sm mb-2" style={{ color: '#a0a0b0' }}>
              <span className="text-white">Time: </span>
              {new Date(detailsPost.created_at).toLocaleString()}
            </p>
            <p className="text-sm mb-4" style={{ color: '#a0a0b0' }}>
              <span className="text-white">University: </span>Lupane State University
            </p>
            <button
              onClick={() => setDetailsPost(null)}
              className="w-full py-2 rounded-lg text-sm text-white"
              style={{ backgroundColor: '#7c3aed' }}
            >
              Close
            </button>
          </div>
        </div>
      )}

    </div>
  )
}