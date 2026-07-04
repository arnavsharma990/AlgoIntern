import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist'
import type { TextItem } from 'pdfjs-dist/types/src/display/api'
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import { isSupabaseConfigured, supabase } from './supabase'

GlobalWorkerOptions.workerSrc = pdfWorkerUrl

export type Resume = {
  id: string
  student_id: string
  file_name: string | null
  storage_path: string | null
  file_type: string | null
  file_size: number | null
  extracted_text: string | null
  extracted_skills: string[] | null
  extracted_education: Record<string, unknown> | unknown[] | null
  extracted_experience: Record<string, unknown> | unknown[] | null
  extracted_projects: Record<string, unknown> | unknown[] | null
  is_primary: boolean
  created_at: string
  updated_at: string
  extraction?: PdfExtractionResult
}

export type ParsedResume = {
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
  experience: Array<{ company: string | null; role: string | null; start_date: string | null; end_date: string | null; description: string | null }>
  projects: Array<{ name: string | null; description: string | null; technologies: string[] }>
  education: Array<{ institution: string | null; degree: string | null; field: string | null; start_year: number | null; end_year: number | null }>
}

export type PdfExtractionResult = {
  text: string
  pageCount: number
  nonEmptyLineCount: number
  characterCount: number
  likelyScanned: boolean
}

type PositionedTextItem = {
  text: string
  x: number
  y: number
  width: number
  height: number
  hasEol: boolean
}

type TextLine = {
  items: PositionedTextItem[]
  y: number
  minX: number
  maxX: number
}

export const MAX_RESUME_SIZE = 5 * 1024 * 1024

export const getFriendlyResumeError = (error: unknown) => {
  const message = error instanceof Error ? error.message.toLowerCase() : ''
  if (message.includes('pdf resume')) return 'Please upload a PDF resume only.'
  if (message.includes('smaller than 5 mb')) return 'Your resume must be smaller than 5 MB.'
  if (message.includes('text')) return "Text couldn't be extracted from this PDF. AI/OCR support will be added in the next step."
  if (message.includes('network') || message.includes('fetch')) return 'We could not reach Supabase. Check your connection and try again.'
  if (message.includes('row-level') || message.includes('permission') || message.includes('not authorized')) return 'You do not have permission to manage this resume.'
  return 'We could not complete that resume action. Please try again.'
}

const requireConfigured = () => {
  if (!isSupabaseConfigured) throw new Error('Supabase is not configured.')
}

export const validateResumeFile = (file: File) => {
  if (file.type !== 'application/pdf') throw new Error('Please upload a PDF resume only.')
  if (file.size > MAX_RESUME_SIZE) throw new Error('Your resume must be smaller than 5 MB.')
}

const normalizeLine = (items: PositionedTextItem[]) => items
  .sort((left, right) => left.x - right.x)
  .map((item) => item.text.replace(/\s+/g, ' ').trim())
  .filter(Boolean)
  .join(' ')
  .replace(/\s+([,.;:!?])/g, '$1')
  .trim()

const groupIntoLines = (items: PositionedTextItem[]) => {
  const lines: TextLine[] = []

  for (const item of items.sort((left, right) => right.y - left.y || left.x - right.x)) {
    const tolerance = Math.max(3, item.height * 0.45)
    const line = lines.find((candidate) => Math.abs(candidate.y - item.y) <= tolerance)

    if (line) {
      line.items.push(item)
      line.y = (line.y + item.y) / 2
      line.minX = Math.min(line.minX, item.x)
      line.maxX = Math.max(line.maxX, item.x + item.width)
    } else {
      lines.push({ items: [item], y: item.y, minX: item.x, maxX: item.x + item.width })
    }
  }

  return lines.sort((left, right) => right.y - left.y)
}

const formatPageText = (items: PositionedTextItem[], pageWidth: number) => {
  const lines = groupIntoLines(items)
  const splitX = pageWidth / 2
  const leftColumn = lines.filter((line) => line.maxX < splitX - 18)
  const rightColumn = lines.filter((line) => line.minX > splitX + 18)
  const hasTwoColumns = leftColumn.length >= 3 && rightColumn.length >= 3

  if (!hasTwoColumns) {
    return lines.map((line) => normalizeLine(line.items)).filter(Boolean).join('\n')
  }

  const fullWidthLines = lines.filter((line) => !leftColumn.includes(line) && !rightColumn.includes(line))
  const leftText = leftColumn.map((line) => normalizeLine(line.items)).filter(Boolean)
  const rightText = rightColumn.map((line) => normalizeLine(line.items)).filter(Boolean)
  const fullWidthText = fullWidthLines.map((line) => normalizeLine(line.items)).filter(Boolean)

  // Reading a clearly columnar resume top-to-bottom per column avoids line interleaving.
  return [...fullWidthText, ...leftText, ...rightText].join('\n')
}

const cleanExtractedText = (pages: string[]) => pages
  .map((page, index) => `--- Page ${index + 1} ---\n${page.trim()}`)
  .join('\n\n')
  .replace(/[ \t]+\n/g, '\n')
  .replace(/\n{3,}/g, '\n\n')
  .trim()

export const extractPdfText = async (file: File): Promise<PdfExtractionResult> => {
  const bytes = new Uint8Array(await file.arrayBuffer())
  const document = await getDocument({ data: bytes }).promise
  const pages: string[] = []

  for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
    const page = await document.getPage(pageNumber)
    const content = await page.getTextContent()
    const items = content.items
      .filter((item): item is TextItem => 'str' in item && Boolean(item.str.trim()))
      .map((item) => ({
        text: item.str,
        x: item.transform[4],
        y: item.transform[5],
        width: item.width,
        height: Math.abs(item.transform[3]) || item.height || 10,
        hasEol: item.hasEOL,
      }))

    pages.push(formatPageText(items, page.getViewport({ scale: 1 }).width))
  }

  const text = cleanExtractedText(pages)
  const nonEmptyLineCount = text.split('\n').filter((line) => line.trim() && !line.startsWith('--- Page')).length

  return {
    text,
    pageCount: document.numPages,
    nonEmptyLineCount,
    characterCount: text.length,
    likelyScanned: text.replace(/--- Page \d+ ---/g, '').trim().length < 80,
  }
}

export const listStudentResumes = async (studentId: string): Promise<Resume[]> => {
  requireConfigured()
  const { data, error } = await supabase
    .from('resumes')
    .select('*')
    .eq('student_id', studentId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data ?? []) as Resume[]
}

export const analyzeStudentResume = async (resumeId: string): Promise<ParsedResume> => {
  requireConfigured()
  const { data, error } = await supabase.functions.invoke<{ parsed?: ParsedResume; error?: string }>('parse-resume', {
    body: { resume_id: resumeId },
  })
  if (error) throw error
  if (!data?.parsed) throw new Error(data?.error ?? 'AI analysis returned no structured result.')
  return data.parsed
}

export const getStoredResumeInsights = (resume: Resume): ParsedResume | null => {
  const hasInsights = Boolean(
    resume.extracted_skills?.length ||
    Array.isArray(resume.extracted_education) && resume.extracted_education.length ||
    Array.isArray(resume.extracted_experience) && resume.extracted_experience.length ||
    Array.isArray(resume.extracted_projects) && resume.extracted_projects.length,
  )
  if (!hasInsights) return null

  return {
    full_name: null,
    headline: null,
    phone: null,
    location: null,
    college: null,
    degree: null,
    branch: null,
    graduation_year: null,
    cgpa: null,
    bio: null,
    skills: resume.extracted_skills ?? [],
    interests: [],
    preferred_domains: [],
    experience: Array.isArray(resume.extracted_experience) ? resume.extracted_experience as ParsedResume['experience'] : [],
    projects: Array.isArray(resume.extracted_projects) ? resume.extracted_projects as ParsedResume['projects'] : [],
    education: Array.isArray(resume.extracted_education) ? resume.extracted_education as ParsedResume['education'] : [],
  }
}

export const saveResumeInsights = async (resumeId: string, studentId: string, parsed: ParsedResume): Promise<Resume> => {
  requireConfigured()
  const { data, error } = await supabase
    .from('resumes')
    .update({
      extracted_skills: parsed.skills,
      extracted_education: parsed.education,
      extracted_experience: parsed.experience,
      extracted_projects: parsed.projects,
    })
    .eq('id', resumeId)
    .eq('student_id', studentId)
    .select('*')
    .single()
  if (error) throw error
  return data as Resume
}

export const uploadStudentResume = async (studentId: string, file: File, onStatus: (status: 'uploading' | 'extracting' | 'saving') => void): Promise<Resume> => {
  requireConfigured()
  validateResumeFile(file)
  const uniqueName = `${crypto.randomUUID()}.pdf`
  const storagePath = `${studentId}/resume/${uniqueName}`

  onStatus('uploading')
  const { error: uploadError } = await supabase.storage.from('resumes').upload(storagePath, file, {
    contentType: 'application/pdf',
    upsert: false,
  })
  if (uploadError) throw uploadError

  try {
    onStatus('extracting')
    const extraction = await extractPdfText(file)
    onStatus('saving')

    const { error: unmarkError } = await supabase
      .from('resumes')
      .update({ is_primary: false })
      .eq('student_id', studentId)
      .eq('is_primary', true)
    if (unmarkError) throw unmarkError

    const { data, error: insertError } = await supabase
      .from('resumes')
      .insert({
        student_id: studentId,
        file_name: file.name,
        storage_path: storagePath,
        file_type: file.type,
        file_size: file.size,
        extracted_text: extraction.text || null,
        extracted_skills: [],
        extracted_education: {},
        extracted_experience: {},
        extracted_projects: {},
        is_primary: true,
      })
      .select('*')
      .single()
    if (insertError) throw insertError

    return { ...(data as Resume), extraction }
  } catch (error) {
    await supabase.storage.from('resumes').remove([storagePath])
    throw error
  }
}

export const removeStudentResume = async (resume: Resume) => {
  requireConfigured()
  if (resume.storage_path) {
    const { error: storageError } = await supabase.storage.from('resumes').remove([resume.storage_path])
    if (storageError) throw storageError
  }

  const { error } = await supabase.from('resumes').delete().eq('id', resume.id).eq('student_id', resume.student_id)
  if (error) throw error
}
