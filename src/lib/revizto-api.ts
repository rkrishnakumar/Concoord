import axios from 'axios'

export interface ReviztoProject {
  uuid: string
  title: string
  description?: string
  status?: string
  created_at?: string
  updated_at?: string
}

export interface ReviztoIssue {
  id: string
  title: string
  description?: string
  status: string
  priority?: string
  assignee?: string
  location?: string
  due_date?: string
  attachments?: string[]
  created_at?: string
  updated_at?: string
}

export class ReviztoApi {
  private client: ReturnType<typeof axios.create>
  private accessToken: string
  private baseUrl: string
  private clientId: string
  private clientSecret: string
  private refreshToken?: string
  private expiresAt?: number

  constructor(
    accessToken: string,
    baseUrl: string,
    clientId: string,
    clientSecret: string,
    refreshToken?: string,
    expiresAt?: number
  ) {
    this.accessToken = accessToken
    this.baseUrl = baseUrl
    this.clientId = clientId
    this.clientSecret = clientSecret
    this.refreshToken = refreshToken
    this.expiresAt = expiresAt

    this.client = axios.create({
      baseURL: baseUrl,
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    })

    // Note: Removed complex interceptor to avoid TypeScript issues
    // Token refresh will be handled manually in API methods
  }

  /**
   * Get all projects accessible to the authenticated user
   */
  async getProjects(): Promise<ReviztoProject[]> {
    try {
      console.log('=== REVIZTO GETPROJECTS CALLED ===')
      console.log('Token expires at:', this.expiresAt)
      console.log('Current time:', Date.now())
      // Proactively refresh token if needed
      await this.checkAndRefreshToken()
      
      // Step 1: Get user licenses
      console.log('Fetching user licenses...')
      let licensesResponse
      try {
        licensesResponse = await this.client.get('/v5/user/licenses')
        console.log('Licenses response status:', licensesResponse.status)
        console.log('Licenses response data:', JSON.stringify(licensesResponse.data, null, 2))
      } catch (error) {
        console.error('Error fetching licenses:', error)
        throw new Error(`Failed to fetch licenses: ${(error as any)?.message}`)
      }
      
      // Extract licenses from the nested structure: response.data.data.entities
      const licensesData = licensesResponse.data as any
      const licenses = licensesData?.data?.entities || []
      console.log('Found licenses:', licenses.length)
      
      if (licenses.length === 0) {
        console.log('No licenses found for user')
        return []
      }
      
      // Step 2: Get projects for each license
      const allProjects: ReviztoProject[] = []
      
      for (const license of licenses) {
        try {
          console.log(`Fetching projects for license: ${license.uuid} (${license.name})`)
          const projectsResponse = await this.client.get(`/v5/project/list/${license.uuid}/paged`)
          console.log(`Projects response structure:`, JSON.stringify(projectsResponse.data, null, 2))
          
           // Extract projects from the response structure
           // The response has: { result: 0, data: { data: [...], count: 3 } }
           let projects = []
           const projectsData = projectsResponse.data as any
           console.log('Checking projects response structure...')
           console.log('Has data.data.data?', !!projectsData?.data?.data)
           console.log('Has data.data.projects?', !!projectsData?.data?.projects)
           console.log('Has data.projects?', !!projectsData?.projects)
           console.log('Is data array?', Array.isArray(projectsData))
           
           if (projectsData?.data?.data && Array.isArray(projectsData.data.data)) {
             projects = projectsData.data.data
             console.log('Using data.data.data')
           } else if (projectsData?.data?.projects && Array.isArray(projectsData.data.projects)) {
             projects = projectsData.data.projects
             console.log('Using data.data.projects')
           } else if (projectsData?.projects && Array.isArray(projectsData.projects)) {
             projects = projectsData.projects
             console.log('Using data.projects')
           } else if (Array.isArray(projectsData)) {
             projects = projectsData
             console.log('Using data directly')
           } else {
             console.log('No projects found in any expected structure')
           }
          
          console.log(`Found ${projects.length} projects for license ${license.uuid}`)
          console.log(`Projects:`, projects)
          allProjects.push(...projects)
        } catch (error) {
          console.error(`Error fetching projects for license ${license.uuid}:`, error)
          // Continue with other licenses even if one fails
        }
      }
      
      return allProjects
    } catch (error) {
      console.error('Error fetching Revizto projects:', error)
      console.error('Error details:', (error as any)?.message)
      console.error('Error stack:', error.stack)
      console.error('Error type:', error.constructor.name)
      if (error.response) {
        console.error('Error response status:', error.response.status)
        console.error('Error response data:', error.response.data)
      }
      throw new Error(`Failed to fetch projects from Revizto: ${(error as any)?.message}`)
    }
  }

  /**
   * Get issues for a specific project
   */
  async getIssues(projectId: string): Promise<ReviztoIssue[]> {
    try {
      // Proactively refresh token if needed
      await this.checkAndRefreshToken()
      
      // Get issues using the correct Revizto API endpoint
      const response = await this.client.get(`/v5/project/${projectId}/issue-filter/filter`)
      
      console.log('Full response object:', {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
        data: response.data
      })
      console.log('Revizto issues response structure:', JSON.stringify(response.data, null, 2))
      console.log('Response status:', response.status)
      console.log('Response headers:', response.headers)
      
      // Parse the response based on the actual Revizto API structure
      console.log('Response data structure:', JSON.stringify(response.data, null, 2))
      
      // According to Revizto API documentation, issues are in response.data.data.data
      const issuesData = response.data as any
      if (issuesData?.data?.data && Array.isArray(issuesData.data.data)) {
        console.log('Found issues in response.data.data.data')
        return issuesData.data.data
      }
      
      // Fallback to other possible structures
      if (issuesData?.data && Array.isArray(issuesData.data)) {
        console.log('Found issues in response.data.data')
        return issuesData.data
      }
      
      if (issuesData?.issues && Array.isArray(issuesData.issues)) {
        console.log('Found issues in response.data.issues')
        return issuesData.issues
      }
      
      if (Array.isArray(response.data)) {
        console.log('Found issues in response.data')
        return response.data
      }
      
      console.log('No issues found in response')
      return []
    } catch (error) {
      console.error('Error fetching Revizto issues:', error)
      throw new Error('Failed to fetch issues from Revizto')
    }
  }

  /**
   * Get a specific issue by ID
   */
  async getIssue(projectId: string, issueId: string): Promise<ReviztoIssue> {
    try {
      // Proactively refresh token if needed
      await this.checkAndRefreshToken()
      
      const response = await this.client.get(`/v5/project/${projectId}/issue/${issueId}`)
      return response.data
    } catch (error) {
      console.error('Error fetching Revizto issue:', error)
      throw new Error('Failed to fetch issue from Revizto')
    }
  }

  /**
   * Create a new issue in a project
   */
  async createIssue(projectId: string, issueData: Partial<ReviztoIssue>): Promise<ReviztoIssue> {
    try {
      // Proactively refresh token if needed
      await this.checkAndRefreshToken()
      
      const response = await this.client.post(`/v5/project/${projectId}/issue`, issueData)
      return response.data
    } catch (error) {
      console.error('Error creating Revizto issue:', error)
      throw new Error('Failed to create issue in Revizto')
    }
  }

  /**
   * Update an existing issue
   */
  async updateIssue(projectId: string, issueId: string, issueData: Partial<ReviztoIssue>): Promise<ReviztoIssue> {
    try {
      // Proactively refresh token if needed
      await this.checkAndRefreshToken()
      
      const response = await this.client.put(`/v5/project/${projectId}/issue/${issueId}`, issueData)
      return response.data
    } catch (error) {
      console.error('Error updating Revizto issue:', error)
      throw new Error('Failed to update issue in Revizto')
    }
  }

  /**
   * Test the connection by making a simple API call
   */
  async testConnection(): Promise<boolean> {
    try {
      // Proactively refresh token if needed
      await this.checkAndRefreshToken()
      
      // Test with the user licenses endpoint
      const response = await this.client.get('/v5/user/licenses')
      return response.status === 200
    } catch (error) {
      console.error('Revizto connection test failed:', error)
      return false
    }
  }

  /**
   * Refresh the access token using Revizto's specific method
   */
  async refreshAccessToken(): Promise<string> {
    if (!this.refreshToken) {
      throw new Error('No refresh token available')
    }

    try {
      // Use Revizto's specific token refresh endpoint
      // The endpoint is https://api.virginia.revizto.com/v5/oauth2
      const refreshUrl = 'https://api.virginia.revizto.com/v5/oauth2'
      
      console.log('Attempting token refresh with refresh token:', this.refreshToken)
      const response = await axios.post(refreshUrl, {
        grant_type: 'refresh_token',
        refresh_token: this.refreshToken
      }, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      })
      
      console.log('Token refresh response status:', response.status)
      console.log('Token refresh response data:', JSON.stringify(response.data, null, 2))

      const tokenData = response.data as any
      this.accessToken = tokenData.access_token
      this.refreshToken = tokenData.refresh_token || this.refreshToken
      
      // Update expiry time (1 hour from now)
      this.expiresAt = Date.now() + (60 * 60 * 1000)
      
      // Update the default authorization header
      this.client.defaults.headers['Authorization'] = `Bearer ${this.accessToken}`
      
      // Note: Database update will be handled by the API endpoint that calls this
      console.log('Revizto token refreshed successfully')
      
      return this.accessToken
    } catch (error) {
      console.error('Error refreshing Revizto token:', error)
      console.error('Error details:', (error as any)?.message)
      if (error.response) {
        console.error('Error response status:', error.response.status)
        console.error('Error response data:', error.response.data)
      }
      throw new Error(`Failed to refresh access token: ${(error as any)?.message}`)
    }
  }

  /**
   * Check if token needs refresh and refresh if necessary
   */
  async ensureValidToken(): Promise<void> {
    // Check if token is close to expiry (refresh 5 minutes before expiry)
    const now = new Date()
    const expiryTime = new Date(now.getTime() + (5 * 60 * 1000)) // 5 minutes from now
    
    // If we don't have expiry info, try to refresh anyway
    if (!this.refreshToken) {
      throw new Error('No refresh token available')
    }

    try {
      await this.refreshAccessToken()
    } catch (error) {
      console.error('Failed to refresh Revizto token:', error)
      throw error
    }
  }

  /**
   * Check if token is close to expiry and refresh proactively
   */
  async checkAndRefreshToken(): Promise<void> {
    if (!this.refreshToken) {
      console.log('No refresh token available for Revizto')
      return // No refresh token available
    }

    if (!this.expiresAt) {
      console.log('No expiry info available for Revizto token')
      return // No expiry info available
    }

    // Check if token expires within the next 5 minutes
    const now = Date.now()
    const fiveMinutesFromNow = now + (5 * 60 * 1000)
    
    console.log(`Token expires at: ${this.expiresAt}, checking if <= ${fiveMinutesFromNow}`)
    
    if (this.expiresAt <= fiveMinutesFromNow) {
      try {
        console.log('Token is close to expiry, refreshing...')
        await this.refreshAccessToken()
        console.log('Revizto token refreshed proactively')
      } catch (error) {
        console.error('Proactive token refresh failed:', error)
        // Don't throw error here - let the API call fail naturally if needed
      }
    } else {
      console.log('Token is still valid, no refresh needed')
    }
  }
}
