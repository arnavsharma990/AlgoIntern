import type { Profile } from './auth'
import type { ProfileFormData } from '../pages/ProfilePage'

export const profileCompletion = (profile: Profile | ProfileFormData) => {
  const values = [
    profile.full_name,
    profile.phone,
    profile.headline,
    profile.college,
    profile.degree,
    profile.branch,
    profile.graduation_year,
    profile.cgpa,
    profile.bio,
    profile.skills,
    profile.interests,
    profile.preferred_domains,
    profile.preferred_locations,
    profile.preferred_work_modes,
  ]
  const complete = values.filter((value) => Array.isArray(value) ? value.length > 0 : value !== null && value !== undefined && String(value).trim() !== '').length
  return Math.round((complete / values.length) * 100)
}
