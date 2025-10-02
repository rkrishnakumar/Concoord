import { db } from './db'
import { AutodeskAccApi, AccIssue } from './autodesk-acc'
import { ProcoreApi, CreateCoordinationIssueRequest, UpdateCoordinationIssueRequest } from './procore-api'

export interface SyncResult {
  success: boolean
  issuesProcessed: number
  issuesCreated: number
  issuesUpdated: number
  errors: string[]
}

export class SyncService {
  private accApi: AutodeskAccApi
  private procoreApi: ProcoreApi
  private projectMappingId: string

  constructor(
    accAccessToken: string,
    procoreAccessToken: string,
    projectMappingId: string,
    accBaseUrl?: string,
    procoreBaseUrl?: string,
    accClientId?: string,
    accClientSecret?: string,
    accRefreshToken?: string
  ) {
    this.accApi = new AutodeskAccApi(accAccessToken, accBaseUrl, accClientId, accClientSecret, accRefreshToken || undefined)
    this.procoreApi = new ProcoreApi(procoreAccessToken, procoreBaseUrl)
    this.projectMappingId = projectMappingId
  }

  async syncIssues(lastSyncTime?: Date): Promise<SyncResult> {
    const result: SyncResult = {
      success: true,
      issuesProcessed: 0,
      issuesCreated: 0,
      issuesUpdated: 0,
      errors: []
    }

    try {
      // Get project mapping details
      const projectMapping = await db.projectMapping.findUnique({
        where: { id: this.projectMappingId },
        include: { issueCrosswalks: true }
      })

      if (!projectMapping) {
        throw new Error('Project mapping not found')
      }

      // Get ACC issues updated since last sync
      const updatedSince = lastSyncTime?.toISOString()
      const accIssues = await this.accApi.getProjectIssues(
        projectMapping.accProjectId,
        updatedSince
      )

      result.issuesProcessed = accIssues.length

      // Process each ACC issue
      for (const accIssue of accIssues) {
        try {
          await this.processAccIssue(accIssue, projectMapping, result)
        } catch (error) {
          const errorMsg = `Error processing ACC issue ${accIssue.id}: ${error instanceof Error ? error.message : 'Unknown error'}`
          result.errors.push(errorMsg)
          console.error(errorMsg, error)
        }
      }

      // Update last sync time
      await db.projectMapping.update({
        where: { id: this.projectMappingId },
        data: { updatedAt: new Date() }
      })

      // Log sync result
      await db.syncLog.create({
        data: {
          userId: projectMapping.userId,
          projectMappingId: this.projectMappingId,
          syncType: lastSyncTime ? 'incremental' : 'full',
          status: result.errors.length > 0 ? 'partial' : 'success',
          issuesProcessed: result.issuesProcessed,
          issuesCreated: result.issuesCreated,
          issuesUpdated: result.issuesUpdated,
          errors: result.errors.length > 0 ? result.errors : null,
          completedAt: new Date()
        }
      })

    } catch (error) {
      result.success = false
      result.errors.push(`Sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
      console.error('Sync failed:', error)
    }

    return result
  }

  private async processAccIssue(
    accIssue: AccIssue,
    projectMapping: any,
    result: SyncResult
  ): Promise<void> {
    // Check if issue already exists in crosswalk
    const existingCrosswalk = projectMapping.issueCrosswalks.find(
      (crosswalk: any) => crosswalk.accIssueId === accIssue.id
    )

    if (existingCrosswalk) {
      // Update existing Procore issue
      await this.updateProcoreIssue(accIssue, existingCrosswalk.procoreIssueId, result)
    } else {
      // Create new Procore issue
      await this.createProcoreIssue(accIssue, projectMapping, result)
    }
  }

  private async createProcoreIssue(
    accIssue: AccIssue,
    projectMapping: any,
    result: SyncResult
  ): Promise<void> {
    // Find assignee in Procore if ACC issue has assignee
    let procoreAssigneeId: string | undefined
    if (accIssue.assignee?.email) {
      const procoreUser = await this.procoreApi.findUserByEmail(
        projectMapping.procoreProjectId,
        accIssue.assignee.email
      )
      if (procoreUser) {
        procoreAssigneeId = procoreUser.id
      }
    }

    // Create Procore coordination issue
    const createRequest: CreateCoordinationIssueRequest = {
      title: accIssue.title,
      description: accIssue.description,
      status: this.accApi.normalizeStatus(accIssue.status),
      assignee_id: procoreAssigneeId,
      project_id: projectMapping.procoreProjectId
    }

    const procoreIssue = await this.procoreApi.createCoordinationIssue(
      projectMapping.procoreProjectId,
      createRequest
    )

    // Create crosswalk entry
    await db.issueCrosswalk.create({
      data: {
        projectMappingId: this.projectMappingId,
        accIssueId: accIssue.id,
        procoreIssueId: procoreIssue.id,
        lastSyncedAt: new Date()
      }
    })

    result.issuesCreated++
  }

  private async updateProcoreIssue(
    accIssue: AccIssue,
    procoreIssueId: string,
    result: SyncResult
  ): Promise<void> {
    // Find assignee in Procore if ACC issue has assignee
    let procoreAssigneeId: string | undefined
    if (accIssue.assignee?.email) {
      const projectMapping = await db.projectMapping.findUnique({
        where: { id: this.projectMappingId }
      })
      
      if (projectMapping) {
        const procoreUser = await this.procoreApi.findUserByEmail(
          projectMapping.procoreProjectId,
          accIssue.assignee.email
        )
        if (procoreUser) {
          procoreAssigneeId = procoreUser.id
        }
      }
    }

    // Update Procore coordination issue
    const updateRequest: UpdateCoordinationIssueRequest = {
      title: accIssue.title,
      description: accIssue.description,
      status: this.accApi.normalizeStatus(accIssue.status),
      assignee_id: procoreAssigneeId
    }

    const projectMapping = await db.projectMapping.findUnique({
      where: { id: this.projectMappingId }
    })

    if (projectMapping) {
      await this.procoreApi.updateCoordinationIssue(
        projectMapping.procoreProjectId,
        procoreIssueId,
        updateRequest
      )

      // Update crosswalk last synced time
      await db.issueCrosswalk.update({
        where: {
          projectMappingId_accIssueId: {
            projectMappingId: this.projectMappingId,
            accIssueId: accIssue.id
          }
        },
        data: {
          lastSyncedAt: new Date()
        }
      })

      result.issuesUpdated++
    }
  }
}
