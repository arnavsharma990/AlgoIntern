import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

type MatchResult = {
  match_score: number
  match_label: string
  matching_skills: string[]
  missing_skills: string[]
  reasons: string[]
}

const jsonResponse = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, 'Content-Type': 'application/json' },
})

const stringArray = (value: unknown) => Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string').map((item) => item.trim()).filter(Boolean) : []
const normalized = (value: string) => value.toLowerCase().replace(/[^a-z0-9+#.]+/g, ' ').trim()

const normalizeMatch = (value: unknown): MatchResult => {
  if (!value || typeof value !== 'object') throw new Error('Invalid match response.')
  const input = value as Record<string, unknown>
  if (typeof input.match_score !== 'number' || !Number.isFinite(input.match_score)) throw new Error('Invalid match score.')
  if (typeof input.match_label !== 'string') throw new Error('Invalid match label.')
  const reasons = stringArray(input.reasons)
  if (!reasons.length) throw new Error('Missing match reasons.')
  return {
    match_score: Math.max(0, Math.min(100, Math.round(input.match_score))),
    match_label: input.match_label.trim(),
    matching_skills: stringArray(input.matching_skills),
    missing_skills: stringArray(input.missing_skills),
    reasons: reasons.slice(0, 4),
  }
}

const extractionPrompt = `You are an internship matching system. Return only valid JSON.

Compare the student's profile and resume evidence with the internship. Be conservative and explainable. Match skills case-insensitively, consider domain/interests, location/work mode preferences, education, and resume relevance. Only use supplied data. Do not invent qualifications.

The match_score must be 0-100. Use labels such as Strong Match, Good Match, Possible Match, or Low Match. matching_skills and missing_skills must refer to internship skills. reasons must contain 1-4 short, concrete reasons.

If the student's CGPA is below the internship eligibility CGPA, the result is not eligible: use match_score 0, match_label Not eligible, include a reason explaining the CGPA requirement, and do not describe the internship as a suitable match.

Return this exact shape:
{
  "match_score": number,
  "match_label": string,
  "matching_skills": string[],
  "missing_skills": string[],
  "reasons": string[]
}
`

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (request.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405)

  try {
    const authorization = request.headers.get('Authorization')
    if (!authorization) return jsonResponse({ error: 'Authentication required' }, 401)

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authorization } } },
    )
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) return jsonResponse({ error: 'Authentication required' }, 401)

    const body = await request.json() as { internship_id?: string }
    if (!body.internship_id) return jsonResponse({ error: 'internship_id is required' }, 400)

    const [{ data: profile, error: profileError }, { data: resume, error: resumeError }, { data: internship, error: internshipError }] = await Promise.all([
      supabase.from('profiles').select('skills, interests, preferred_domains, preferred_locations, preferred_work_modes, cgpa, branch, degree').eq('id', user.id).maybeSingle(),
      supabase.from('resumes').select('extracted_text, extracted_skills, extracted_education, extracted_experience, extracted_projects').eq('student_id', user.id).eq('is_primary', true).maybeSingle(),
      supabase.from('internships').select('title, description, domain, skills, location, work_mode, eligibility_cgpa, duration, companies(name)').eq('id', body.internship_id).eq('is_active', true).maybeSingle(),
    ])
    if (profileError || resumeError || internshipError) return jsonResponse({ error: 'Could not load matching data.' }, 500)
    if (!internship) return jsonResponse({ error: 'Internship not found.' }, 404)

    const profileData = profile ?? {}
    const resumeData = resume ?? {}
    const currentCgpa = typeof profileData.cgpa === 'number' ? profileData.cgpa : null
    const eligibility = typeof internship.eligibility_cgpa === 'number' ? internship.eligibility_cgpa : null
    const belowEligibility = eligibility !== null && (currentCgpa === null || currentCgpa < eligibility)
    const apiKey = Deno.env.get('GEMINI_API_KEY')
    if (!apiKey) return jsonResponse({ error: 'AI matching is not configured.' }, 503)

    const promptData = JSON.stringify({
      student: {
        profile: profileData,
        resume: resumeData,
      },
      internship: {
        ...internship,
        company: Array.isArray(internship.companies) ? internship.companies[0] ?? null : internship.companies,
      },
      eligibility_guard: belowEligibility ? `Student CGPA ${currentCgpa ?? 'not provided'} is below required CGPA ${eligibility}. Return Not eligible with score 0.` : 'No CGPA disqualification applies.',
    })

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `${extractionPrompt}\nStudent and internship data:\n${promptData}` }] }],
        generationConfig: { temperature: 0, responseMimeType: 'application/json' },
      }),
    })
    if (!response.ok) {
      const errorBody = await response.text()
      console.error(`Gemini matching API status: ${response.status}`)
      console.error('Gemini matching API error:', errorBody)
      return jsonResponse({ error: 'AI matching is temporarily unavailable.' }, response.status === 429 ? 429 : 502)
    }

    const result = await response.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> }
    const rawText = result.candidates?.[0]?.content?.parts?.[0]?.text
    if (!rawText) throw new Error('Empty match response.')
    const parsed = normalizeMatch(JSON.parse(rawText.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')))

    if (belowEligibility) {
      parsed.match_score = 0
      parsed.match_label = 'Not eligible'
      parsed.reasons = [`CGPA requirement: ${eligibility}. Your profile CGPA is ${currentCgpa ?? 'not provided'}.`, ...parsed.reasons.filter((reason) => !normalized(reason).includes('cgpa'))].slice(0, 4)
    }

    return jsonResponse(parsed)
  } catch (error) {
    console.error('Internship matching failed:', error instanceof Error ? error.message : 'unknown error')
    return jsonResponse({ error: 'AI matching failed. Please try again.' }, 500)
  }
})
