import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

type ExperienceItem = {
  company: string | null
  role: string | null
  start_date: string | null
  end_date: string | null
  description: string | null
}

type ProjectItem = {
  name: string | null
  description: string | null
  technologies: string[]
}

type EducationItem = {
  institution: string | null
  degree: string | null
  field: string | null
  start_year: number | null
  end_year: number | null
}

type ParsedResume = {
  full_name: string | null
  headline: string | null
  phone: string | null
  location: string | null
  college: string | null
  degree: string | null
  branch: string | null
  graduation_year: number | null
  cgpa: number | null
  bio: string | null
  skills: string[]
  interests: string[]
  preferred_domains: string[]
  experience: ExperienceItem[]
  projects: ProjectItem[]
  education: EducationItem[]
}

const schemaKeys = [
  'full_name', 'headline', 'phone', 'location', 'college', 'degree', 'branch',
  'graduation_year', 'cgpa', 'bio', 'skills', 'interests', 'preferred_domains',
  'experience', 'projects', 'education',
] as const

const nullableString = (value: unknown) => value === null || typeof value === 'string' ? value : null
const nullableNumber = (value: unknown) => value === null || typeof value === 'number' && Number.isFinite(value) ? value : null
const stringArray = (value: unknown) => Array.isArray(value) && value.every((item) => typeof item === 'string') ? value.map((item) => item.trim()).filter(Boolean) : []

const validateParsedResume = (value: unknown): ParsedResume => {
  if (!value || typeof value !== 'object') throw new Error('The AI response was not an object.')
  const input = value as Record<string, unknown>
  for (const key of schemaKeys) if (!(key in input)) throw new Error(`The AI response is missing ${key}.`)

  const experience = Array.isArray(input.experience) ? input.experience.map((item) => {
    if (!item || typeof item !== 'object') throw new Error('Invalid experience item.')
    const entry = item as Record<string, unknown>
    return {
      company: nullableString(entry.company),
      role: nullableString(entry.role),
      start_date: nullableString(entry.start_date),
      end_date: nullableString(entry.end_date),
      description: nullableString(entry.description),
    }
  }) : null

  const projects = Array.isArray(input.projects) ? input.projects.map((item) => {
    if (!item || typeof item !== 'object') throw new Error('Invalid project item.')
    const entry = item as Record<string, unknown>
    if (!Array.isArray(entry.technologies) || !entry.technologies.every((technology) => typeof technology === 'string')) throw new Error('Invalid project technologies.')
    return { name: nullableString(entry.name), description: nullableString(entry.description), technologies: stringArray(entry.technologies) }
  }) : null

  const education = Array.isArray(input.education) ? input.education.map((item) => {
    if (!item || typeof item !== 'object') throw new Error('Invalid education item.')
    const entry = item as Record<string, unknown>
    return {
      institution: nullableString(entry.institution),
      degree: nullableString(entry.degree),
      field: nullableString(entry.field),
      start_year: nullableNumber(entry.start_year),
      end_year: nullableNumber(entry.end_year),
    }
  }) : null

  if (!experience || !projects || !education) throw new Error('The AI response contains invalid arrays.')

  return {
    full_name: nullableString(input.full_name),
    headline: nullableString(input.headline),
    phone: nullableString(input.phone),
    location: nullableString(input.location),
    college: nullableString(input.college),
    degree: nullableString(input.degree),
    branch: nullableString(input.branch),
    graduation_year: nullableNumber(input.graduation_year),
    cgpa: nullableNumber(input.cgpa),
    bio: nullableString(input.bio),
    skills: stringArray(input.skills),
    interests: stringArray(input.interests),
    preferred_domains: stringArray(input.preferred_domains),
    experience,
    projects,
    education,
  }
}

const extractionPrompt = `You are a resume information extraction system.

Extract only information explicitly supported by the supplied resume text. Do not invent, assume, or hallucinate information. Normalize obvious formatting variations but preserve the meaning. Return valid JSON matching the required schema. If information is missing, return null or an empty array.

Skills should contain actual technical/professional skills explicitly present in the resume. Projects should preserve project names and relevant technologies. Experience should preserve company, role and available dates. Education should preserve institution, degree, field and dates. Do not generate recommendations. Do not generate a rewritten resume. Do not add information not present in the source.

Required JSON schema:
{
  "full_name": string | null,
  "headline": string | null,
  "phone": string | null,
  "location": string | null,
  "college": string | null,
  "degree": string | null,
  "branch": string | null,
  "graduation_year": number | null,
  "cgpa": number | null,
  "bio": string | null,
  "skills": string[],
  "interests": string[],
  "preferred_domains": string[],
  "experience": [{ "company": string | null, "role": string | null, "start_date": string | null, "end_date": string | null, "description": string | null }],
  "projects": [{ "name": string | null, "description": string | null, "technologies": string[] }],
  "education": [{ "institution": string | null, "degree": string | null, "field": string | null, "start_year": number | null, "end_year": number | null }]
}

Resume text:
`

const jsonFromGemini = (value: string) => {
  const cleaned = value.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')
  return JSON.parse(cleaned)
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (request.method !== 'POST') return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  try {
    const authorization = request.headers.get('Authorization')
    if (!authorization) return new Response(JSON.stringify({ error: 'Authentication required' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authorization } } },
    )
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) return new Response(JSON.stringify({ error: 'Authentication required' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    const body = await request.json() as { resume_id?: string }
    if (!body.resume_id) return new Response(JSON.stringify({ error: 'resume_id is required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    const { data: resume, error: resumeError } = await supabase
      .from('resumes')
      .select('id, extracted_text')
      .eq('id', body.resume_id)
      .eq('student_id', user.id)
      .single()
    if (resumeError || !resume) return new Response(JSON.stringify({ error: 'Resume not found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    if (!resume.extracted_text || resume.extracted_text.trim().length < 80) return new Response(JSON.stringify({ error: "Your resume doesn't contain enough readable text to analyze." }), { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    const apiKey = Deno.env.get('GEMINI_API_KEY')
    if (!apiKey) return new Response(JSON.stringify({ error: 'AI analysis is not configured.' }), { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `${extractionPrompt}${resume.extracted_text}` }] }],
        generationConfig: { temperature: 0, responseMimeType: 'application/json' },
      }),
    })
    if (!response.ok) {
      const errorBody = await response.text()
      console.error(`Gemini API status: ${response.status}`)
      console.error('Gemini API error:', errorBody)

      return new Response(
        JSON.stringify({ error: 'AI analysis is temporarily unavailable.' }),
        {
          status: response.status === 429 ? 429 : 502,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    const result = await response.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> }
    const rawText = result.candidates?.[0]?.content?.parts?.[0]?.text
    if (!rawText) throw new Error('The AI returned an empty response.')
    const parsed = validateParsedResume(jsonFromGemini(rawText))

    return new Response(JSON.stringify({ parsed }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (error) {
    console.error('Resume parsing failed:', error instanceof Error ? error.message : 'unknown error')
    return new Response(JSON.stringify({ error: 'AI analysis failed. Please try again.' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
