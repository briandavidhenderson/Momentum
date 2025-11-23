/**
 * Network Types
 * 
 * These types support the "multidimensional network" graph structure,
 * allowing for many-to-many memberships and complex supervision relationships.
 */

/**
 * Membership - Represents a link between a person and a group/entity
 * Normalizes many-to-many relationships (e.g., Person <-> ResearchGroup)
 */
export interface Membership {
  id: string
  memberId: string // PersonProfile ID
  entityId: string // ID of ResearchGroup, Institute, Lab, Committee, etc.
  entityType: "research-group" | "institute" | "lab" | "committee" | "department" | "faculty"
  role?: string // e.g., "member", "lead", "admin", "chair"
  isExternal?: boolean // If affiliation is outside home organisation
  
  // Metadata
  createdAt: string
  updatedAt?: string
  createdBy?: string
}

/**
 * Supervision - Represents a supervision relationship between two people
 * Captures primary PI, secondary PI, mentorship, etc.
 */
export interface Supervision {
  id: string
  supervisorId: string // PersonProfile ID (PI/Mentor)
  superviseeId: string // PersonProfile ID (Student/Postdoc)
  relationshipType: "primary-pi" | "secondary-pi" | "mentor" | "project-supervisor" | "line-manager"

  // Metadata
  startDate?: string
  endDate?: string
  active: boolean
  createdAt: string
  updatedAt?: string
}

/**
 * ResearchGroup - Moved to researchgroup.types.ts
 * This was a legacy simple version. Use the comprehensive one from researchgroup.types.ts instead.
 */
// export interface ResearchGroup {
//   id: string
//   name: string
//   organisationId: string
//   leadId?: string // PersonProfile ID of group leader
//   description?: string
//
//   // Metadata
//   createdAt: string
//   updatedAt?: string
// }

/**
 * Faculty - Represents a faculty within an organisation
 */
export interface Faculty {
  id: string
  name: string
  organisationId: string
  description?: string

  // Metadata
  createdAt: string
  updatedAt?: string
}

/**
 * Department - Represents a department within a faculty
 */
export interface Department {
  id: string
  name: string
  facultyId: string
  headId?: string // PersonProfile ID of department head
  description?: string

  // Metadata
  createdAt: string
  updatedAt?: string
}
