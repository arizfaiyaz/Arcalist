import { useState } from 'react'
import { Cloud, BookMarked, Layers, ShieldCheck, Loader2 } from 'lucide-react'
import { cn } from '../../lib/utils'
import { useArcalistStore } from '../../store/useArcalistStore'

type Props = {
  onComplete: () => void
}

export function OnboardingScreen({ onComplete }: Props) {
  const signInWithGoogle = useArcalistStore((state) => state.signInWithGoogle)
  const user = useArcalistStore((state) => state.user)
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState<'welcome' | 'signingIn'>('welcome')

  const handleSignIn = async () => {
    setLoading(true)
    setStep('signingIn')
    try {
      await signInWithGoogle()
      // Auth state change in store will handle loading cloud data
      // Wait briefly for auth to settle then complete onboarding
      await new Promise((r) => setTimeout(r, 2000))
      onComplete()
    } catch {
      setLoading(false)
      setStep('welcome')
    }
  }

  // If user signed in during this flow, complete automatically
  if (user && step === 'signingIn') {
    Promise.resolve().then(onComplete)
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-accent/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-accent/3 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {step === 'welcome' && (
          <WelcomeStep
            onSignIn={handleSignIn}
            loading={loading}
          />
        )}
        {step === 'signingIn' && (
          <SigningInStep />
        )}
      </div>
    </div>
  )
}

// ─── Welcome Step ─────────────────────────────────────────
function WelcomeStep({
  onSignIn,
  loading,
}: {
  onSignIn: () => void
  loading: boolean
}) {
  return (
    <div className="flex flex-col items-center text-center">
      {/* Logo */}
      <div className="mb-8">
        <h1 className="text-5xl font-bold tracking-tight">
          <span className="text-accent">Arca</span>
          <span className="text-white">list</span>
        </h1>
        <p className="text-slate-400 mt-2 text-base">
          Your visual bookmark workspace
        </p>
      </div>

      {/* Feature highlights */}
      <div className="w-full grid grid-cols-2 gap-3 mb-8">
        {[
          {
            icon: Layers,
            title: 'Pages & Boards',
            desc: 'Organize bookmarks into visual boards',
          },
          {
            icon: Cloud,
            title: 'Cloud Sync',
            desc: 'Access your bookmarks on any device',
          },
          {
            icon: BookMarked,
            title: 'Auto Import',
            desc: 'Chrome bookmarks sync automatically',
          },
          {
            icon: ShieldCheck,
            title: 'Privacy Mode',
            desc: 'Blur everything during screen share',
          },
        ].map(({ icon: Icon, title, desc }) => (
          <div
            key={title}
            className="bg-surface border border-white/5 rounded-xl p-4 text-left"
          >
            <div className="w-8 h-8 rounded-lg bg-accent/15 flex items-center justify-center mb-2">
              <Icon size={15} className="text-accent" />
            </div>
            <p className="text-white text-sm font-medium">{title}</p>
            <p className="text-slate-500 text-xs mt-0.5 leading-relaxed">{desc}</p>
          </div>
        ))}
      </div>

      {/* Sign in CTA */}
      <div className="w-full bg-surface border border-white/10 rounded-2xl p-5 flex flex-col gap-3">
        <div>
          <p className="text-white font-semibold text-base">
            Sign in to get started
          </p>
          <p className="text-slate-400 text-sm mt-1">
            Sign in with Google to sync your bookmarks across all your devices.
            Your existing bookmarks will load automatically.
          </p>
        </div>

        <button
          onClick={onSignIn}
          disabled={loading}
          className={cn(
            'w-full flex items-center justify-center gap-2.5',
            'py-3 rounded-xl text-sm font-semibold',
            'bg-accent text-background hover:bg-accent-hover',
            'transition-all duration-150',
            loading && 'opacity-70 cursor-not-allowed'
          )}
        >
          {loading ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <>
              {/* Google icon */}
              <svg width="16" height="16" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google
            </>
          )}
        </button>

        <p className="text-slate-600 text-[11px] text-center leading-relaxed">
          We never sell your data.
        </p>
      </div>
    </div>
  )
}

// ─── Signing In Step ──────────────────────────────────────
function SigningInStep() {
  return (
    <div className="flex flex-col items-center text-center gap-6">
      <div className="w-16 h-16 rounded-full bg-accent/15 flex items-center justify-center">
        <Loader2 size={28} className="text-accent animate-spin" />
      </div>
      <div>
        <h2 className="text-white font-semibold text-lg">Signing you in...</h2>
        <p className="text-slate-400 text-sm mt-1">
          Loading your bookmarks from the cloud
        </p>
      </div>

      {/* Animated progress dots */}
      <div className="flex items-center gap-2">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="w-2 h-2 rounded-full bg-accent animate-pulse"
            style={{ animationDelay: `${i * 200}ms` }}
          />
        ))}
      </div>
    </div>
  )
}