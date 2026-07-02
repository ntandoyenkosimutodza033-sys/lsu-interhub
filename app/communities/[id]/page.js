'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/app/lib/supabase'
import { useRouter, useParams } from 'next/navigation'
import Navbar from '@/app/components/Navbar'
import ReactMarkdown from 'react-markdown'
import {
  Users, Lock, Globe, ArrowLeft, MoreHorizontal,
  Pencil, Trash2, Share2, ChevronRight, Send
} from 'lucide-react'

const CATEGORY_LABELS = {
  department: 'Department',
  club: 'Club',
  sports: 'Sports',
  hostel: 'Hostel',
  year_group: 'Year Group',
  religious: 'Religious',
  committee: 'Committee',
  academic_class: 'Class',
  official: 'Official',
  other: 'Other',
}

const CATEGORY_COLORS = {
  department: '#3b82f6',
  club: '#22c55e',
  sports: '#f97316',
  hostel: '#ec4899',
  year_group: '#eab308',
  religious: '#14b8a6',
  committee: '#7c3aed',
  academic_class: '#06b6d4',
  official: '#ef4444',
  other: '#a0a0b0',
}

const CATEGORY_EMOJI = {
  department: '🎓',
  academic_class: '📚',
  club: '🎭',
  sports: '🏆',
  hostel: '🏠',
  year_group: '👥',
  religious: '✝️',
  committee: '🏛',
  official: '📢',
  other: '🌐',
}

const LEADER_ROLES = ['president', 'vice_president', 'secretary', 'treasurer', 'moderator']

const PLACEHOLDER_RULES = [
  'Respect everyone.',
  'Stay on topic.',
  'No spam.',
  'No offensive language.',
  'Be kind and supportive.',
]

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

export default function CommunityPage() {
  const [user, setUser] = useState(null)
  const [community, setCommunity] = useState(null)
  const [posts, setPosts] = useState([])
  const [members, setMembers] = useState([])
  const [myMembership, setMyMembership] = useState(null)
  const [loading, setLoading] = useState(true)
  const [content, setContent] = useState('')
  const [posting, setPosting] = useState(false)
  const [openMenuId, setOpenMenuId] = useState(null)
  const [editingPostId, setEditingPostId] = useState(null)
  const [editContent, setEditContent] = useState('')
  const [showThreeDot, setShowThreeDot] = useState(false)
  const [showMembersModal, setShowMembersModal] = useState(false)
  const router = useRouter()
  const params = useParams()
  const supabase = createClient()
  const communityId = params.id

  useEffect(() => {
    const initialize = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUser(user)
      await fetchCommunity()
      await fetchPosts()
      await fetchMembers()
      await fetchMyMembership(user.id)
      setLoading(false)
    }
    initialize()
  }, [])

  const fetchCommunity = async () => {
    const { data } = await supabase.from('communities').select('*').eq('id', communityId).single()
    setCommunity(data)
  }

  const fetchPosts = async () => {
    const { data } = await supabase
      .from('community_posts')
      .select('*')
      .eq('community_id', communityId)
      .order('created_at', { ascending: false })

    if (data) {
      const withUsernames = await Promise.all(
        data.map(async (post) => {
          const { data: profile } = await supabase.from('profiles').select('username').eq('id', post.user_id).single()
          const { data: member } = await supabase.from('community_members').select('role').eq('community_id', communityId).eq('user_id', post.user_id).single()
          return { ...post, username: profile?.username || post.user_id, role: member?.role || 'member' }
        })
      )
      setPosts(withUsernames)
    }
  }

  const fetchMembers = async () => {
    const { data } = await supabase.from('community_members').select('*').eq('community_id', communityId).eq('status', 'active')
    if (data) {
      const withUsernames = await Promise.all(
        data.map(async (member) => {
          const { data: profile } = await supabase.from('profiles').select('username').eq('id', member.user_id).single()
          return { ...member, username: profile?.username || member.user_id }
        })
      )
      setMembers(withUsernames)
    }
  }

  const fetchMyMembership = async (userId) => {
    const { data } = await supabase.from('community_members').select('*').eq('community_id', communityId).eq('user_id', userId).maybeSingle()
    setMyMembership(data || null)
  }

  const canPost = () => {
    if (!myMembership || myMembership.status !== 'active') return false
    if (community?.posting_permission === 'everyone') return true
    return LEADER_ROLES.includes(myMembership.role)
  }

  const handlePost = async () => {
    if (!content.trim()) return
    setPosting(true)
    await supabase.from('community_posts').insert({ community_id: communityId, user_id: user.id, content })
    setContent('')
    await fetchPosts()
    setPosting(false)
  }

  const handleDelete = async (postId) => {
    if (!window.confirm('Delete this post?')) return
    await supabase.from('community_posts').delete().eq('id', postId).eq('user_id', user.id)
    setOpenMenuId(null)
    await fetchPosts()
  }

  const handleEdit = async (postId) => {
    await supabase.from('community_posts').update({ content: editContent, edited: true }).eq('id', postId).eq('user_id', user.id)
    const updatedPosts = posts.map(p => p.id === postId ? { ...p, content: editContent, edited: true } : p)
    setPosts(updatedPosts)
    setEditingPostId(null)
    setEditContent('')
  }

  const handleLeave = async () => {
    if (myMembership?.role === 'president') {
      alert('You must transfer leadership before leaving.')
      return
    }
    if (!window.confirm('Leave this community?')) return
    await supabase.from('community_members').delete().eq('community_id', communityId).eq('user_id', user.id)
    router.push('/communities')
  }

  const handleShare = () => {
    const url = `${window.location.origin}/communities/${communityId}`
    if (navigator.share) {
      navigator.share({ title: community?.name, url })
    } else {
      navigator.clipboard.writeText(url)
      alert('Community link copied!')
    }
  }

  const leaders = members.filter(m => LEADER_ROLES.includes(m.role)).sort((a, b) => LEADER_ROLES.indexOf(a.role) - LEADER_ROLES.indexOf(b.role))

  if (loading) return (
    <div className="min-h-screen" style={{ backgroundColor: '#0f0f0f' }}>
      <Navbar />
      <p className="p-4 text-center" style={{ color: '#a0a0b0' }}>Loading...</p>
    </div>
  )

  if (!community) return (
    <div className="min-h-screen" style={{ backgroundColor: '#0f0f0f' }}>
      <Navbar />
      <p className="p-4 text-center" style={{ color: '#a0a0b0' }}>Community not found.</p>
    </div>
  )

  if (!myMembership) return (
    <div className="min-h-screen" style={{ backgroundColor: '#0f0f0f' }}>
      <Navbar />
      <div className="max-w-2xl mx-auto p-4 text-center py-16">
        <p className="text-5xl mb-4">{CATEGORY_EMOJI[community.category] || '🌐'}</p>
        <p className="font-bold text-white text-xl mb-2">{community.name}</p>
        <p className="text-sm mb-6" style={{ color: '#a0a0b0' }}>{community.description || 'Join to see posts and members.'}</p>
        <button onClick={() => router.push('/communities')} className="px-6 py-2 rounded-lg text-sm text-white" style={{ backgroundColor: '#7c3aed' }}>
          Back to Communities
        </button>
      </div>
    </div>
  )

  const accentColor = CATEGORY_COLORS[community.category] || '#7c3aed'

  return (
    <div className="min-h-screen pb-24 md:pb-6" style={{ backgroundColor: '#0f0f0f' }}>
      <Navbar />

      <div className="max-w-5xl mx-auto px-4 pt-4">

        {/* Breadcrumb */}
        <div className="flex items-center gap-1 text-xs mb-4" style={{ color: '#a0a0b0' }}>
          <button onClick={() => router.push('/feed')} className="hover:text-white transition-colors">Home</button>
          <ChevronRight size={12} />
          <button onClick={() => router.push('/communities')} className="hover:text-white transition-colors">Communities</button>
          <ChevronRight size={12} />
          <span className="text-white">{community.name}</span>
        </div>

        {/* Community Header */}
        <div className="rounded-2xl p-5 mb-4 relative"
          style={{ backgroundColor: '#1a1a2e', borderLeft: `4px solid ${accentColor}` }}>
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl flex-shrink-0"
                style={{ backgroundColor: `${accentColor}22` }}>
                {CATEGORY_EMOJI[community.category] || '🌐'}
              </div>
              <div>
                <h1 className="font-bold text-white text-xl mb-1">{community.name}</h1>
                <div className="flex items-center gap-2 flex-wrap mb-2">
                  <span className="text-xs" style={{ color: accentColor }}>
                    {CATEGORY_EMOJI[community.category]} {CATEGORY_LABELS[community.category]}
                  </span>
                  <span className="text-xs" style={{ color: '#a0a0b0' }}>•</span>
                  {community.visibility === 'private' ? (
                    <span className="flex items-center gap-1 text-xs" style={{ color: '#a0a0b0' }}>
                      <Lock size={10} /> Private
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-xs" style={{ color: '#a0a0b0' }}>
                      <Globe size={10} /> Public
                    </span>
                  )}
                </div>
                <button
                  onClick={() => setShowMembersModal(true)}
                  className="flex items-center gap-1 text-sm hover:opacity-75 transition-opacity mb-1"
                  style={{ color: '#ffffff' }}
                >
                  <Users size={14} /> {members.length} Members
                </button>
                <p className="text-xs" style={{ color: '#22c55e' }}>🟢 Online</p>
                {community.description && (
                  <p className="text-sm mt-2" style={{ color: '#a0a0b0' }}>{community.description}</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={handleShare}
                className="p-2 rounded-lg transition-colors"
                style={{ backgroundColor: '#2d2d4e', color: '#a0a0b0' }}
              >
                <Share2 size={16} />
              </button>
              <div className="relative">
                <button
                  onClick={() => setShowThreeDot(!showThreeDot)}
                  className="p-2 rounded-lg transition-colors"
                  style={{ backgroundColor: '#2d2d4e', color: '#a0a0b0' }}
                >
                  <MoreHorizontal size={16} />
                </button>
                {showThreeDot && (
                  <div className="absolute right-0 top-10 rounded-xl border z-20 w-48 overflow-hidden"
                    style={{ backgroundColor: '#1a1a2e', borderColor: '#2d2d4e' }}>
                    {[
                      { label: 'About', action: null },
                      { label: 'Members', action: () => { setShowMembersModal(true); setShowThreeDot(false) } },
                      { label: 'Events', action: null, soon: true },
                      { label: 'Media', action: null, soon: true },
                      { label: 'Files', action: null, soon: true },
                      { label: 'Rules', action: null, soon: true },
                      { label: 'Report Community', action: null, soon: true },
                    ].map((item) => (
                      <button
                        key={item.label}
                        onClick={item.action || undefined}
                        className="w-full flex items-center justify-between text-left px-4 py-2 text-sm hover:bg-white/5"
                        style={{ color: item.action === null && !item.soon ? '#a0a0b0' : '#ffffff' }}
                      >
                        {item.label}
                        {item.soon && <span className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: '#2d2d4e', color: '#a0a0b0' }}>Soon</span>}
                      </button>
                    ))}
                    <div className="border-t" style={{ borderColor: '#2d2d4e' }} />
                    {myMembership.role !== 'president' && (
                      <button
                        onClick={() => { handleLeave(); setShowThreeDot(false) }}
                        className="w-full text-left px-4 py-2 text-sm"
                        style={{ color: '#ef4444' }}
                      >
                        Leave Community
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {myMembership.role !== 'member' && (
            <div className="mt-3 pt-3 border-t" style={{ borderColor: '#2d2d4e' }}>
              <span className="text-xs px-2 py-1 rounded-full capitalize"
                style={{ backgroundColor: `${accentColor}22`, color: accentColor }}>
                {myMembership.role.replace('_', ' ')}
              </span>
            </div>
          )}
        </div>

        {/* Main Layout */}
        <div className="flex gap-4">

          {/* Feed - Left/Main */}
          <div className="flex-1 min-w-0">

            {/* Desktop Composer */}
            {canPost() && (
              <div className="hidden md:block p-4 rounded-xl border mb-4"
                style={{ backgroundColor: '#1a1a2e', borderColor: '#2d2d4e' }}>
                <textarea
                  value={content}
                  onChange={(e) => { if (e.target.value.length <= 1000) setContent(e.target.value) }}
                  onKeyDown={(e) => { if (e.ctrlKey && e.key === 'Enter') handlePost() }}
                  placeholder="Share something with this community... (Ctrl+Enter to post)"
                  className="w-full p-3 rounded-lg mb-2 resize-none focus:outline-none text-sm"
                  style={{ backgroundColor: '#16213e', color: '#ffffff', border: '1px solid #2d2d4e' }}
                  rows={3}
                />
                <div className="flex justify-between items-center">
                  <p className="text-xs" style={{ color: '#a0a0b0' }}>Tip: use - for bullets, **bold**, _italic_</p>
                  <div className="flex items-center gap-2">
                    <p className="text-xs" style={{ color: content.length > 900 ? '#ef4444' : '#a0a0b0' }}>{content.length}/1000</p>
                    <button
                      onClick={handlePost}
                      disabled={posting || !content.trim()}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white"
                      style={{ backgroundColor: posting || !content.trim() ? '#4c1d95' : accentColor }}
                    >
                      <Send size={14} /> Post
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Pinned Posts Placeholder */}
            <div className="p-3 rounded-xl border mb-4"
              style={{ backgroundColor: '#1a1a2e', borderColor: '#2d2d4e' }}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-semibold" style={{ color: '#a0a0b0' }}>📌 Pinned Posts</span>
              </div>
              <p className="text-xs" style={{ color: '#6b6b7d' }}>No pinned posts yet.</p>
            </div>

            {/* Posts */}
            <div className="space-y-2">
              {posts.length === 0 && (
                <div className="text-center py-16">
                  <p className="text-4xl mb-3">💬</p>
                  <p className="font-bold text-white mb-1">No discussions yet</p>
                  <p className="text-sm mb-4" style={{ color: '#a0a0b0' }}>Be the first to start one.</p>
                </div>
              )}
              {posts.map((post) => (
                <div key={post.id} className="rounded-xl overflow-hidden transition-transform hover:-translate-y-0.5"
                  style={{ backgroundColor: '#181826', boxShadow: '0 4px 16px rgba(0,0,0,0.3)', borderLeft: `3px solid ${accentColor}` }}>
                  <div className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                          style={{ backgroundColor: accentColor }}>
                          {post.username?.[0]?.toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-sm text-white">{post.username}</p>
                            {post.role !== 'member' && (
                              <span className="text-xs px-1.5 py-0.5 rounded-full capitalize"
                                style={{ backgroundColor: `${accentColor}22`, color: accentColor }}>
                                {post.role.replace('_', ' ')}
                              </span>
                            )}
                          </div>
                          <p className="text-xs" style={{ color: '#a0a0b0' }}>{timeAgo(post.created_at)}</p>
                        </div>
                      </div>

                      {post.user_id === user.id && (
                        <div className="relative">
                          <button
                            onClick={() => setOpenMenuId(openMenuId === post.id ? null : post.id)}
                            className="p-1 rounded-lg"
                            style={{ color: '#a0a0b0' }}
                          >
                            <MoreHorizontal size={18} />
                          </button>
                          {openMenuId === post.id && (
                            <div className="absolute right-0 top-8 rounded-xl border z-10 w-36 overflow-hidden"
                              style={{ backgroundColor: '#1a1a2e', borderColor: '#2d2d4e' }}>
                              <button
                                onClick={() => { setEditingPostId(post.id); setEditContent(post.content); setOpenMenuId(null) }}
                                className="w-full flex items-center gap-2 text-left px-4 py-2 text-sm text-white hover:bg-white/5"
                              >
                                <Pencil size={14} /> Edit
                              </button>
                              <button
                                onClick={() => handleDelete(post.id)}
                                className="w-full flex items-center gap-2 text-left px-4 py-2 text-sm text-red-400 hover:bg-white/5"
                              >
                                <Trash2 size={14} /> Delete
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {editingPostId === post.id ? (
                      <div className="mb-2">
                        <textarea
                          value={editContent}
                          onChange={(e) => setEditContent(e.target.value)}
                          className="w-full p-3 rounded-lg resize-none focus:outline-none text-sm"
                          style={{ backgroundColor: '#16213e', color: '#ffffff', border: `1px solid ${accentColor}` }}
                          rows={3}
                        />
                        <div className="flex gap-2 mt-2">
                          <button onClick={() => handleEdit(post.id)} className="px-4 py-1 rounded-lg text-sm text-white" style={{ backgroundColor: accentColor }}>Save</button>
                          <button onClick={() => setEditingPostId(null)} className="px-4 py-1 rounded-lg text-sm" style={{ color: '#a0a0b0', border: '1px solid #2d2d4e' }}>Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <div className="mb-2">
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
                        {post.edited && <p className="text-xs mt-1 text-right italic" style={{ color: '#6b6b7d' }}>edited</p>}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Sidebar - Right (Desktop Only) */}
          <div className="hidden md:block w-64 flex-shrink-0 space-y-3">

            {/* About */}
            <div className="p-4 rounded-xl border" style={{ backgroundColor: '#1a1a2e', borderColor: '#2d2d4e' }}>
              <p className="font-semibold text-white text-sm mb-3">About</p>
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span style={{ color: '#a0a0b0' }}>Category</span>
                  <span style={{ color: '#ffffff' }}>{CATEGORY_LABELS[community.category]}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span style={{ color: '#a0a0b0' }}>Visibility</span>
                  <span style={{ color: '#ffffff' }} className="capitalize">{community.visibility}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span style={{ color: '#a0a0b0' }}>Posting</span>
                  <span style={{ color: '#ffffff' }}>{community.posting_permission === 'everyone' ? 'Everyone' : 'Leaders only'}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span style={{ color: '#a0a0b0' }}>Created</span>
                  <span style={{ color: '#ffffff' }}>{new Date(community.created_at).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}</span>
                </div>
              </div>
            </div>

            {/* Statistics */}
            <div className="p-4 rounded-xl border" style={{ backgroundColor: '#1a1a2e', borderColor: '#2d2d4e' }}>
              <p className="font-semibold text-white text-sm mb-3">Statistics</p>
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span style={{ color: '#a0a0b0' }}>Members</span>
                  <span style={{ color: '#ffffff' }}>{members.length}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span style={{ color: '#a0a0b0' }}>Posts</span>
                  <span style={{ color: '#ffffff' }}>{posts.length}</span>
                </div>
              </div>
            </div>

            {/* Leadership */}
            {leaders.length > 0 && (
              <div className="p-4 rounded-xl border" style={{ backgroundColor: '#1a1a2e', borderColor: '#2d2d4e' }}>
                <p className="font-semibold text-white text-sm mb-3">Leadership</p>
                <div className="space-y-2">
                  {leaders.map((leader) => (
                    <div key={leader.id} className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                        style={{ backgroundColor: accentColor }}>
                        {leader.username?.[0]?.toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-white truncate">{leader.username}</p>
                        <p className="text-xs capitalize" style={{ color: accentColor }}>{leader.role.replace('_', ' ')}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Rules */}
            <div className="p-4 rounded-xl border" style={{ backgroundColor: '#1a1a2e', borderColor: '#2d2d4e' }}>
              <p className="font-semibold text-white text-sm mb-3">Community Rules</p>
              <div className="space-y-1">
                {PLACEHOLDER_RULES.map((rule, i) => (
                  <p key={i} className="text-xs" style={{ color: '#a0a0b0' }}>
                    {i + 1}. {rule}
                  </p>
                ))}
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Mobile Fixed Bottom Composer */}
      {canPost() && (
        <div className="md:hidden fixed bottom-0 left-0 right-0 p-3 border-t"
          style={{ backgroundColor: '#0f0f0f', borderColor: '#2d2d4e' }}>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={content}
              onChange={(e) => { if (e.target.value.length <= 1000) setContent(e.target.value) }}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handlePost() } }}
              placeholder="Write something..."
              className="flex-1 p-3 rounded-xl text-sm focus:outline-none"
              style={{ backgroundColor: '#1a1a2e', color: '#ffffff', border: '1px solid #2d2d4e' }}
            />
            <button
              onClick={handlePost}
              disabled={posting || !content.trim()}
              className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: posting || !content.trim() ? '#4c1d95' : accentColor }}
            >
              <Send size={16} color="white" />
            </button>
          </div>
        </div>
      )}

      {/* Members Modal */}
      {showMembersModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50"
          style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}
          onClick={() => setShowMembersModal(false)}>
          <div className="rounded-xl border w-80 mx-4 max-h-96 overflow-hidden flex flex-col"
            style={{ backgroundColor: '#1a1a2e', borderColor: '#2d2d4e' }}
            onClick={(e) => e.stopPropagation()}>
            <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: '#2d2d4e' }}>
              <p className="font-bold text-white">Members ({members.length})</p>
              <button onClick={() => setShowMembersModal(false)} style={{ color: '#a0a0b0' }}>✕</button>
            </div>
            <div className="overflow-y-auto p-4 space-y-2">
              {members
                .sort((a, b) => {
                  const order = ['president', 'vice_president', 'secretary', 'treasurer', 'moderator', 'member']
                  return order.indexOf(a.role) - order.indexOf(b.role)
                })
                .map((member) => (
                  <div key={member.id} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                      style={{ backgroundColor: accentColor }}>
                      {member.username?.[0]?.toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-white">{member.username}</p>
                    </div>
                    {member.role !== 'member' && (
                      <span className="text-xs px-2 py-0.5 rounded-full capitalize"
                        style={{ backgroundColor: `${accentColor}22`, color: accentColor }}>
                        {member.role.replace('_', ' ')}
                      </span>
                    )}
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

    </div>
  )
}