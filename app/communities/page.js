'use client'

import { useState, useEffect } from 'react'
import { createClient } from '../lib/supabase'
import { useRouter } from 'next/navigation'
import Navbar from '../components/Navbar'
import { Users, Lock, Globe, Plus } from 'lucide-react'

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

export default function CommunitiesPage() {
  const [user, setUser] = useState(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [communities, setCommunities] = useState([])
  const [myMemberships, setMyMemberships] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('discover')
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({
    name: '',
    description: '',
    category: 'club',
    visibility: 'public',
    posting_permission: 'everyone',
  })
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
        .select('username, role')
        .eq('id', user.id)
        .single()

      if (profile?.role === 'admin') setIsAdmin(true)

      await fetchCommunities()
      await fetchMyMemberships(user.id)
      setLoading(false)
    }
    initialize()
  }, [])

  const fetchCommunities = async () => {
    const { data, error } = await supabase
      .from('communities')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error(error)
      return
    }
    setCommunities(data)
  }

  const fetchMyMemberships = async (userId) => {
    const { data, error } = await supabase
      .from('community_members')
      .select('community_id, role, status')
      .eq('user_id', userId)

    if (error) {
      console.error(error)
      return
    }
    setMyMemberships(data)
  }

  const isMember = (communityId) => {
    return myMemberships.some(m => m.community_id === communityId && m.status === 'active')
  }

  const myRole = (communityId) => {
    return myMemberships.find(m => m.community_id === communityId)?.role || null
  }

  const handleJoin = async (community) => {
    const status = community.visibility === 'private' ? 'pending' : 'active'

    const { error } = await supabase
      .from('community_members')
      .insert({
        community_id: community.id,
        user_id: user.id,
        role: 'member',
        status,
      })

    if (error) {
      console.error(error)
      return
    }

    await fetchMyMemberships(user.id)
  }

  const handleLeave = async (communityId) => {
    const role = myRole(communityId)
    if (role === 'president') {
      alert('You must transfer leadership before leaving this community.')
      return
    }

    if (!window.confirm('Leave this community?')) return

    await supabase
      .from('community_members')
      .delete()
      .eq('community_id', communityId)
      .eq('user_id', user.id)

    await fetchMyMemberships(user.id)
  }

  const handleCreate = async () => {
    if (!form.name.trim()) return
    setCreating(true)

    const { data: community, error } = await supabase
      .from('communities')
      .insert({
        name: form.name,
        description: form.description,
        category: form.category,
        visibility: form.visibility,
        posting_permission: form.posting_permission,
        created_by: user.id,
      })
      .select()
      .single()

    if (error) {
      console.error(error)
      setCreating(false)
      return
    }

    // Auto assign creator as President
    await supabase
      .from('community_members')
      .insert({
        community_id: community.id,
        user_id: user.id,
        role: 'president',
        status: 'active',
      })

    setForm({ name: '', description: '', category: 'club', visibility: 'public', posting_permission: 'everyone' })
    setShowCreateForm(false)
    setCreating(false)
    await fetchCommunities()
    await fetchMyMemberships(user.id)
  }

  const myCommunities = communities.filter(c => isMember(c.id))
  const discoverCommunities = communities.filter(c => !isMember(c.id))

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

        {/* Header */}
        <div className="flex items-center justify-between mb-6 mt-2">
          <h1 className="text-xl font-bold text-white">Communities</h1>
          {isAdmin && (
            <button
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white"
              style={{ backgroundColor: '#7c3aed' }}
            >
              <Plus size={16} />
              New
            </button>
          )}
        </div>

        {/* Create Community Form - Admin Only */}
        {showCreateForm && isAdmin && (
          <div className="p-4 rounded-xl border mb-6"
            style={{ backgroundColor: '#1a1a2e', borderColor: '#7c3aed' }}>
            <p className="font-semibold text-white mb-4">Create Community</p>

            <input
              type="text"
              placeholder="Community name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full p-3 rounded-lg mb-3 focus:outline-none text-sm"
              style={{ backgroundColor: '#16213e', color: '#ffffff', border: '1px solid #2d2d4e' }}
            />

            <textarea
              placeholder="Description (optional)"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full p-3 rounded-lg mb-3 resize-none focus:outline-none text-sm"
              style={{ backgroundColor: '#16213e', color: '#ffffff', border: '1px solid #2d2d4e' }}
              rows={2}
            />

            <div className="mb-3">
              <p className="text-xs mb-2" style={{ color: '#a0a0b0' }}>Category</p>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="w-full p-3 rounded-lg focus:outline-none text-sm"
                style={{ backgroundColor: '#16213e', color: '#ffffff', border: '1px solid #2d2d4e' }}
              >
                {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>

            <div className="mb-3">
              <p className="text-xs mb-2" style={{ color: '#a0a0b0' }}>Visibility</p>
              <div className="flex gap-2">
                {['public', 'private'].map((v) => (
                  <button
                    key={v}
                    onClick={() => setForm({ ...form, visibility: v })}
                    className="flex-1 py-2 rounded-lg text-sm capitalize"
                    style={{
                      backgroundColor: form.visibility === v ? '#7c3aed' : '#16213e',
                      color: '#ffffff',
                      border: `1px solid ${form.visibility === v ? '#7c3aed' : '#2d2d4e'}`
                    }}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-4">
              <p className="text-xs mb-2" style={{ color: '#a0a0b0' }}>Who can post?</p>
              <div className="flex gap-2">
                {[['everyone', 'Everyone'], ['leaders_only', 'Leaders Only']].map(([value, label]) => (
                  <button
                    key={value}
                    onClick={() => setForm({ ...form, posting_permission: value })}
                    className="flex-1 py-2 rounded-lg text-sm"
                    style={{
                      backgroundColor: form.posting_permission === value ? '#7c3aed' : '#16213e',
                      color: '#ffffff',
                      border: `1px solid ${form.posting_permission === value ? '#7c3aed' : '#2d2d4e'}`
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleCreate}
                disabled={creating || !form.name.trim()}
                className="flex-1 py-2 rounded-lg text-sm font-medium text-white"
                style={{ backgroundColor: creating ? '#4c1d95' : '#7c3aed' }}
              >
                {creating ? 'Creating...' : 'Create Community'}
              </button>
              <button
                onClick={() => setShowCreateForm(false)}
                className="px-4 py-2 rounded-lg text-sm"
                style={{ color: '#a0a0b0', border: '1px solid #2d2d4e' }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex border-b mb-4" style={{ borderColor: '#2d2d4e' }}>
          {[['discover', 'Discover'], ['my', 'My Communities']].map(([value, label]) => (
            <button
              key={value}
              onClick={() => setActiveTab(value)}
              className="flex-1 py-3 text-sm font-semibold"
              style={{
                color: activeTab === value ? '#7c3aed' : '#a0a0b0',
                borderBottom: activeTab === value ? '2px solid #7c3aed' : '2px solid transparent',
              }}
            >
              {label}
              {value === 'my' && myCommunities.length > 0 && (
                <span className="ml-1 text-xs px-1.5 py-0.5 rounded-full"
                  style={{ backgroundColor: '#7c3aed', color: '#ffffff' }}>
                  {myCommunities.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Discover Tab */}
        {activeTab === 'discover' && (
          <div className="space-y-3">
            {discoverCommunities.length === 0 && (
              <p className="text-center py-8" style={{ color: '#a0a0b0' }}>
                No communities to discover yet.
              </p>
            )}
            {discoverCommunities.map((community) => (
              <div key={community.id} className="p-4 rounded-xl border"
                style={{ backgroundColor: '#1a1a2e', borderColor: '#2d2d4e', borderLeft: `3px solid ${CATEGORY_COLORS[community.category] || '#7c3aed'}` }}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-semibold text-white text-sm">{community.name}</p>
                      {community.visibility === 'private' ? (
                        <Lock size={12} style={{ color: '#a0a0b0' }} />
                      ) : (
                        <Globe size={12} style={{ color: '#a0a0b0' }} />
                      )}
                    </div>
                    <p className="text-xs mb-2" style={{ color: '#a0a0b0' }}>
                      {community.description || 'No description'}
                    </p>
                    <span className="text-xs px-2 py-0.5 rounded-full"
                      style={{ backgroundColor: `${CATEGORY_COLORS[community.category]}22`, color: CATEGORY_COLORS[community.category] }}>
                      {CATEGORY_LABELS[community.category]}
                    </span>
                  </div>
                  <button
                    onClick={() => handleJoin(community)}
                    className="ml-3 px-3 py-1.5 rounded-lg text-xs font-medium text-white flex-shrink-0"
                    style={{ backgroundColor: '#7c3aed' }}
                  >
                    {community.visibility === 'private' ? 'Request' : 'Join'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* My Communities Tab */}
        {activeTab === 'my' && (
          <div className="space-y-3">
            {myCommunities.length === 0 && (
              <p className="text-center py-8" style={{ color: '#a0a0b0' }}>
                You have not joined any communities yet.
              </p>
            )}
            {myCommunities.map((community) => (
              <div key={community.id} className="p-4 rounded-xl border"
                style={{ backgroundColor: '#1a1a2e', borderColor: '#2d2d4e', borderLeft: `3px solid ${CATEGORY_COLORS[community.category] || '#7c3aed'}` }}>
                <div className="flex items-start justify-between">
                  <div
                    className="flex-1 cursor-pointer"
                    onClick={() => router.push(`/communities/${community.id}`)}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-semibold text-white text-sm">{community.name}</p>
                      {community.visibility === 'private' ? (
                        <Lock size={12} style={{ color: '#a0a0b0' }} />
                      ) : (
                        <Globe size={12} style={{ color: '#a0a0b0' }} />
                      )}
                    </div>
                    <p className="text-xs mb-2" style={{ color: '#a0a0b0' }}>
                      {community.description || 'No description'}
                    </p>
                    <div className="flex items-center gap-2">
                      <span className="text-xs px-2 py-0.5 rounded-full"
                        style={{ backgroundColor: `${CATEGORY_COLORS[community.category]}22`, color: CATEGORY_COLORS[community.category] }}>
                        {CATEGORY_LABELS[community.category]}
                      </span>
                      {myRole(community.id) !== 'member' && (
                        <span className="text-xs px-2 py-0.5 rounded-full capitalize"
                          style={{ backgroundColor: '#7c3aed22', color: '#7c3aed' }}>
                          {myRole(community.id)?.replace('_', ' ')}
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => handleLeave(community.id)}
                    className="ml-3 px-3 py-1.5 rounded-lg text-xs flex-shrink-0"
                    style={{ color: '#ef4444', border: '1px solid #ef4444' }}
                  >
                    Leave
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  )
}