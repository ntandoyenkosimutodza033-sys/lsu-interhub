'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '../lib/supabase'
import { useRouter } from 'next/navigation'
import Navbar from '../components/Navbar'
import ReactMarkdown from 'react-markdown'
import { Heart, MessageCircle, Share2, MoreHorizontal, Pencil, Trash2, Info } from 'lucide-react'

const EMOJIS = ['❤️', '😂', '😮', '😢', '👍', '🔥']
const TABS = ['For You', 'Trending', 'Updates']
const APP_URL = 'https://lsu-interhub.vercel.app'

const ROTATING_PROMPTS = [
  "How are you feeling today?",
  "What's the hottest topic on campus right now?",
  "Got an opinion? Share it with LSU.",
  "What's one thing you wish the university would change?",
  "How's your semester going so far?",
  "What's the best thing about studying at LSU?",
  "Any tips for surviving exam season?",
  "What's happening around campus today?",
]

const ACCENT_COLORS = ['#7c3aed', '#3b82f6', '#22c55e', '#f97316', '#ec4899', '#14b8a6', '#ef4444', '#eab308']

const getAccentColor = (username) => {
  if (!username) return ACCENT_COLORS[0]
  let hash = 0
  for (let i = 0; i < username.length; i++) {
    hash = username.charCodeAt(i) + ((hash << 5) - hash)
  }
  return ACCENT_COLORS[Math.abs(hash) % ACCENT_COLORS.length]
}

const timeAgo = (dateString) => {
  const now = new Date()
  const date = new Date(dateString)
  const seconds = Math.floor((now - date) / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)
  const weeks = Math.floor(days / 7)

  if (seconds < 60) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days} days ago`
  if (weeks === 1) return 'Last week'
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

const expiresIn = (dateString) => {
  const now = new Date()
  const date = new Date(dateString)
  const diff = date - now
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24))

  if (diff < 0) return 'Expired'
  if (days === 0) return 'Expires today'
  if (days === 1) return 'Expires tomorrow'
  if (days < 7) return `Expires in ${days} days`
  if (days < 14) return 'Expires next week'
  return `Expires in ${Math.ceil(days / 7)} weeks`
}

export default function FeedPage() {
  const [user, setUser] = useState(null)
  const [username, setUsername] = useState('')
  const [posts, setPosts] = useState([])
  const [announcements, setAnnouncements] = useState([])
  const [pinnedAnnouncements, setPinnedAnnouncements] = useState([])
  const [selectedAnnouncement, setSelectedAnnouncement] = useState(null)
  const [heroVisible, setHeroVisible] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [content, setContent] = useState('')
  const [announcementTitle, setAnnouncementTitle] = useState('')
  const [announcementContent, setAnnouncementContent] = useState('')
  const [pinDuration, setPinDuration] = useState(7)
  const [activeTab, setActiveTab] = useState('Trending')
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
  const [isPlaying, setIsPlaying] = useState(false)
  const [showPostBox, setShowPostBox] = useState(false)
  const [promptIndex, setPromptIndex] = useState(0)
  const heroRef = useRef(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const interval = setInterval(() => {
      setPromptIndex((prev) => (prev + 1) % ROTATING_PROMPTS.length)
    }, 4000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) {
          setHeroVisible(false)
        }
      },
      { threshold: 0.1 }
    )
    if (heroRef.current) observer.observe(heroRef.current)
    return () => observer.disconnect()
  }, [])

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
        .select('username, role')
        .eq('id', user.id)
        .single()

      if (!profile || !profile.username) {
        router.push('/profile')
        return
      }

      setUsername(profile.username)

      if (profile.role === 'admin') {
        setIsAdmin(true)
      }

      await fetchPosts()
      await fetchAnnouncements()
      await fetchPinnedAnnouncements()
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

    setPosts([...postsWithUsernames])

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
      setReactions({ ...grouped })
    }

    const { data: commentCountData } = await supabase
      .from('comments')
      .select('post_id')

    if (commentCountData) {
      const countMap = {}
      commentCountData.forEach((c) => {
        countMap[c.post_id] = (countMap[c.post_id] || 0) + 1
      })
      setComments((prev) => {
        const updated = { ...prev }
        Object.keys(countMap).forEach((postId) => {
          if (!updated[postId]) {
            updated[postId] = Array(countMap[postId]).fill({ id: postId, username: '', content: '' })
          }
        })
        return updated
      })
    }
  }

  const fetchAnnouncements = async () => {
    const { data, error } = await supabase
      .from('announcements')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error(error)
      return
    }
    setAnnouncements(data)
  }

  const fetchPinnedAnnouncements = async () => {
    const now = new Date().toISOString()
    const { data, error } = await supabase
      .from('announcements')
      .select('*')
      .gt('pinned_until', now)
      .order('created_at', { ascending: false })

    if (error) {
      console.error(error)
      return
    }
    setPinnedAnnouncements(data)
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
      setShowPostBox(false)
      await fetchPosts()
    }
    setPosting(false)
  }

  const handleAnnouncement = async () => {
    if (!announcementTitle.trim() || !announcementContent.trim()) return
    setPosting(true)

    const pinnedUntil = new Date()
    pinnedUntil.setDate(pinnedUntil.getDate() + pinDuration)

    const { error } = await supabase
      .from('announcements')
      .insert({
        user_id: user.id,
        title: announcementTitle,
        content: announcementContent,
        pin_duration: pinDuration,
        pinned_until: pinnedUntil.toISOString(),
        community: 'LSU InterHub',
      })

    if (error) {
      console.error(error)
    } else {
      setAnnouncementTitle('')
      setAnnouncementContent('')
      setPinDuration(7)
      await fetchAnnouncements()
      await fetchPinnedAnnouncements()
    }
    setPosting(false)
  }

  const handleDelete = async (postId) => {
    await supabase.from('posts').delete().eq('id', postId).eq('user_id', user.id)
    setOpenMenuId(null)
    await fetchPosts()
  }

  const handleReaction = async (postId, emoji) => {
    const existingEmoji = Object.keys(reactions[postId] || {}).find(e =>
      reactions[postId][e]?.includes(user.id)
    )

    if (existingEmoji === emoji) {
      await supabase.from('reactions').delete()
        .eq('post_id', postId)
        .eq('user_id', user.id)
    } else {
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

  const handleShare = async (post) => {
    const shareText = `${post.content}\n\nShared from LSU InterHub — ${APP_URL}`

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'LSU InterHub',
          text: `${post.content}\n\nShared from LSU InterHub`,
          url: APP_URL,
        })
      } catch (err) {
        // user cancelled share, do nothing
      }
    } else {
      navigator.clipboard.writeText(shareText)
      alert('Post and app link copied to clipboard!')
    }
  }

  const totalReactions = (postId) => {
    if (!reactions[postId]) return 0
    return Object.values(reactions[postId]).reduce((sum, arr) => sum + arr.length, 0)
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

      {/* HERO SECTION */}
      <div ref={heroRef} className="max-w-2xl mx-auto px-4 pt-4 pb-2">

        {/* Create Post Card */}
        <div className="rounded-2xl p-4 mb-3 relative overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, #1a0533 0%, #2d1060 50%, #1a1a2e 100%)',
            border: '1px solid #7c3aed',
          }}>
          <div className="absolute top-0 right-0 w-32 h-32 rounded-full opacity-10"
            style={{ background: '#7c3aed', filter: 'blur(40px)', transform: 'translate(20%, -20%)' }} />

          {!showPostBox ? (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0"
                style={{ backgroundColor: '#7c3aed' }}>
                {username?.[0]?.toUpperCase()}
              </div>
              <button
                onClick={() => setShowPostBox(true)}
                className="flex-1 text-left p-3 rounded-xl text-sm transition-all"
                style={{ backgroundColor: 'rgba(255,255,255,0.05)', color: '#a0a0b0', border: '1px solid rgba(124,58,237,0.3)' }}
              >
                <span key={promptIndex} className="block">
                  {ROTATING_PROMPTS[promptIndex]}
                </span>
              </button>
              <button
                onClick={() => setShowPostBox(true)}
                className="px-4 py-2 rounded-xl text-sm font-semibold text-white flex-shrink-0"
                style={{ backgroundColor: '#7c3aed' }}
              >
                ✏️ Post
              </button>
            </div>
          ) : (
            <div>
              <textarea
                value={content}
                onChange={(e) => {
                  if (e.target.value.length <= 1000) setContent(e.target.value)
                }}
                onKeyDown={(e) => {
                  if (e.ctrlKey && e.key === 'Enter') handlePost()
                }}
                placeholder={ROTATING_PROMPTS[promptIndex]}
                className="w-full p-3 rounded-xl mb-2 resize-none focus:outline-none text-sm"
                style={{ backgroundColor: 'rgba(255,255,255,0.05)', color: '#ffffff', border: '1px solid rgba(124,58,237,0.5)' }}
                rows={4}
                autoFocus
              />
              <div className="flex justify-between items-center mb-2">
                <p className="text-xs" style={{ color: '#a0a0b0' }}>
                  Tip: use - for bullets, **bold**, _italic_
                </p>
                <p className="text-xs" style={{ color: content.length > 900 ? '#ef4444' : '#a0a0b0' }}>
                  {content.length}/1000
                </p>
              </div>
              {error && <p className="text-red-400 text-sm mb-2">{error}</p>}
              <div className="flex gap-2">
                <button
                  onClick={handlePost}
                  disabled={posting || !content.trim()}
                  className="px-6 py-2 rounded-xl font-medium text-white text-sm"
                  style={{ backgroundColor: posting || !content.trim() ? '#4c1d95' : '#7c3aed' }}
                >
                  {posting ? 'Posting...' : 'Post'}
                </button>
                <button
                  onClick={() => { setShowPostBox(false); setContent('') }}
                  className="px-4 py-2 rounded-xl text-sm"
                  style={{ color: '#a0a0b0', border: '1px solid #2d2d4e' }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* LSU Radio Placeholder Card */}
        <div className="rounded-2xl p-4 mb-3 relative overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, #0d1f3c 0%, #1a1060 50%, #0f0f0f 100%)',
            border: '1px solid #2d2d4e',
          }}>
          <div className="absolute top-0 right-0 w-24 h-24 rounded-full opacity-10"
            style={{ background: '#3b82f6', filter: 'blur(30px)', transform: 'translate(20%, -20%)' }} />

          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold"
                style={{ backgroundColor: 'rgba(239,68,68,0.2)', color: '#ef4444' }}>
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse inline-block" />
                LIVE
              </span>
              <span className="text-xs font-bold" style={{ color: '#a0a0b0' }}>LSU RADIO</span>
            </div>
            <span className="text-xs px-2 py-0.5 rounded-full"
              style={{ backgroundColor: 'rgba(124,58,237,0.2)', color: '#7c3aed' }}>
              Coming Soon
            </span>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-bold text-white text-sm">Late Night Talks 🌙</p>
              <p className="text-xs mt-0.5" style={{ color: '#a0a0b0' }}>
                Hosted by Thandeka Moyo
              </p>
            </div>
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="w-10 h-10 rounded-full flex items-center justify-center text-white flex-shrink-0"
              style={{ backgroundColor: '#7c3aed' }}
            >
              {isPlaying ? '⏸' : '▶'}
            </button>
          </div>

          <div className="flex items-center gap-1 mt-3">
            {[...Array(20)].map((_, i) => (
              <div
                key={i}
                className="rounded-full flex-1"
                style={{
                  height: `${Math.random() * 16 + 4}px`,
                  backgroundColor: isPlaying ? '#7c3aed' : '#2d2d4e',
                  opacity: isPlaying ? 0.7 + Math.random() * 0.3 : 0.3,
                  transition: 'all 0.3s ease'
                }}
              />
            ))}
          </div>
        </div>

        {/* Pinned Announcements Banner */}
        {heroVisible && pinnedAnnouncements.length > 0 && (
          <div className="mb-2">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-semibold" style={{ color: '#7c3aed' }}>📢 Announcements</span>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2" style={{ scrollbarWidth: 'none' }}>
              {pinnedAnnouncements.map((announcement) => (
                <button
                  key={announcement.id}
                  onClick={() => setSelectedAnnouncement(announcement)}
                  className="flex-shrink-0 p-3 rounded-xl border text-left"
                  style={{ backgroundColor: '#1a1a2e', borderColor: '#7c3aed', minWidth: '200px', maxWidth: '200px' }}
                >
                  <p className="text-xs font-semibold text-white truncate">{announcement.title}</p>
                  <p className="text-xs mt-1" style={{ color: '#a0a0b0' }}>{announcement.community}</p>
                  <p className="text-xs mt-1" style={{ color: '#7c3aed' }}>
                    {expiresIn(announcement.pinned_until)}
                  </p>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* TABS */}
      <div className="max-w-2xl mx-auto px-4">
        <div className="flex border-b mb-4" style={{ borderColor: '#2d2d4e' }}>
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className="flex-1 py-3 text-sm font-semibold transition-colors"
              style={{
                color: activeTab === tab ? '#7c3aed' : '#a0a0b0',
                borderBottom: activeTab === tab ? '2px solid #7c3aed' : '2px solid transparent',
              }}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* FEED CONTENT */}
      <div className="max-w-2xl mx-auto px-4">

        {/* FOR YOU TAB */}
        {activeTab === 'For You' && (
          <div className="text-center py-16">
            <p className="text-4xl mb-4">🏘️</p>
            <p className="font-bold text-white text-lg mb-2">Your communities will appear here</p>
            <p className="text-sm" style={{ color: '#a0a0b0' }}>
              Join communities to see posts from people you follow.
            </p>
          </div>
        )}

        {/* TRENDING TAB */}
        {activeTab === 'Trending' && (
          <div className="space-y-1">
            {posts.length === 0 && (
              <p className="text-center py-8" style={{ color: '#a0a0b0' }}>
                No posts yet. Be the first to post!
              </p>
            )}
            {posts.map((post) => {
              const accentColor = getAccentColor(post.username)
              return (
                <div key={post.id} className="rounded-xl overflow-hidden transition-transform hover:-translate-y-0.5"
                  style={{
                    backgroundColor: '#181826',
                    boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
                    borderLeft: `3px solid ${accentColor}`,
                  }}>
                  <div className="p-4">

                    {/* Post Header */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                          style={{ backgroundColor: accentColor }}>
                          {post.username?.[0]?.toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-sm text-white">{post.username}</p>
                          <p className="text-xs" style={{ color: '#a0a0b0' }}>
                            {timeAgo(post.created_at)}
                          </p>
                        </div>
                      </div>

                      {/* Three Dot Menu */}
                      <div className="relative">
                        <button
                          onClick={() => setOpenMenuId(openMenuId === post.id ? null : post.id)}
                          className="p-1 rounded-lg transition-colors"
                          style={{ color: '#a0a0b0' }}
                        >
                          <MoreHorizontal size={18} />
                        </button>
                        {openMenuId === post.id && (
                          <div className="absolute right-0 top-8 rounded-xl border z-10 w-36 overflow-hidden"
                            style={{ backgroundColor: '#1a1a2e', borderColor: '#2d2d4e' }}>
                            {post.user_id === user.id ? (
                              <>
                                <button
                                  onClick={() => { setEditingPostId(post.id); setEditContent(post.content); setOpenMenuId(null) }}
                                  className="w-full flex items-center gap-2 text-left px-4 py-2 text-sm text-white hover:bg-white/5"
                                >
                                  <Pencil size={14} /> Edit
                                </button>
                                <button
                                  onClick={() => {
                                    if (!window.confirm('Delete this post?')) return
                                    handleDelete(post.id)
                                  }}
                                  className="w-full flex items-center gap-2 text-left px-4 py-2 text-sm text-red-400 hover:bg-white/5"
                                >
                                  <Trash2 size={14} /> Delete
                                </button>
                              </>
                            ) : (
                              <button
                                onClick={() => { setDetailsPost(post); setOpenMenuId(null) }}
                                className="w-full flex items-center gap-2 text-left px-4 py-2 text-sm text-white hover:bg-white/5"
                              >
                                <Info size={14} /> Details
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
                            onClick={async () => {
                              const { error } = await supabase
                                .from('posts')
                                .update({ content: editContent, edited: true })
                                .eq('id', post.id)
                                .eq('user_id', user.id)
                              if (!error) {
                                const updatedPosts = posts.map(p =>
                                  p.id === post.id
                                    ? { ...p, content: editContent, edited: true }
                                    : p
                                )
                                setPosts(updatedPosts)
                                setEditingPostId(null)
                                setEditContent('')
                              }
                            }}
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
                      <div className="mb-3">
                        <div style={{ color: '#e0e0e0', wordBreak: 'break-word' }} className="text-sm">
                          <ReactMarkdown
                            components={{
                              ul: ({node, ...props}) => <ul style={{ listStyleType: 'disc', paddingLeft: '1.5rem', marginBottom: '0.5rem' }} {...props} />,
                              ol: ({node, ...props}) => <ol style={{ listStyleType: 'decimal', paddingLeft: '1.5rem', marginBottom: '0.5rem' }} {...props} />,
                              li: ({node, ...props}) => <li style={{ marginBottom: '0.25rem', color: '#e0e0e0' }} {...props} />,
                              p: ({node, ...props}) => <p style={{ marginBottom: '0.5rem' }} {...props} />,
                              strong: ({node, ...props}) => <strong style={{ color: '#ffffff', fontWeight: 'bold' }} {...props} />,
                              em: ({node, ...props}) => <em style={{ color: '#e0e0e0' }} {...props} />,
                            }}
                          >
                            {post.content}
                          </ReactMarkdown>
                        </div>
                      </div>
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
                              borderColor: users.includes(user.id) ? accentColor : '#2d2d4e',
                              backgroundColor: users.includes(user.id) ? `${accentColor}22` : 'transparent',
                              color: '#ffffff'
                            }}
                          >
                            {emoji} {users.length}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Action Bar */}
                  <div className="flex items-center gap-4 px-4 py-3 border-t"
                    style={{ borderColor: '#22222f', backgroundColor: 'rgba(255,255,255,0.02)' }}>
                    <div className="relative">
                      <button
                        onClick={() => setOpenEmojiId(openEmojiId === post.id ? null : post.id)}
                        className="flex items-center gap-1.5 text-sm transition-colors"
                        style={{ color: totalReactions(post.id) > 0 ? accentColor : '#a0a0b0' }}
                      >
                        <Heart size={16} fill={totalReactions(post.id) > 0 ? accentColor : 'none'} />
                        {totalReactions(post.id) || ''}
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

                    <button
                      onClick={() => handleOpenComments(post.id)}
                      className="flex items-center gap-1.5 text-sm"
                      style={{ color: '#a0a0b0' }}
                    >
                      <MessageCircle size={16} />
                      {comments[post.id]?.length || ''}
                    </button>

                    <button
                      onClick={() => handleShare(post)}
                      className="flex items-center gap-1.5 text-sm"
                      style={{ color: '#a0a0b0' }}
                    >
                      <Share2 size={16} />
                    </button>

                    <div className="flex-1" />

                    {post.edited && (
                      <span className="text-xs italic" style={{ color: '#6b6b7d' }}>edited</span>
                    )}
                  </div>

                  {/* Comments Section */}
                  {openCommentsId === post.id && (
                    <div className="px-4 py-3 border-t" style={{ borderColor: '#22222f' }}>
                      {comments[post.id]?.length === 0 && (
                        <p className="text-xs mb-2" style={{ color: '#a0a0b0' }}>No comments yet.</p>
                      )}
                      {comments[post.id]?.map((comment) => (
                        <div key={comment.id} className="flex gap-2 mb-2 justify-between items-start">
                          <div className="flex gap-2">
                            <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                              style={{ backgroundColor: getAccentColor(comment.username) }}>
                              {comment.username?.[0]?.toUpperCase()}
                            </div>
                            <div>
                              <span className="text-xs font-semibold text-white">{comment.username} </span>
                              <span className="text-xs" style={{ color: '#e0e0e0' }}>{comment.content}</span>
                            </div>
                          </div>
                          {comment.user_id === user.id && (
                            <button
                              onClick={async () => {
                                if (!window.confirm('Delete this comment?')) return
                                await supabase.from('comments').delete().eq('id', comment.id)
                                await fetchComments(post.id)
                              }}
                              className="text-xs flex-shrink-0"
                              style={{ color: '#ef4444' }}
                            >
                              ✕
                            </button>
                          )}
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
                          style={{ backgroundColor: accentColor }}
                        >
                          Send
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* UPDATES TAB */}
        {activeTab === 'Updates' && (
          <>
            {isAdmin && (
              <div className="p-4 rounded-xl mb-6 border"
                style={{ backgroundColor: '#1a1a2e', borderColor: '#2d2d4e' }}>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-lg">📢</span>
                  <p className="font-semibold text-white">Post an Announcement</p>
                  <span className="text-xs px-2 py-0.5 rounded-full text-white"
                    style={{ backgroundColor: '#7c3aed' }}>Admin</span>
                </div>
                <input
                  type="text"
                  value={announcementTitle}
                  onChange={(e) => setAnnouncementTitle(e.target.value)}
                  placeholder="Title"
                  className="w-full p-3 rounded-lg mb-3 focus:outline-none"
                  style={{ backgroundColor: '#16213e', color: '#ffffff', border: '1px solid #2d2d4e' }}
                />
                <textarea
                  value={announcementContent}
                  onChange={(e) => setAnnouncementContent(e.target.value)}
                  placeholder="Write your announcement..."
                  className="w-full p-3 rounded-lg mb-3 resize-none focus:outline-none"
                  style={{ backgroundColor: '#16213e', color: '#ffffff', border: '1px solid #2d2d4e' }}
                  rows={3}
                />
                <div className="mb-3">
                  <p className="text-xs mb-2" style={{ color: '#a0a0b0' }}>Pin duration</p>
                  <div className="flex gap-2">
                    {[3, 7, 14, 28].map((days) => (
                      <button
                        key={days}
                        onClick={() => setPinDuration(days)}
                        className="px-3 py-1 rounded-lg text-sm"
                        style={{
                          backgroundColor: pinDuration === days ? '#7c3aed' : '#16213e',
                          color: '#ffffff',
                          border: `1px solid ${pinDuration === days ? '#7c3aed' : '#2d2d4e'}`
                        }}
                      >
                        {days}d
                      </button>
                    ))}
                  </div>
                </div>
                <button
                  onClick={handleAnnouncement}
                  disabled={posting}
                  className="px-6 py-2 rounded-lg font-medium text-white"
                  style={{ backgroundColor: posting ? '#6d28d9' : '#7c3aed' }}
                >
                  {posting ? 'Posting...' : 'Post Announcement'}
                </button>
              </div>
            )}

            <div className="space-y-1">
              {announcements.length === 0 && (
                <p className="text-center py-8" style={{ color: '#a0a0b0' }}>
                  No announcements yet.
                </p>
              )}
              {announcements.map((announcement) => {
                const isExpired = new Date(announcement.pinned_until) < new Date()
                return (
                  <div key={announcement.id} className="p-4 rounded-xl border"
                    style={{
                      backgroundColor: '#1a1a2e',
                      borderColor: isExpired ? '#2d2d4e' : '#7c3aed',
                    }}>
                    <div style={{ opacity: isExpired ? 0.5 : 1 }}>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-lg">📢</span>
                        <p className="font-bold text-white">{announcement.title}</p>
                        {isExpired && (
                          <span className="text-xs px-2 py-0.5 rounded-full"
                            style={{ backgroundColor: '#2d2d4e', color: '#a0a0b0' }}>
                            Expired
                          </span>
                        )}
                      </div>
                      <p className="text-sm mb-3" style={{ color: '#e0e0e0', wordBreak: 'break-word' }}>
                        {announcement.content}
                      </p>
                      <div className="flex justify-between items-center">
                        <p className="text-xs" style={{ color: '#a0a0b0' }}>{announcement.community}</p>
                        <p className="text-xs" style={{ color: '#a0a0b0' }}>{timeAgo(announcement.created_at)}</p>
                      </div>
                    </div>

                    {isAdmin && isExpired && (
                      <div className="mt-3 pt-3 border-t" style={{ borderColor: '#2d2d4e' }}>
                        <p className="text-xs mb-2" style={{ color: '#a0a0b0' }}>Repin for:</p>
                        <div className="flex gap-2">
                          {[3, 7, 14, 28].map((days) => (
                            <button
                              key={days}
                              onClick={async () => {
                                const pinnedUntil = new Date()
                                pinnedUntil.setDate(pinnedUntil.getDate() + days)
                                await supabase
                                  .from('announcements')
                                  .update({ pinned_until: pinnedUntil.toISOString() })
                                  .eq('id', announcement.id)
                                await fetchAnnouncements()
                                await fetchPinnedAnnouncements()
                              }}
                              className="px-3 py-1 rounded-lg text-xs text-white"
                              style={{ backgroundColor: '#7c3aed' }}
                            >
                              {days}d
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>

      {/* Announcement Modal */}
      {selectedAnnouncement && (
        <div className="fixed inset-0 flex items-center justify-center z-50"
          style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}
          onClick={() => setSelectedAnnouncement(null)}>
          <div className="p-6 rounded-xl border w-80 mx-4"
            style={{ backgroundColor: '#1a1a2e', borderColor: '#2d2d4e' }}
            onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">📢</span>
              <p className="font-bold text-white">{selectedAnnouncement.title}</p>
            </div>
            <p className="text-sm mb-3" style={{ color: '#e0e0e0' }}>
              {selectedAnnouncement.content}
            </p>
            <div className="border-t pt-3 mb-4" style={{ borderColor: '#2d2d4e' }}>
              <p className="text-xs mb-1" style={{ color: '#a0a0b0' }}>
                <span className="text-white">Community: </span>{selectedAnnouncement.community}
              </p>
              <p className="text-xs mb-1" style={{ color: '#a0a0b0' }}>
                <span className="text-white">Posted: </span>
                {timeAgo(selectedAnnouncement.created_at)}
              </p>
              <p className="text-xs" style={{ color: '#a0a0b0' }}>
                <span className="text-white">Expires: </span>
                {expiresIn(selectedAnnouncement.pinned_until)}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => { setSelectedAnnouncement(null); setActiveTab('Updates') }}
                className="flex-1 py-2 rounded-lg text-sm text-white"
                style={{ backgroundColor: '#7c3aed' }}
              >
                See All Updates
              </button>
              <button
                onClick={() => setSelectedAnnouncement(null)}
                className="flex-1 py-2 rounded-lg text-sm border"
                style={{ borderColor: '#2d2d4e', color: '#a0a0b0' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

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
              {timeAgo(detailsPost.created_at)}
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