import { supabase } from './supabase'

export const applicationStatuses = ['saved', 'applied', 'under_review', 'shortlisted', 'interview', 'selected', 'rejected', 'withdrawn'] as const
export type ApplicationStatus = typeof applicationStatuses[number]

export type StudentApplication = {
  id: string
  student_id: string
  internship_id: string
  status: ApplicationStatus
  notes: string | null
  applied_at: string | null
  last_updated_at: string | null
  created_at: string
  updated_at: string
  internship: {
    title: string
    location: string | null
    work_mode: string | null
    domain: string | null
    application_url: string
    company: { name: string } | null
  } | null
}

type RelatedInternship = Omit<NonNullable<StudentApplication['internship']>, 'company'> & {
  companies: { name: string } | { name: string }[] | null
}

type ApplicationRow = Omit<StudentApplication, 'internship'> & {
  internships: RelatedInternship | RelatedInternship[] | null
}

const normalizeApplication = (row: ApplicationRow): StudentApplication => {
  const related = Array.isArray(row.internships) ? row.internships[0] ?? null : row.internships
  return {
    ...row,
    internship: related ? {
      ...related,
      company: Array.isArray(related.companies) ? related.companies[0] ?? null : related.companies,
    } : null,
  }
}

export const listStudentApplications = async (studentId: string): Promise<StudentApplication[]> => {
  const { data, error } = await supabase
    .from('applications')
    .select(`
      id, student_id, internship_id, status, notes, applied_at,
      last_updated_at, created_at, updated_at,
      internships (
        title, location, work_mode, domain, application_url,
        companies ( name )
      )
    `)
    .eq('student_id', studentId)
    .order('last_updated_at', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })

  if (error) throw error
  return ((data ?? []) as ApplicationRow[]).map(normalizeApplication)
}

export const listStudentApplicationIds = async (studentId: string): Promise<string[]> => {
  const { data, error } = await supabase
    .from('applications')
    .select('internship_id')
    .eq('student_id', studentId)
  if (error) throw error
  return (data ?? []).map((item) => item.internship_id as string)
}

export const trackApplication = async (studentId: string, internshipId: string) => {
  const { data: existing, error: lookupError } = await supabase
    .from('applications')
    .select('id, status, applied_at')
    .eq('student_id', studentId)
    .eq('internship_id', internshipId)
    .maybeSingle()

  if (lookupError) throw lookupError

  if (existing) {
    if (existing.status !== 'saved') return
    const { error } = await supabase
      .from('applications')
      .update({ status: 'applied', applied_at: existing.applied_at ?? new Date().toISOString(), last_updated_at: new Date().toISOString() })
      .eq('id', existing.id)
      .eq('student_id', studentId)
    if (error) throw error
    return
  }

  const now = new Date().toISOString()
  const { error } = await supabase
    .from('applications')
    .insert({ student_id: studentId, internship_id: internshipId, status: 'applied', applied_at: now, last_updated_at: now })

  if (error && error.code !== '23505') throw error
}

export const updateStudentApplication = async (studentId: string, applicationId: string, updates: { status?: ApplicationStatus; notes?: string | null; applied_at?: string | null }) => {
  const payload: { status?: ApplicationStatus; notes?: string | null; last_updated_at: string; applied_at?: string | null } = { ...updates, last_updated_at: new Date().toISOString() }
  if (updates.status !== 'applied') delete payload.applied_at
  const { error } = await supabase
    .from('applications')
    .update(payload)
    .eq('id', applicationId)
    .eq('student_id', studentId)
  if (error) throw error
}
