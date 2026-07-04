import { useEffect, useState } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { ensureProfile, getCurrentSession, getFriendlyAuthError, updateStudentProfile, type Profile, type ProfileUpdate } from '../lib/auth'
import { supabase } from '../lib/supabase'

type AuthState = {
  session: Session | null
  user: User | null
  profile: Profile | null
  loading: boolean
  error: string | null
}

export const useAuth = () => {
  const [state, setState] = useState<AuthState>({
    session: null,
    user: null,
    profile: null,
    loading: true,
    error: null,
  })

  useEffect(() => {
    let mounted = true

    const loadSession = async () => {
      try {
        const { session, profile } = await getCurrentSession()
        if (mounted) setState({ session, user: session?.user ?? null, profile, loading: false, error: null })
      } catch (error) {
        if (mounted) setState((current) => ({ ...current, loading: false, error: getFriendlyAuthError(error) }))
      }
    }

    void loadSession()

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return
      setState((current) => ({ ...current, session, user: session?.user ?? null, loading: false, error: null }))

      if (session?.user) {
        window.setTimeout(() => {
          void ensureProfile(session.user)
            .then((profile) => {
              if (mounted) setState((current) => ({ ...current, profile, error: null }))
            })
            .catch((error: unknown) => {
              if (mounted) setState((current) => ({ ...current, error: getFriendlyAuthError(error) }))
            })
        }, 0)
      } else if (mounted) {
        setState((current) => ({ ...current, profile: null }))
      }
    })

    return () => {
      mounted = false
      subscription.subscription.unsubscribe()
    }
  }, [])

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }

  const updateProfile = async (updates: ProfileUpdate) => {
    if (!state.user) throw new Error('No authenticated user is available.')
    const profile = await updateStudentProfile(state.user.id, updates)
    setState((current) => ({ ...current, profile }))
    return profile
  }

  return { ...state, signOut, updateProfile }
}
