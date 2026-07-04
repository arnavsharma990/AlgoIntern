import { supabase } from './supabase'

export type DiscoverInternship = {
  id: string
  title: string
  description: string | null
  location: string | null
  work_mode: string | null
  employment_type: string | null
  domain: string | null
  skills: string[]
  stipend_min: number | null
  stipend_max: number | null
  stipend_currency: string | null
  duration: string | null
  application_url: string
  source_listing_id: string | null
  posted_at: string | null
  deadline: string | null
  company: {
    name: string
    logo_url: string | null
  } | null
}

type InternshipRow = Omit<DiscoverInternship, 'company'> & {
  companies: DiscoverInternship['company'] | DiscoverInternship['company'][] | null
}

export const listActiveInternships = async (): Promise<DiscoverInternship[]> => {
  const { data, error } = await supabase
    .from('internships')
    .select(`
      id, title, description, location, work_mode, employment_type, domain,
      skills, stipend_min, stipend_max, stipend_currency, duration,
      application_url, source_listing_id, posted_at, deadline,
      companies ( name, logo_url )
    `)
    .eq('is_active', true)
    .order('posted_at', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })

  if (error) throw error

  return ((data ?? []) as InternshipRow[]).map((row) => ({
    ...row,
    company: Array.isArray(row.companies) ? row.companies[0] ?? null : row.companies,
  }))
}

export const listSavedInternshipIds = async (studentId: string): Promise<string[]> => {
  const { data, error } = await supabase
    .from('saved_internships')
    .select('internship_id')
    .eq('student_id', studentId)

  if (error) throw error
  return (data ?? []).map((item) => item.internship_id as string)
}

export const saveInternship = async (studentId: string, internshipId: string) => {
  const { error } = await supabase
    .from('saved_internships')
    .insert({ student_id: studentId, internship_id: internshipId })

  if (error && error.code !== '23505') throw error
}

export const unsaveInternship = async (studentId: string, internshipId: string) => {
  const { error } = await supabase
    .from('saved_internships')
    .delete()
    .eq('student_id', studentId)
    .eq('internship_id', internshipId)

  if (error) throw error
}
