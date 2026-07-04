import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const ADZUNA_COUNTRY = 'in'
const RESULTS_PER_QUERY = 5
const SOURCE_NAME = 'Adzuna India'
const SOURCE_BASE_URL = 'https://www.adzuna.in'
const QUERIES = [
  { query: 'software engineering internship', domain: 'Software Engineering' },
  { query: 'web development internship', domain: 'Web Development' },
  { query: 'frontend internship', domain: 'Frontend Development' },
  { query: 'backend internship', domain: 'Backend Development' },
  { query: 'data science internship', domain: 'Data Science' },
  { query: 'machine learning internship', domain: 'AI/ML' },
  { query: 'cybersecurity internship', domain: 'Cybersecurity' },
  { query: 'cloud devops internship', domain: 'Cloud/DevOps' },
] as const

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

type AdzunaResult = {
  id?: string | number
  title?: string
  description?: string
  redirect_url?: string
  created?: string
  contract_type?: string
  location?: { display_name?: string }
  company?: { display_name?: string }
  category?: { label?: string }
  salary_min?: number
  salary_max?: number
  salary_is_predicted?: string
}

type AdzunaResponse = {
  results?: AdzunaResult[]
}

type IngestionSummary = {
  success: boolean
  queries: number
  fetched: number
  inserted: number
  updated: number
  skipped: number
  errors: number
}

const jsonResponse = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, 'Content-Type': 'application/json' },
})

const normalizeName = (name: string) => name
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, ' ')
  .trim()
  .replace(/\s+/g, '-')

const cleanText = (value: string | null | undefined) => value?.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim() || null

const getWorkMode = (result: AdzunaResult) => {
  const text = `${result.title || ''} ${result.description || ''} ${result.location?.display_name || ''}`.toLowerCase()
  if (text.includes('remote') || text.includes('work from home')) return 'Remote'
  if (text.includes('hybrid')) return 'Hybrid'
  return 'On-site'
}

const getSkills = (result: AdzunaResult) => {
  const text = `${result.title || ''} ${result.description || ''}`
  const knownSkills = [
    'React', 'TypeScript', 'JavaScript', 'HTML', 'CSS', 'Node.js', 'Python', 'Java',
    'C++', 'SQL', 'PostgreSQL', 'MongoDB', 'AWS', 'Azure', 'Docker', 'Kubernetes',
    'Terraform', 'Git', 'Linux', 'Machine Learning', 'TensorFlow', 'PyTorch', 'Pandas',
    'NLP', 'Cybersecurity', 'Networking', 'REST APIs', 'Data Analysis',
  ]
  return knownSkills.filter((skill) => new RegExp(`\\b${skill.replace(/[.+]/g, '\\$&')}\\b`, 'i').test(text))
}

const getDuration = (result: AdzunaResult) => {
  const match = `${result.title || ''} ${result.description || ''}`.match(/(\d+)\s*(month|months|week|weeks)/i)
  return match ? `${match[1]} ${match[2].toLowerCase()}` : null
}

const getDeadline = (result: AdzunaResult) => {
  const text = `${result.title || ''} ${result.description || ''}`
  const match = text.match(/(?:deadline|apply by|closing date)\D{0,12}(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})/i)
  if (!match) return null
  const timestamp = Date.parse(match[1])
  return Number.isNaN(timestamp) ? null : new Date(timestamp).toISOString()
}

const getCompany = async (supabase: ReturnType<typeof createClient>, result: AdzunaResult) => {
  const name = result.company?.display_name?.trim()
  if (!name) return null
  const normalizedName = normalizeName(name)
  const { data: existing, error: lookupError } = await supabase
    .from('companies')
    .select('id')
    .eq('normalized_name', normalizedName)
    .maybeSingle()
  if (lookupError) throw lookupError
  if (existing) return existing.id as string

  const { data: created, error: createError } = await supabase
    .from('companies')
    .insert({
      name,
      normalized_name: normalizedName,
      website_url: 'https://example.com',
      industry: result.category?.label || null,
      description: 'Company imported from Adzuna for AlgoIntern internship discovery.',
      headquarters: result.location?.display_name || null,
    })
    .select('id')
    .single()
  if (createError) {
    if (createError.code === '23505') {
      const { data: concurrent } = await supabase.from('companies').select('id').eq('normalized_name', normalizedName).maybeSingle()
      return concurrent?.id as string | null
    }
    throw createError
  }
  return created.id as string
}

const getSource = async (supabase: ReturnType<typeof createClient>) => {
  const { data: existing, error: lookupError } = await supabase
    .from('sources')
    .select('id')
    .eq('name', SOURCE_NAME)
    .maybeSingle()
  if (lookupError) throw lookupError
  if (existing) {
    const { error } = await supabase.from('sources').update({ is_active: true, base_url: SOURCE_BASE_URL }).eq('id', existing.id)
    if (error) throw error
    return existing.id as string
  }

  const { data: created, error: createError } = await supabase
    .from('sources')
    .insert({ name: SOURCE_NAME, base_url: SOURCE_BASE_URL, source_type: 'api', is_active: true })
    .select('id')
    .single()
  if (createError) throw createError
  return created.id as string
}

const mapInternship = (result: AdzunaResult, domain: string, companyId: string | null, sourceId: string) => {
  const reliableSalary = result.salary_is_predicted !== '1'
  const stipendMin = reliableSalary && typeof result.salary_min === 'number' && result.salary_min >= 0 ? result.salary_min : null
  const stipendMax = reliableSalary && typeof result.salary_max === 'number' && result.salary_max >= 0 ? result.salary_max : null
  return {
    company_id: companyId,
    source_id: sourceId,
    title: result.title?.trim() || null,
    description: cleanText(result.description),
    location: result.location?.display_name?.trim() || 'India',
    work_mode: getWorkMode(result),
    employment_type: result.contract_type || 'Internship',
    domain,
    skills: getSkills(result),
    stipend_min: stipendMin,
    stipend_max: stipendMax,
    stipend_currency: 'INR',
    duration: getDuration(result),
    application_url: result.redirect_url?.trim() || null,
    source_listing_id: String(result.id || '').trim(),
    posted_at: result.created || null,
    deadline: getDeadline(result),
    is_active: true,
  }
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (request.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405)

  const summary: IngestionSummary = { success: false, queries: 0, fetched: 0, inserted: 0, updated: 0, skipped: 0, errors: 0 }

  try {
    const appId = Deno.env.get('ADZUNA_APP_ID')
    const appKey = Deno.env.get('ADZUNA_APP_KEY')
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!appId || !appKey || !supabaseUrl || !serviceRoleKey) return jsonResponse({ error: 'Ingestion is not configured.' }, 503)

    const supabase = createClient(supabaseUrl, serviceRoleKey)
    const sourceId = await getSource(supabase)

    for (const { query, domain } of QUERIES) {
      summary.queries += 1
      const endpoint = new URL(`https://api.adzuna.com/v1/api/jobs/${ADZUNA_COUNTRY}/search/1`)
      endpoint.searchParams.set('app_id', appId)
      endpoint.searchParams.set('app_key', appKey)
      endpoint.searchParams.set('results_per_page', String(RESULTS_PER_QUERY))
      endpoint.searchParams.set('what', query)
      endpoint.searchParams.set('where', 'India')
      endpoint.searchParams.set('content-type', 'application/json')

      try {
        const response = await fetch(endpoint)
        if (!response.ok) {
          summary.errors += 1
          console.error(`Adzuna query failed with status ${response.status}`)
          continue
        }

        const payload = await response.json() as AdzunaResponse
        const results = payload.results || []
        summary.fetched += results.length

        for (const result of results) {
          const listingId = String(result.id || '').trim()
          const mapped = mapInternship(result, domain, await getCompany(supabase, result), sourceId)
          if (!listingId || !mapped.title || !mapped.application_url) {
            summary.skipped += 1
            continue
          }

          const { data: existing, error: lookupError } = await supabase
            .from('internships')
            .select('id')
            .eq('source_id', sourceId)
            .eq('source_listing_id', listingId)
            .maybeSingle()
          if (lookupError) throw lookupError

          if (existing) {
            const updatePayload = Object.fromEntries(Object.entries(mapped).filter(([, value]) => value !== null))
            const { error } = await supabase.from('internships').update(updatePayload).eq('id', existing.id)
            if (error) throw error
            summary.updated += 1
          } else {
            const { error } = await supabase.from('internships').insert(mapped)
            if (error) {
              if (error.code === '23505') summary.skipped += 1
              else throw error
            } else {
              summary.inserted += 1
            }
          }
        }
      } catch (error) {
        summary.errors += 1
        console.error('Adzuna query processing failed:', error instanceof Error ? error.message : 'unknown error')
      }
    }

    summary.success = summary.errors === 0
    console.log('Adzuna ingestion summary:', {
      queries: summary.queries,
      fetched: summary.fetched,
      inserted: summary.inserted,
      updated: summary.updated,
      skipped: summary.skipped,
      errors: summary.errors,
    })
    return jsonResponse(summary, summary.success ? 200 : 207)
  } catch (error) {
    summary.errors += 1
    console.error('Adzuna ingestion failed:', error instanceof Error ? error.message : 'unknown error')
    return jsonResponse({ ...summary, error: 'Internship ingestion failed.' }, 500)
  }
})
