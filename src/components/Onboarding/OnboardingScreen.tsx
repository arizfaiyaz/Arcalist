import { useEffect, useState } from 'react'
import { Check, Loader2 } from 'lucide-react'
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

  useEffect(() => {
    if (user && step === 'signingIn') {
      onComplete()
    }
  }, [onComplete, step, user])

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
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
      <div className="mb-8">
        <h1 className="text-5xl font-bold tracking-tight">
          <span className="text-accent">Arca</span>
          <span className="text-white">list</span>
        </h1>
        <p className="mt-3 text-base leading-relaxed text-[var(--arc-text-secondary)]">
          Your visual bookmark workspace, synced securely across your browser.
        </p>
      </div>

      <div className="arc-glass-soft flex w-full flex-col gap-4 rounded-xl p-5">
        <div>
          <p className="text-white font-semibold text-base">
            Sign in to Arcalist
          </p>
          <p className="mt-1 text-sm text-[var(--arc-text-secondary)]">
            Continue with your account to open your private workspace.
          </p>
        </div>

        <button
          onClick={onSignIn}
          disabled={loading}
          className={cn(
            'w-full flex items-center justify-center gap-2.5',
            'arc-btn arc-btn-primary h-11',
            loading && 'opacity-70 cursor-not-allowed'
          )}
        >
          {loading ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <>
              <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google
            </>
          )}
        </button>
      </div>

      <div className="w-full mt-6 flex flex-col gap-3 text-left">
        {[
          'We do not sell your data.',
          'We do not share your bookmarks with advertisers.',
          'Your workspace stays private to your account.',
          'You control your data and can sign out anytime.',
        ].map((point) => (
          <div
            key={point}
            className="flex items-start gap-3 text-sm text-[var(--arc-text-secondary)]"
          >
            <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--arc-button-active-bg)] text-[var(--arc-accent)]">
              <Check size={13} />
            </div>
            <p>{point}</p>
          </div>
        ))}
      </div>

      <p className="mt-8 text-xs text-[var(--arc-text-secondary)] opacity-70">
        Privacy-first bookmark management. Built for focused browsing.
      </p>
    </div>
  )
}

// ─── Signing In Step ──────────────────────────────────────
function SigningInStep() {
  return (
    <div className="flex flex-col items-center text-center gap-6">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--arc-button-active-bg)]">
        <Loader2 size={28} className="animate-spin text-[var(--arc-accent)]" />
      </div>
      <div>
        <h2 className="text-white font-semibold text-lg">Signing you in...</h2>
        <p className="mt-1 text-sm text-[var(--arc-text-secondary)]">
          Loading your bookmarks from the cloud
        </p>
      </div>

      {/* Animated progress dots */}
      <div className="flex items-center gap-2">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="h-2 w-2 animate-pulse rounded-full bg-[var(--arc-accent)]"
            style={{ animationDelay: `${i * 200}ms` }}
          />
        ))}
      </div>
    </div>
  )
}
