import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
const validSupabaseUrl = /^https?:\/\/[^\s]+$/.test(supabaseUrl)
const hasSupabaseConfig = validSupabaseUrl && Boolean(supabaseAnonKey) && !supabaseUrl.includes('your_supabase_project_url')

export const isSupabaseConfigured = hasSupabaseConfig
export const supabase = createClient(
	hasSupabaseConfig ? supabaseUrl : 'https://placeholder.supabase.co',
	hasSupabaseConfig ? supabaseAnonKey : 'placeholder-anon-key',
)
