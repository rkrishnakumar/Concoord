import axios from 'axios'

export interface ProcoreProject {
  id: string
  name: string
  description?: string
  status: string
}

export interface ProcoreCompany {
  id: string
  name: string
  description?: string
}

export interface ProcoreUser {
  id: string
  email: string
  name: string
}

export interface ProcoreCoordinationIssue {
  id: string
  title: string
  description: string
  status: string
  assignee?: {
    id: string
    email: string
    name: string
  }
  created_at: string
  updated_at: string
  project_id: string
}

export interface CreateCoordinationIssueRequest {
  title: string
  description: string
  status: string
  assignee_id?: string
  project_id: string
}

export interface UpdateCoordinationIssueRequest {
  title?: string
  description?: string
  status?: string
  assignee_id?: string
}

export class ProcoreApi {
  private client: ReturnType<typeof axios.create>
  private accessToken: string
  private baseUrl: string
  private companyId: string | null = null
  private clientId: string
  private clientSecret: string
  private refreshToken?: string

  constructor(
    accessToken: string, 
    baseUrl: string = 'https://api.procore.com',
    clientId: string = '',
    clientSecret: string = '',
    refreshToken?: string,
    companyId?: string
  ) {
    this.accessToken = accessToken
    this.baseUrl = baseUrl
    this.clientId = clientId
    this.clientSecret = clientSecret
    this.refreshToken = refreshToken
    
    const headers: any = {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    }
    
    if (companyId) {
      headers['Procore-Company-Id'] = companyId
    }
    
    this.client = axios.create({
      baseURL: baseUrl,
      headers,
    })

    // Temporarily disabled automatic token refresh to debug the issue
    // this.client.interceptors.response.use(
    //   (response) => response,
    //   async (error) => {
    //     if (error.response?.status === 401 && this.refreshToken && this.clientId && this.clientSecret) {
    //       try {
    //         console.log('Procore token expired, attempting refresh...')
    //         await this.refreshAccessToken()
    //         // Retry the original request with new token
    //         const originalRequest = error.config
    //         originalRequest.headers['Authorization'] = `Bearer ${this.accessToken}`
    //         return this.client(originalRequest)
    //       } catch (refreshError) {
    //         console.error('Procore token refresh failed:', refreshError)
    //         return Promise.reject(refreshError)
    //       }
    //     }
    //     return Promise.reject(error)
    //   }
    // )
  }

  private async ensureCompanyId(): Promise<string> {
    if (this.companyId) {
      return this.companyId
    }

    try {
      // Get user info first
      const userResponse = await this.client.get('/rest/v1.0/me')
      console.log('Procore user info:', userResponse.data)
      
      // Try to extract company ID from user info
      const userData = userResponse.data as any
      if (userData.company_id) {
        this.companyId = userData.company_id.toString()
      } else if (userData.company) {
        this.companyId = userData.company.id.toString()
      } else {
        // If not in user info, get it from companies endpoint
        console.log('Getting company ID from companies endpoint...')
        const companiesResponse = await this.client.get('/rest/v1.0/companies')
        console.log('Companies response:', companiesResponse.data)
        
        const companiesData = companiesResponse.data as any
        if (companiesData && companiesData.length > 0) {
          this.companyId = companiesData[0].id.toString()
        } else {
          throw new Error('Could not determine company ID from companies endpoint')
        }
      }
      
      console.log('Using company ID:', this.companyId)
      
      // Update client headers with company ID
      this.client.defaults.headers['Procore-Company-Id'] = this.companyId
      
      return this.companyId
    } catch (error) {
      console.error('Error getting company ID:', error)
      console.error('Error details:', error.response?.data)
      throw new Error('Failed to get Procore company ID')
    }
  }

  async getCompanies(): Promise<ProcoreCompany[]> {
    try {
      console.log('Fetching Procore companies...')
      const response = await this.client.get('/rest/v1.0/companies')
      console.log('Procore companies response:', response.data)
      
      // Handle different response formats
      const responseData = response.data as any
      if (Array.isArray(responseData)) {
        return responseData
      } else if (responseData.companies) {
        return responseData.companies
      } else if (responseData.data) {
        return responseData.data
      } else {
        return []
      }
    } catch (error) {
      console.error('Error fetching Procore companies:', error)
      console.error('Response status:', error.response?.status)
      console.error('Response data:', error.response?.data)
      throw new Error(`Failed to fetch Procore companies: ${error.response?.status || 'Unknown error'}`)
    }
  }

  async getProjects(companyId?: string): Promise<ProcoreProject[]> {
    try {
      if (companyId) {
        console.log(`Making projects request with company ID: ${companyId}`)
        
        // Create a new axios instance with the company ID header
        const companyClient = axios.create({
          baseURL: this.baseUrl,
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
            'Procore-Company-Id': companyId.toString()
          }
        })
        
        // Try with company ID as query parameter as well
        const response = await companyClient.get(`/rest/v1.0/projects?company_id=${companyId}`)
        console.log('Procore projects response:', response.data)
        
        // Handle different response formats
        const responseData = response.data as any
        if (Array.isArray(responseData)) {
          return responseData
        } else if (responseData.projects) {
          return responseData.projects
        } else if (responseData.data) {
          return responseData.data
        } else {
          return []
        }
      } else {
        // Legacy method - try to auto-detect company
        await this.ensureCompanyId()
        
        console.log('Fetching Procore projects...')
        const response = await this.client.get('/rest/v1.0/projects')
        console.log('Procore API Response:', response.data)
        
        // Handle different response formats
        const responseData = response.data as any
        if (Array.isArray(responseData)) {
          return responseData
        } else if (responseData.projects) {
          return responseData.projects
        } else if (responseData.data) {
          return responseData.data
        } else {
          return []
        }
      }
    } catch (error) {
      console.error('Error fetching Procore projects:', error)
      console.error('Response status:', error.response?.status)
      console.error('Response data:', error.response?.data)
      console.error('Response headers:', error.response?.headers)
      throw new Error(`Failed to fetch Procore projects: ${error.response?.status || 'Unknown error'}`)
    }
  }

  async getProjectUsers(projectId: string): Promise<ProcoreUser[]> {
    try {
      const response = await this.client.get(`/rest/v1.0/projects/${projectId}/users`)
      return response.data || []
    } catch (error) {
      console.error('Error fetching Procore project users:', error)
      throw new Error('Failed to fetch Procore project users')
    }
  }

  async getCoordinationIssues(projectId: string, updatedSince?: string): Promise<ProcoreCoordinationIssue[]> {
    try {
      const params: any = {
        project_id: projectId,
      }
      
      if (updatedSince) {
        params.updated_since = updatedSince
      }

      const response = await this.client.get('/rest/v1.0/coordination_issues', { params })
      return response.data || []
    } catch (error) {
      console.error('Error fetching Procore coordination issues:', error)
      throw new Error('Failed to fetch Procore coordination issues')
    }
  }

  async createCoordinationIssue(projectId: string, issueData: CreateCoordinationIssueRequest): Promise<ProcoreCoordinationIssue> {
    try {
      const requestData = {
        ...issueData,
        project_id: projectId,
      }
      console.log('Creating Procore coordination issue with data:', JSON.stringify(requestData, null, 2))
      
      const response = await this.client.post('/rest/v1.0/coordination_issues', requestData)
      return response.data
    } catch (error) {
      console.error('Error creating Procore coordination issue:', error)
      if (error.response) {
        console.error('Procore API error response:', error.response.status, error.response.data)
      }
      throw new Error('Failed to create Procore coordination issue')
    }
  }

  async updateCoordinationIssue(projectId: string, issueId: string, issueData: UpdateCoordinationIssueRequest): Promise<ProcoreCoordinationIssue> {
    try {
      const response = await this.client.patch(`/rest/v1.0/coordination_issues/${issueId}`, {
        ...issueData,
        project_id: projectId,
      })
      return response.data
    } catch (error) {
      console.error('Error updating Procore coordination issue:', error)
      throw new Error('Failed to update Procore coordination issue')
    }
  }

  async getCoordinationIssueDetails(projectId: string, issueId: string): Promise<ProcoreCoordinationIssue> {
    try {
      const response = await this.client.get(`/rest/v1.0/coordination_issues/${issueId}`, {
        params: { project_id: projectId }
      })
      return response.data
    } catch (error) {
      console.error('Error fetching Procore coordination issue details:', error)
      throw new Error('Failed to fetch Procore coordination issue details')
    }
  }

  // Helper method to find user by email
  async findUserByEmail(projectId: string, email: string): Promise<ProcoreUser | null> {
    try {
      const users = await this.getProjectUsers(projectId)
      return users.find(user => user.email.toLowerCase() === email.toLowerCase()) || null
    } catch (error) {
      console.error('Error finding Procore user by email:', error)
      return null
    }
  }

  /**
   * Refresh the access token using the refresh token
   */
  async refreshAccessToken(): Promise<string> {
    if (!this.refreshToken || !this.clientId || !this.clientSecret) {
      throw new Error('No refresh token or credentials available')
    }

    try {
      const response = await axios.post(`${this.baseUrl}/oauth/token`, {
        grant_type: 'refresh_token',
        refresh_token: this.refreshToken,
        client_id: this.clientId,
        client_secret: this.clientSecret
      })

      const tokenData = response.data as any
      this.accessToken = tokenData.access_token
      this.refreshToken = tokenData.refresh_token || this.refreshToken
      
      // Update the default authorization header
      this.client.defaults.headers['Authorization'] = `Bearer ${this.accessToken}`
      
      // Note: We don't update the database here because this method is called
      // from the interceptor and we don't have access to the user ID or db instance.
      // The database will be updated when the user next authenticates.
      
      return this.accessToken
    } catch (error) {
      console.error('Error refreshing Procore token:', error)
      throw new Error('Failed to refresh access token')
    }
  }
}
