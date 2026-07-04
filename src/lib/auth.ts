import type { Session, User } from '@supabase/supabase-js'
import { isSupabaseConfigured, supabase } from './supabase'

export type Profile = {
  id: string
  full_name: string | null
  email: string | null
  phone: string | null
  headline: string | null
  college: string | null
  degree: string | null
  branch: string | null
  graduation_year: number | null
  cgpa: number | null
  location: string | null
  bio: string | null
  skills: string[] | null
  interests: string[] | null
  preferred_domains: string[] | null
  preferred_locations: string[] | null
  preferred_work_modes: string[] | null
  created_at: string
  updated_at: string
}

type ProfileInput = {
  fullName?: string | null
  email?: string | null
}

export const getFriendlyAuthError = (error: unknown): string => {
  const message = error instanceof Error ? error.message.toLowerCase() : ''

  if (message.includes('supabase is not configured')) return 'Add your Supabase project URL and publishable key to .env before signing in.'
  if (message.includes('invalid login credentials')) return 'The email or password is incorrect.'
  if (message.includes('user already registered')) return 'An account with this email already exists. Try signing in instead.'
  if (message.includes('password should be at least')) return 'Your password must be at least 8 characters.'
  if (message.includes('email not confirmed')) return 'Please verify your email address before signing in.'
  if (message.includes('rate limit')) return 'Too many attempts. Please wait a moment and try again.'
  if (message.includes('fetch') || message.includes('network')) return 'We could not reach Supabase. Check your connection and try again.'
  return 'We could not complete that request. Please try again.'
}

const requireSupabaseConfig = () => {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase is not configured. Add your project URL and publishable key to .env.')
  }
}

const profileFromUser = (user: User, input: ProfileInput = {}) => ({
  id: user.id,
  full_name: input.fullName ?? user.user_metadata.full_name ?? null,
  email: input.email ?? user.email ?? null,
})

export const ensureProfile = async (user: User, input: ProfileInput = {}): Promise<Profile> => {
  requireSupabaseConfig()
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle()

  if (profileError) throw profileError
  if (profile) return profile as Profile

  const { data: createdProfile, error: createError } = await supabase
    .from('profiles')
    .insert(profileFromUser(user, input))
    .select('*')
    .single()

  if (createError) throw createError
  return createdProfile as Profile
}

export const getCurrentSession = async (): Promise<{ session: Session | null; profile: Profile | null }> => {
  if (!isSupabaseConfigured) return { session: null, profile: null }

  const { data, error } = await supabase.auth.getSession()
  if (error) throw error
  if (!data.session?.user) return { session: null, profile: null }

  return {
    session: data.session,
    profile: await ensureProfile(data.session.user),
  }
}

export const signUpStudent = async (fullName: string, email: string, password: string) => {
  requireSupabaseConfig()
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName } },
  })

  if (error) throw error

  if (data.session && data.user) {
    const profile = await ensureProfile(data.user, { fullName, email })
    return { session: data.session, profile, needsEmailConfirmation: false }
  }

  return { session: null, profile: null, needsEmailConfirmation: true }
}

export const signInStudent = async (email: string, password: string) => {
  requireSupabaseConfig()
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
  if (!data.session?.user) throw new Error('No active session was returned.')

  const profile = await ensureProfile(data.session.user)
  return { session: data.session, profile }
}

export type ProfileUpdate = Omit<Profile, 'id' | 'email' | 'created_at' | 'updated_at'>

export const updateStudentProfile = async (userId: string, updates: ProfileUpdate): Promise<Profile> => {
  requireSupabaseConfig()
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select('*')
    .single()

  if (error) throw error
  return data as Profile
}
