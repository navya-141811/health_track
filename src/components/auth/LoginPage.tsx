/**
 * LoginPage — light-theme single caregiver login.
 */
import { useState } from 'react'
import type { CaregiverAccount } from '../../types'

export const CAREGIVER_ACCOUNT: CaregiverAccount = {
  id: 'cg-001',
  username: 'caregiver',
  password: 'care123',
  displayName: 'Dr. Anand Krishnan',
  role: 'Senior Caregiver',
}

interface Props {
  onLogin: (account: CaregiverAccount) => void
}

export function LoginPage({ onLogin }: Props) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [showDemoCreds, setShowDemoCreds] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    setTimeout(() => {
      if (username.trim() === CAREGIVER_ACCOUNT.username && password === CAREGIVER_ACCOUNT.password) {
        onLogin(CAREGIVER_ACCOUNT)
      } else {
        setError('Invalid username or password. Please try again.')
        setLoading(false)
      }
    }, 600)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-blue-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo with animated pulse rings */}
        <div className="text-center mb-8">
          <div className="relative inline-flex items-center justify-center mb-4">
            <span className="absolute inline-flex h-16 w-16 rounded-2xl bg-sky-400 opacity-20 animate-ping" />
            <span className="absolute inline-flex h-16 w-16 rounded-2xl bg-sky-400 opacity-10 animate-ping [animation-delay:0.4s]" />
            <div className="relative inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-sky-500 shadow-lg shadow-sky-200">
              <svg className="w-9 h-9 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">CarePulse</h1>
          <p className="text-gray-500 mt-1 text-sm">Caregiver Monitoring System</p>
        </div>

        {/* Card */}
        <div className="bg-white border border-gray-200 rounded-2xl shadow-lg shadow-gray-100 px-8 py-8">
          <h2 className="text-lg font-semibold text-gray-800 mb-6">Sign in</h2>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-600 mb-1">
                Username
              </label>
              <input
                id="username" type="text" autoComplete="username" required
                value={username} onChange={(e) => setUsername(e.target.value)} disabled={loading}
                className="w-full rounded-lg border border-gray-300 bg-gray-50 text-gray-900 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent transition placeholder-gray-400 disabled:opacity-50"
                placeholder="Enter username"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-600 mb-1">
                Password
              </label>
              <div className="relative">
                <input
                  id="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" required
                  value={password} onChange={(e) => setPassword(e.target.value)} disabled={loading}
                  className="w-full rounded-lg border border-gray-300 bg-gray-50 text-gray-900 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent transition placeholder-gray-400 pr-10 disabled:opacity-50"
                  placeholder="Enter password"
                />
                <button type="button" onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  aria-label={showPassword ? 'Hide password' : 'Show password'} tabIndex={-1}>
                  {showPassword ? (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 flex items-center gap-2">
                <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                {error}
              </div>
            )}

            <button type="submit" disabled={loading}
              className="w-full rounded-lg bg-sky-500 text-white py-2.5 text-sm font-semibold hover:bg-sky-600 focus:outline-none focus:ring-2 focus:ring-sky-400 transition-colors shadow-sm disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2">
              {loading ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Signing in…
                </>
              ) : 'Sign In'}
            </button>
          </form>

          {/* Collapsible demo credentials */}
          <div className="mt-6 rounded-lg border border-gray-200 overflow-hidden">
            <button type="button" onClick={() => setShowDemoCreds((v) => !v)}
              className="w-full flex items-center justify-between px-4 py-3 text-xs font-semibold text-gray-500 hover:text-gray-700 hover:bg-gray-50 transition-colors"
              aria-expanded={showDemoCreds}>
              <span>🔑 Need demo credentials?</span>
              <svg className={`w-3.5 h-3.5 transition-transform ${showDemoCreds ? 'rotate-180' : ''}`}
                fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {showDemoCreds && (
              <div className="px-4 pb-3 bg-gray-50 text-xs text-gray-500 space-y-1 border-t border-gray-200">
                <p className="pt-2">👤 Username: <span className="font-mono text-gray-700">caregiver</span></p>
                <p>🔒 Password: <span className="font-mono text-gray-700">care123</span></p>
                <button type="button"
                  onClick={() => { setUsername('caregiver'); setPassword('care123'); setShowDemoCreds(false) }}
                  className="mt-2 w-full rounded-md bg-gray-200 hover:bg-gray-300 text-gray-700 py-1.5 text-xs font-medium transition-colors">
                  Fill in automatically
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
