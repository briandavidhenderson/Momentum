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
export type CreateResearchPinInput = Omit<ResearchPin, 'id' | 'createdAt' | 'updatedAt' | 'isThinking'>;

/**
 * Update research pin input (partial, without id and timestamps)
 */
export type UpdateResearchPinInput = Partial<Omit<ResearchPin, 'id' | 'createdAt' | 'author' | 'labId'>>;


