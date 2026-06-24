import Link from 'next/link'

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#0f0f0f' }}>

      {/* Navbar */}
      <nav className="px-6 py-4 flex justify-between items-center border-b"
        style={{ borderColor: '#2d2d4e' }}>
        <span className="text-xl font-bold" style={{ color: '#7c3aed' }}>
          LSU InterHub
        </span>
        <div className="flex gap-3">
          <Link href="/login"
            className="text-sm px-4 py-2 rounded-lg border"
            style={{ borderColor: '#7c3aed', color: '#7c3aed' }}>
            Log In
          </Link>
          <Link href="/signup"
            className="text-sm px-4 py-2 rounded-lg text-white"
            style={{ backgroundColor: '#7c3aed' }}>
            Sign Up
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <div className="flex-1 flex flex-col items-center justify-center text-center px-6 py-20">
        <h1 className="text-4xl font-bold mb-4 text-white">
          Welcome to LSU InterHub
        </h1>
        <p className="text-lg mb-8 max-w-md" style={{ color: '#a0a0b0' }}>
          The digital home for Lupane State University students. Connect, share, and stay informed.
        </p>
        <div className="flex gap-4">
          <Link href="/signup"
            className="px-6 py-3 rounded-lg text-white font-medium"
            style={{ backgroundColor: '#7c3aed' }}>
            Get Started
          </Link>
          <Link href="/login"
            className="px-6 py-3 rounded-lg font-medium border"
            style={{ borderColor: '#2d2d4e', color: '#a0a0b0' }}>
            Log In
          </Link>
        </div>
      </div>

      {/* Features */}
      <div className="max-w-4xl mx-auto px-6 pb-20 grid grid-cols-1 gap-6 md:grid-cols-3">
        <div className="p-6 rounded-xl border"
          style={{ backgroundColor: '#1a1a2e', borderColor: '#2d2d4e' }}>
          <p className="text-2xl mb-2">📢</p>
          <h3 className="font-bold text-white mb-1">Campus Feed</h3>
          <p className="text-sm" style={{ color: '#a0a0b0' }}>
            Share updates, announcements and thoughts with the entire LSU community.
          </p>
        </div>
        <div className="p-6 rounded-xl border"
          style={{ backgroundColor: '#1a1a2e', borderColor: '#2d2d4e' }}>
          <p className="text-2xl mb-2">👤</p>
          <h3 className="font-bold text-white mb-1">Student Profiles</h3>
          <p className="text-sm" style={{ color: '#a0a0b0' }}>
            Create your profile and represent yourself in the LSU digital community.
          </p>
        </div>
        <div className="p-6 rounded-xl border"
          style={{ backgroundColor: '#1a1a2e', borderColor: '#2d2d4e' }}>
          <p className="text-2xl mb-2">🏫</p>
          <h3 className="font-bold text-white mb-1">University Connected</h3>
          <p className="text-sm" style={{ color: '#a0a0b0' }}>
            Built exclusively for Lupane State University students.
          </p>
        </div>
      </div>

    </div>
  )
}