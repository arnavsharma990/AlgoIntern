export type WorkMode = 'Remote' | 'Hybrid' | 'On-site'

export type InternshipDomain =
  | 'Software'
  | 'Data'
  | 'Design'
  | 'Product'
  | 'Marketing'
  | 'Operations'

export type Internship = {
  id: number
  title: string
  company: string
  location: string
  workMode: WorkMode
  domain: InternshipDomain
  skills: string[]
  stipend: number
  duration: string
  postedDaysAgo: number
  deadline: string
  description: string
  whyFit: string[]
}
