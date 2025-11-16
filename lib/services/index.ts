/**
 * Barrel export for all service modules
 * Simplifies imports: import { createProfile, createProject } from '@/lib/services'
 */

// User & Authentication
export * from './userService'

// Profile Management
export * from './profileService'

// Organization Hierarchy
export * from './organizationService'

// Funding
export * from './fundingService'

// Projects & Workpackages
export * from './projectService'
export * from './workpackageService'

// Tasks
export * from './taskService'

// Lab Operations
export * from './orderService'
export * from './inventoryService'
export * from './equipmentService'
export * from './pollService'

// Electronic Lab Notebook
export * from './elnService'

// Calendar & Events
export * from './calendarService'

// Audit & Compliance
export * from './auditService'

// Utilities
export * from './deleteService'
