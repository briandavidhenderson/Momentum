// ============================================================================
// LAB POLL TYPES
// ============================================================================

/**
 * LabPollOption - Single option in a poll
 */
export interface LabPollOption {
  id: string
  text: string
}

/**
 * LabPollResponse - User's response to a poll
 */
export interface LabPollResponse {
  userId: string
  selectedOptionIds: string[] // Multiple options can be selected (for availability)
  respondedAt: string // ISO date string
}

/**
 * LabPoll - Poll for lab members
 */
export interface LabPoll {
  id: string
  question: string
  options: LabPollOption[]
  labId: string // Lab this poll is visible to
  createdBy: string // User ID who created the poll
  createdAt: string // ISO date string
  responses?: LabPollResponse[] // User responses to the poll
}
