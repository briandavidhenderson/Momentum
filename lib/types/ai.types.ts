// ============================================================================
// AI & SPECIAL CATEGORY DATA TYPES (EU AI Act & GDPR Article 9)
// ============================================================================

import type { LawfulBasis } from './privacy.types'

/**
 * AIGeneratedContent - Tracks AI-generated content for compliance
 * Implements EU AI Act transparency requirements
 */
export interface AIGeneratedContent {
  id: string

  // Source
  entityType: "eln_report" | "experiment_summary" | "task_suggestion" | "protocol_extraction"
  entityId: string                // ID of the entity (e.g., ELNReport ID)

  // AI details
  modelName: string               // e.g., "gpt-4", "claude-3"
  modelVersion?: string
  promptHash: string              // SHA-256 hash of prompt (for audit without storing full prompt)
  generatedAt: string
  generatedBy: string             // User ID who triggered generation

  // Content
  generatedText?: string          // The AI-generated content
  confidence?: number             // Confidence score if available (0-1)

  // User interaction
  userEdited: boolean             // Whether user edited the AI content
  userApproved: boolean           // Whether user explicitly approved it
  userFeedback?: "helpful" | "not_helpful" | "inaccurate"

  // Compliance
  disclaimerShown: boolean        // Whether AI disclaimer was shown to user
  userOverrideAllowed: boolean    // Whether user can edit/override

  // Metadata
  metadata?: Record<string, any>
  createdAt: string
}

/**
 * SpecialCategoryDataMarker - GDPR Article 9 special category data tracking
 * Tracks when ELN experiments contain special category data
 * (health data, genetic data, biometric data, etc.)
 */
export interface SpecialCategoryDataMarker {
  id: string
  entityType: "eln_experiment" | "eln_item" | "order" | "project"
  entityId: string

  // Special category type
  dataCategory:
    | "health"          // Health/medical data
    | "genetic"         // Genetic data
    | "biometric"       // Biometric data
    | "patient_derived" // Patient-derived samples
    | "clinical"        // Clinical trial data
    | "other"

  // Legal basis
  lawfulBasis: LawfulBasis        // GDPR Article 6 basis
  specialCategoryBasis?: string   // Article 9.2 exception (e.g., "explicit_consent", "scientific_research")

  // User acknowledgment
  acknowledgedBy: string          // User ID who acknowledged
  acknowledgedAt: string
  legalBasisConfirmed: boolean    // User confirmed they have legal basis

  // DPIA (Data Protection Impact Assessment)
  dpiaRequired: boolean
  dpiaReference?: string          // Reference to DPIA document

  // Metadata
  notes?: string
  createdAt: string
}
