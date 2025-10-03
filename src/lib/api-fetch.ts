// API fetch helper that uses NEXT_PUBLIC_API_BASE_URL for backend calls
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || ''

export async function apiFetch(url: string, options?: RequestInit): Promise<Response> {
  // If API_BASE_URL is set, use it as the base for API calls
  const baseUrl = API_BASE_URL?.replace(/\/$/, '') // Remove trailing slash
  const fullUrl = baseUrl ? `${baseUrl}${url}` : url
  
  return fetch(fullUrl, options)
}
