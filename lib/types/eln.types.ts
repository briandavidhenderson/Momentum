// ============================================================================
// ELECTRONIC LAB NOTEBOOK (ELN) TYPES
// ============================================================================

import type { ELNItemType } from './common.types'

/**
 * ELNStickyNote - Sticky note annotation on an image
 */
export interface ELNStickyNote {
  id: string
  text: string
  color: string // Hex color for the sticky note
  position: { x: number; y: number } // Position on image (percentage or pixels)
  createdAt: string // ISO date string
}

/**
 * ELNVoiceNote - Voice recording with optional transcript
 */
export interface ELNVoiceNote {
  id: string
  audioUrl: string // Data URL or blob URL
  duration: number // Duration in seconds
  createdAt: string // ISO date string
  transcript?: string // AI-generated transcript
}

/**
 * ELNItem - Unified multimodal item (image, voice, document, data, etc.)
 */
export interface ELNItem {
  id: string
  type: ELNItemType
  title?: string
  description?: string

  // File data
  fileUrl?: string // Download URL from Firebase Storage
  storagePath?: string // Firebase Storage path for deletion
  fileName?: string
  fileType?: string // MIME type
  fileSize?: number

  // Metadata
  position?: { x: number; y: number } // For canvas positioning
  order: number // Display order

  // AI Extraction
  aiExtraction?: {
    status: "pending" | "processing" | "completed" | "failed"
    extractedText?: string
    structuredData?: Record<string, any>
    entities?: Array<{ type: string; value: string; confidence?: number }>
    summary?: string
    errorMessage?: string
  }

  // Voice-specific
  duration?: number

  // Resource Links (NEW - for integrated research environment)
  linkedResources?: {
    equipmentIds?: string[]        // Equipment used in this cell
    inventoryIds?: string[]         // Inventory items referenced
    whiteboardIds?: string[]        // Related whiteboards
    researchPinIds?: string[]       // Research board topics
    bookingIds?: string[]           // Equipment bookings
    protocolIds?: string[]          // Standard protocols
  }
}

/**
 * ELNPage - Legacy page-based format
 */
export interface ELNPage {
  id: string
  title: string
  imageUrl: string // Data URL or blob URL of the image
  voiceNotes: ELNVoiceNote[]
  stickyNotes: ELNStickyNote[]
  createdAt: string // ISO date string
  updatedAt?: string // ISO date string
}

/**
 * ELNReport - Experiment report (AI-generated or user-written)
 */
export interface ELNReport {
  id: string
  experimentId: string

  // Report content
  background?: string // AI-generated or user-written
  protocols?: string // Extracted protocols
  results?: string // Extracted results/findings
  conclusion?: string

  // Metadata
  generatedAt: string
  generatedBy?: string // "ai" or PersonProfile ID
  version: number

  // Source tracking
  sourceItemIds: string[] // Which items were used to generate this
}

import { VisibilitySettings } from './visibility.types';

/**
 * ELNExperiment - Electronic Lab Notebook experiment
 * UPDATED: Now supports multimodal canvas with items and AI report generation
 */
export interface ELNExperiment extends VisibilitySettings {
  id: string
  title: string
  description?: string

  // Project Linking (NEW)
  masterProjectId: string         // ✅ REQUIRED: Which project this experiment belongs to
  masterProjectName: string       // Cached

  // Matrix Structure
  groupId?: string                // Deprecated: Use sharedWithGroups


  workpackageId?: string          // Optional: specific work package
  taskId?: string                 // Optional: specific task

  // Organizational Context (for filtering)
  labId: string                   // Lab this experiment belongs to
  labName: string                 // Cached
  funderId?: string               // Cached from project
  funderName?: string             // Cached

  // Content - New multimodal system
  items: ELNItem[]                // Unified multimodal items (images, voice, docs, data, etc.)

  // Legacy support (for backward compatibility)
  pages: ELNPage[]

  // Reports
  reports?: ELNReport[]           // Generated experiment reports

  // Authorship
  createdBy: string // PersonProfile ID who created the experiment
  collaborators?: string[]  // Deprecated: Use sharedWithUsers

  // Metadata
  experimentNumber?: string  // e.g., "EXP-2025-001"
  tags?: string[]
  status?: "draft" | "in-progress" | "completed" | "archived"
  createdAt: string // ISO date string
  updatedAt?: string // ISO date string

  // GDPR Special Category Data (NEW)
  containsSpecialCategoryData?: boolean  // GDPR Article 9 marker
  specialCategoryDataTypes?: Array<"health" | "genetic" | "biometric" | "patient_derived" | "clinical" | "other">
  specialCategoryDataAcknowledged?: boolean // User acknowledged legal basis
  specialCategoryDataAcknowledgedBy?: string // User ID who acknowledged
  specialCategoryDataAcknowledgedAt?: string // When acknowledged

  // Experiment Resources (NEW - integrated research environment)
  equipmentUsed?: Array<{
    equipmentId: string
    equipmentName: string
    bookingId?: string
    usageNotes?: string
    dateUsed?: string
  }>

  consumedInventory?: Array<{
    inventoryId: string
    itemName: string
    quantityUsed: number
    unit: string
    batchNumber?: string
    dateUsed?: string
    deducted?: boolean
  }>

  samplesUsed?: Array<{
    sampleId: string
    sampleName: string
    quantityUsed?: number
    unit?: string
  }>

  protocolsUsed?: Array<{
    protocolId: string
    protocolName: string
    version?: string
  }>

  relatedWhiteboards?: string[]      // Whiteboard IDs
  researchTopics?: string[]          // Research board pin IDs
}
