// Helper function to build API URLs without double slashes
export function buildApiUrl(endpoint: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, '') // Remove trailing slash
  return `${baseUrl}${endpoint}`
}
