// ============================================================================
// COMMENT TYPES
// ============================================================================

/**
 * Comment - User comments on projects, workpackages, tasks, orders, etc.
 * Supports threaded conversations and @mentions
 */
export interface Comment {
  id: string

  // Entity being commented on
  entityType: "project" | "workpackage" | "task" | "dayToDayTask" | "order" | "eln_experiment" | "equipment"
  entityId: string

  // Comment content
  content: string              // The comment text (supports markdown)
  mentions?: string[]          // Array of PersonProfile IDs mentioned (e.g., @username)

  // Threading
  parentCommentId?: string     // For threaded replies
  threadDepth: number          // 0 for top-level, 1+ for replies

  // Author
  authorId: string             // PersonProfile ID
  authorName: string           // Cached for display

  // Metadata
  createdAt: string
  updatedAt?: string
  editedAt?: string            // When comment was last edited
  isEdited: boolean            // Flag to show "edited" indicator

  // Reactions (optional future enhancement)
  reactions?: {
    [emoji: string]: string[]  // emoji -> array of PersonProfile IDs who reacted
  }

  // Moderation
  isDeleted: boolean           // Soft delete
  deletedAt?: string
  deletedBy?: string           // User who deleted it
}
