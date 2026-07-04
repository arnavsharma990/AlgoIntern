import { supabase } from './supabase'

export type InternshipMatch = {
  match_score: number
  match_label: string
  matching_skills: string[]
  missing_skills: string[]
  reasons: string[]
}

export const getInternshipMatch = async (internshipId: string): Promise<InternshipMatch> => {
  const { data, error } = await supabase.functions.invoke<InternshipMatch | { error?: string }>('match-internship', {
    body: { internship_id: internshipId },
  })
  if (error) throw error
  if (!data) throw new Error('AI matching returned no result.')
  if (!('match_score' in data)) throw new Error(data.error || 'AI matching returned no result.')
  return data
}
