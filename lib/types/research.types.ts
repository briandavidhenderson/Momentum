// ============================================================================
// RESEARCH BOARD TYPES
// ============================================================================

/**
 * Types for the Research Board feature - a Pinterest-style research sharing platform
 */

/**
 * Type of research pin content
 */
export type ResearchPinType = 'paper' | 'figure' | 'video' | 'course' | 'note';

/**
 * Visibility of the research pin
 */
export type ResearchPinVisibility = 'private' | 'lab' | 'public';

/**
 * Author information for a research pin
 */
export interface ResearchPinAuthor {
  userId: string;
  name: string;
  avatar?: string;
}

/**
 * Research Pin - represents a single item on the research board
 */
export interface ResearchPin {
  id: string;
  boardId?: string; // Optional for backward compatibility, but new pins should have it
  type: ResearchPinType;
  title?: string;
  content?: string;
  url?: string; // For YouTube links, external papers, etc.

  // File attachments
  imageUrl?: string; // For figures
  fileUrl?: string; // For PDFs
  storagePath?: string; // Firebase Storage path
  pdfText?: string; // Extracted PDF text for AI analysis

  // Metadata
  author: ResearchPinAuthor;
  labId: string;
  tags: string[];
  visibility?: ResearchPinVisibility; // Access control for pin visibility

  // AI analysis
  aiAnalysis?: string; // Detailed analysis
  aiSummary?: string; // Brief summary

  // Status
  isThinking?: boolean; // Visual state for AI processing
  isPrivate?: boolean; // Default false (lab-wide), true for private pins

  // Social features
  likes?: string[]; // Array of user IDs who liked
  comments?: ResearchPinComment[];

  // Timestamps
  createdAt: Date;
  updatedAt?: Date;
}

/**
 * Comment on a research pin
 */
export interface ResearchPinComment {
  id: string;
  author: ResearchPinAuthor;
  content: string;
  createdAt: Date;
}

/**
 * Create research pin input (without id and timestamps)
 */
export type CreateResearchPinInput = Omit<ResearchPin, 'id' | 'createdAt' | 'updatedAt'>;

/**
 * Update research pin input (partial, without id and timestamps)
 */
export type UpdateResearchPinInput = Partial<Omit<ResearchPin, 'id' | 'createdAt' | 'author' | 'labId'>>;

/**
 * Research Board - A collection of pins around a specific topic
 */
export interface ResearchBoard {
  id: string;
  title: string;
  description?: string;

  // Ownership/Access
  creatorId: string;
  labId: string; // The lab this board belongs to (for billing/org purposes)
  members: string[]; // User IDs who can access/contribute

  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Message in a Research Board chat
 */
export interface BoardMessage {
  id: string;
  boardId: string;
  content: string;
  author: ResearchPinAuthor;

  // Context
  mentionedPinIds?: string[]; // IDs of pins referenced in this message
  mentionedUserIds?: string[]; // IDs of users mentioned

  createdAt: Date;
}

/**
 * Create Research Board Input
 */
export type CreateResearchBoardInput = Omit<ResearchBoard, 'id' | 'createdAt' | 'updatedAt'>;

/**
 * Update Research Board Input
 */
export type UpdateResearchBoardInput = Partial<Omit<ResearchBoard, 'id' | 'createdAt' | 'creatorId' | 'labId'>>;
