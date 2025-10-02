import axios from 'axios'

export interface AccProject {
  id: string
  name: string
  description?: string
  status: string
}

export interface AccIssue {
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

export class AutodeskAccApi {
  private client: ReturnType<typeof axios.create>
  private accessToken: string
  private baseUrl: string
  private clientId?: string
  private clientSecret?: string
  private refreshToken?: string

  constructor(accessToken: string, baseUrl: string = 'https://developer.api.autodesk.com', clientId?: string, clientSecret?: string, refreshToken?: string) {
    this.accessToken = accessToken
    this.baseUrl = baseUrl
    this.clientId = clientId
    this.clientSecret = clientSecret
    this.refreshToken = refreshToken
    this.client = axios.create({
      baseURL: baseUrl,
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    })
  }

  // Method to refresh access token
  async refreshAccessToken(): Promise<string> {
    if (!this.clientId || !this.clientSecret || !this.refreshToken) {
      throw new Error('Missing credentials for token refresh')
    }

    try {
      const response = await axios.post(
        'https://developer.api.autodesk.com/authentication/v2/token',
        new URLSearchParams({
          grant_type: 'refresh_token',
          client_id: this.clientId,
          client_secret: this.clientSecret,
          refresh_token: this.refreshToken
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      )

      const { access_token, refresh_token, expires_in } = response.data as { access_token: string; refresh_token: string; expires_in: number }
      this.accessToken = access_token
      this.refreshToken = refresh_token
      
      // Update the client headers
      this.client.defaults.headers.common['Authorization'] = `Bearer ${access_token}`
      
      return access_token
    } catch (error) {
      console.error('Error refreshing ACC token:', error)
      throw new Error('Failed to refresh access token')
    }
  }

  async getProjects(): Promise<AccProject[]> {
    try {
      // First get hubs, then get projects from each hub
      const hubsResponse = await this.client.get('/project/v1/hubs')
      console.log('ACC Hubs Response:', JSON.stringify(hubsResponse.data, null, 2))
      
      // Check for warnings
      const hubsData = hubsResponse.data as any
      if (hubsData.meta?.warnings) {
        console.log('ACC Warnings:', JSON.stringify(hubsData.meta.warnings, null, 2))
      }
      
      const allProjects: AccProject[] = []
      
      // For each hub, get its projects
      for (const hub of hubsData.data || []) {
        try {
          const projectsResponse = await this.client.get(`/project/v1/hubs/${hub.id}/projects`)
          console.log(`Projects for hub ${hub.id}:`, projectsResponse.data)
          
          const projectsData = projectsResponse.data as any
          const projects = projectsData.data?.map((project: any) => ({
            id: project.id,
            name: project.attributes?.name || project.name,
            description: project.attributes?.description || project.description || '',
            status: project.attributes?.status || 'active'
          })) || []
          
          allProjects.push(...projects)
        } catch (hubError) {
          console.log(`Could not fetch projects for hub ${hub.id}:`, (hubError as any)?.response?.status)
          // Continue with other hubs
        }
      }
      
      return allProjects
    } catch (error) {
      console.error('Error fetching ACC projects:', error)
      throw new Error(`Failed to fetch ACC projects: ${error.response?.status || 'Unknown error'}`)
    }
  }

  async getProjectIssues(projectId: string, updatedSince?: string): Promise<AccIssue[]> {
    try {
      // Use Autodesk Forge Issues API
      const params: any = {}
      
      if (updatedSince) {
        params.filter = `updatedAt>${updatedSince}`
      }

      const response = await this.client.get(`/issues/v1/projects/${projectId}/issues`, { params })
      
      // Transform the response to match our interface
      const issuesData = response.data as any
      const issues = issuesData.data?.map((issue: any) => ({
        id: issue.id,
        title: issue.attributes?.title || issue.title,
        description: issue.attributes?.description || issue.description || '',
        status: issue.attributes?.status || issue.status || 'open',
        assignee: issue.attributes?.assignee ? {
          id: issue.attributes.assignee.id,
          email: issue.attributes.assignee.email,
          name: issue.attributes.assignee.name
        } : undefined,
        created_at: issue.attributes?.createdAt || issue.created_at,
        updated_at: issue.attributes?.updatedAt || issue.updated_at,
        project_id: projectId
      })) || []
      
      return issues
    } catch (error) {
      console.error('Error fetching ACC issues:', error)
      throw new Error('Failed to fetch ACC issues')
    }
  }

  async getIssueDetails(projectId: string, issueId: string): Promise<AccIssue> {
    try {
      const response = await this.client.get(`/issues/v1/projects/${projectId}/issues/${issueId}`)
      
      const issueData = response.data as any
      const issue = issueData.data
      return {
        id: issue.id,
        title: issue.attributes?.title || issue.title,
        description: issue.attributes?.description || issue.description || '',
        status: issue.attributes?.status || issue.status || 'open',
        assignee: issue.attributes?.assignee ? {
          id: issue.attributes.assignee.id,
          email: issue.attributes.assignee.email,
          name: issue.attributes.assignee.name
        } : undefined,
        created_at: issue.attributes?.createdAt || issue.created_at,
        updated_at: issue.attributes?.updatedAt || issue.updated_at,
        project_id: projectId
      }
    } catch (error) {
      console.error('Error fetching ACC issue details:', error)
      throw new Error('Failed to fetch ACC issue details')
    }
  }

  async createIssue(projectId: string, issueData: {
    title: string
    description: string
    status: string
    assignee_id?: string
  }): Promise<AccIssue> {
    try {
      const response = await this.client.post(`/issues/v1/projects/${projectId}/issues`, {
        data: {
          type: 'issues',
          attributes: {
            title: issueData.title,
            description: issueData.description,
            status: issueData.status,
            assignee: issueData.assignee_id ? { id: issueData.assignee_id } : undefined
          }
        }
      })
      
      const issueData = response.data as any
      const issue = issueData.data
      return {
        id: issue.id,
        title: issue.attributes?.title || issue.title,
        description: issue.attributes?.description || issue.description || '',
        status: issue.attributes?.status || issue.status || 'open',
        assignee: issue.attributes?.assignee ? {
          id: issue.attributes.assignee.id,
          email: issue.attributes.assignee.email,
          name: issue.attributes.assignee.name
        } : undefined,
        created_at: issue.attributes?.createdAt || issue.created_at,
        updated_at: issue.attributes?.updatedAt || issue.updated_at,
        project_id: projectId
      }
    } catch (error) {
      console.error('Error creating ACC issue:', error)
      throw new Error('Failed to create ACC issue')
    }
  }

  // Helper method to normalize ACC status to Procore status
  normalizeStatus(accStatus: string): string {
    const statusMap: Record<string, string> = {
      'open': 'Open',
      'in_progress': 'Open',
      'pending': 'Open',
      'closed': 'Resolved',
      'resolved': 'Resolved',
      'cancelled': 'Cancelled',
    }
    
    return statusMap[accStatus.toLowerCase()] || 'Open'
  }
}
