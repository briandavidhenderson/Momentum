/**
 * Barrel export for all type modules
 * Simplifies imports: import { PersonProfile, MasterProject } from '@/lib/types'
 */

// Common types
export * from './common.types'

// ORCID integration
export * from './orcid.types'

// User & Authentication
export * from './user.types'

// Organization & Structure
export * from './organization.types'
export * from './researchgroup.types'  // Research groups - planned feature (users can join groups)
export * from './network.types'       // Network types for memberships and supervisions

// Profile & People
export * from './profile.types'

// Funding
export * from './funding.types'

// Projects & Workpackages
export * from './project.types'
export * from './workpackage.types'
export * from './deliverable.types'
export * from './task.types'
export * from './protocol.types'
export * from './protocolExecution.types'
export * from './task.types'
export * from './hydrated.types'
export * from './projectSnapshot'

// Lab Operations
export * from './order.types'
export * from './inventory.types'
export * from './equipment.types'
export * from './booking.types'
export * from './poll.types'

// Research Board
export * from './research.types'

// Electronic Lab Notebook
export * from './eln.types'

// Calendar & Events
export * from './calendar.types'

// Compliance & Audit
export * from './audit.types'
export * from './privacy.types'
export * from './ai.types'

// Comments
export * from './comment.types'

// Visibility
export * from './visibility.types'

// Training
export * from './training.types'

// Safety
export * from './safety.types'

// Notifications
export * from './notification.types'
