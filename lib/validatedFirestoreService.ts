/**
 * Validated Firestore Service Layer
 * Wraps firestoreService.ts with Zod validation and better error handling
 * Use these functions instead of the raw firestoreService functions
 */

import {
  createProject as _createProject,
  updateProject as _updateProject,
  createProfile as _createProfile,
  updateProfile as _updateProfile,
  createWorkpackage as _createWorkpackage,
  createEvent as _createEvent,
  updateEvent as _updateEvent,
  createOrder as _createOrder,
  createInventoryItem as _createInventoryItem,
  updateInventoryItem as _updateInventoryItem,
  createEquipment as _createEquipment,
  updateEquipment as _updateEquipment,
} from "./firestoreService"
import {
  createProjectInputSchema,
  updateProjectInputSchema,
  createPersonProfileInputSchema,
  updatePersonProfileInputSchema,
  workpackageSchema,
  createEventInputSchema,
  updateEventInputSchema,
  createOrderInputSchema,
  createInventoryItemInputSchema,
  updateInventoryItemInputSchema,
  createEquipmentInputSchema,
  updateEquipmentInputSchema,
} from "./validationSchemas"
import type { Project, PersonProfile, Workpackage, CalendarEvent, Order, InventoryItem, EquipmentDevice } from "./types"
import { ZodError } from "zod"

// ============================================================================
// ERROR HANDLING
// ============================================================================

export class ValidationError extends Error {
  constructor(message: string, public errors: ZodError) {
    super(message)
    this.name = "ValidationError"
  }
}

export class FirestoreServiceError extends Error {
  constructor(message: string, public originalError?: any) {
    super(message)
    this.name = "FirestoreServiceError"
  }
}

// ============================================================================
// PROJECTS
// ============================================================================

/**
 * Create a project with validation
 * @throws {ValidationError} if validation fails
 * @throws {FirestoreServiceError} if Firestore operation fails
 */
export async function createProject(
  projectData: Omit<Project, "id">
): Promise<string> {
  try {
    const validated = createProjectInputSchema.parse(projectData)
    return await _createProject(validated as any)
  } catch (error) {
    if (error instanceof ZodError) {
      throw new ValidationError("Project validation failed", error)
    }
    throw new FirestoreServiceError("Failed to create project", error)
  }
}

/**
 * Update a project with validation
 * @throws {ValidationError} if validation fails
 * @throws {FirestoreServiceError} if Firestore operation fails
 */
export async function updateProject(
  projectId: string,
  updates: Partial<Project>
): Promise<void> {
  try {
    const validated = updateProjectInputSchema.partial().parse({
      ...updates,
      id: projectId,
    })
    const { id, ...updateData } = validated
    await _updateProject(projectId, updateData as any)
  } catch (error) {
    if (error instanceof ZodError) {
      throw new ValidationError("Project update validation failed", error)
    }
    throw new FirestoreServiceError("Failed to update project", error)
  }
}

// ============================================================================
// PERSON PROFILES
// ============================================================================

/**
 * Create a person profile with validation
 * @throws {ValidationError} if validation fails
 * @throws {FirestoreServiceError} if Firestore operation fails
 */
export async function createProfile(
  userId: string,
  profileData: Omit<PersonProfile, "id">
): Promise<string> {
  try {
    const validated = createPersonProfileInputSchema.parse(profileData)
    return await _createProfile(userId, validated as any)
  } catch (error) {
    if (error instanceof ZodError) {
      throw new ValidationError("Profile validation failed", error)
    }
    throw new FirestoreServiceError("Failed to create profile", error)
  }
}

/**
 * Update a person profile with validation
 * @throws {ValidationError} if validation fails
 * @throws {FirestoreServiceError} if Firestore operation fails
 */
export async function updateProfile(
  profileId: string,
  updates: Partial<PersonProfile>
): Promise<void> {
  try {
    const validated = updatePersonProfileInputSchema.partial().parse({
      ...updates,
      id: profileId,
    })
    const { id, ...updateData } = validated
    await _updateProfile(profileId, updateData as any)
  } catch (error) {
    if (error instanceof ZodError) {
      throw new ValidationError("Profile update validation failed", error)
    }
    throw new FirestoreServiceError("Failed to update profile", error)
  }
}

// ============================================================================
// WORKPACKAGES
// ============================================================================

/**
 * Create a workpackage with validation
 * @throws {ValidationError} if validation fails
 * @throws {FirestoreServiceError} if Firestore operation fails
 */
export async function createWorkpackage(
  workpackageData: Omit<Workpackage, "id">
): Promise<string> {
  try {
    const validated = workpackageSchema.omit({ id: true }).parse(workpackageData)
    return await _createWorkpackage(validated as any)
  } catch (error) {
    if (error instanceof ZodError) {
      throw new ValidationError("Workpackage validation failed", error)
    }
    throw new FirestoreServiceError("Failed to create workpackage", error)
  }
}

// ============================================================================
// CALENDAR EVENTS
// ============================================================================

/**
 * Create a calendar event with validation
 * @throws {ValidationError} if validation fails
 * @throws {FirestoreServiceError} if Firestore operation fails
 */
export async function createEvent(
  eventData: Omit<CalendarEvent, "id" | "createdAt">
): Promise<string> {
  try {
    const validated = createEventInputSchema.parse(eventData)
    return await _createEvent(validated as any)
  } catch (error) {
    if (error instanceof ZodError) {
      throw new ValidationError("Event validation failed", error)
    }
    throw new FirestoreServiceError("Failed to create event", error)
  }
}

/**
 * Update a calendar event with validation
 * @throws {ValidationError} if validation fails
 * @throws {FirestoreServiceError} if Firestore operation fails
 */
export async function updateEvent(
  eventId: string,
  updates: Partial<CalendarEvent>
): Promise<void> {
  try {
    const validated = updateEventInputSchema.partial().parse({
      ...updates,
      id: eventId,
    })
    const { id, ...updateData } = validated
    await _updateEvent(eventId, updateData as any)
  } catch (error) {
    if (error instanceof ZodError) {
      throw new ValidationError("Event update validation failed", error)
    }
    throw new FirestoreServiceError("Failed to update event", error)
  }
}

// ============================================================================
// ORDERS
// ============================================================================

/**
 * Create an order with validation
 * @throws {ValidationError} if validation fails
 * @throws {FirestoreServiceError} if Firestore operation fails
 */
export async function createOrder(orderData: Omit<Order, "id">): Promise<string> {
  try {
    const validated = createOrderInputSchema.parse(orderData)
    return await _createOrder(validated as any)
  } catch (error) {
    if (error instanceof ZodError) {
      throw new ValidationError("Order validation failed", error)
    }
    throw new FirestoreServiceError("Failed to create order", error)
  }
}

// ============================================================================
// INVENTORY
// ============================================================================

/**
 * Create an inventory item with validation
 * @throws {ValidationError} if validation fails
 * @throws {FirestoreServiceError} if Firestore operation fails
 */
export async function createInventoryItem(
  itemData: Omit<InventoryItem, "id">
): Promise<string> {
  try {
    const validated = createInventoryItemInputSchema.parse(itemData)
    return await _createInventoryItem(validated as any)
  } catch (error) {
    if (error instanceof ZodError) {
      throw new ValidationError("Inventory item validation failed", error)
    }
    throw new FirestoreServiceError("Failed to create inventory item", error)
  }
}

/**
 * Update an inventory item with validation
 * @throws {ValidationError} if validation fails
 * @throws {FirestoreServiceError} if Firestore operation fails
 */
export async function updateInventoryItem(
  itemId: string,
  updates: Partial<InventoryItem>
): Promise<void> {
  try {
    const validated = updateInventoryItemInputSchema.partial().parse({
      ...updates,
      id: itemId,
    })
    const { id, ...updateData } = validated
    await _updateInventoryItem(itemId, updateData as any)
  } catch (error) {
    if (error instanceof ZodError) {
      throw new ValidationError("Inventory item update validation failed", error)
    }
    throw new FirestoreServiceError("Failed to update inventory item", error)
  }
}

// ============================================================================
// EQUIPMENT
// ============================================================================

/**
 * Create equipment with validation
 * @throws {ValidationError} if validation fails
 * @throws {FirestoreServiceError} if Firestore operation fails
 */
export async function createEquipment(
  equipmentData: Omit<EquipmentDevice, "id" | "createdAt">
): Promise<string> {
  try {
    const validated = createEquipmentInputSchema.parse(equipmentData)
    return await _createEquipment(validated as any)
  } catch (error) {
    if (error instanceof ZodError) {
      throw new ValidationError("Equipment validation failed", error)
    }
    throw new FirestoreServiceError("Failed to create equipment", error)
  }
}

/**
 * Update equipment with validation
 * @throws {ValidationError} if validation fails
 * @throws {FirestoreServiceError} if Firestore operation fails
 */
export async function updateEquipment(
  equipmentId: string,
  updates: Partial<EquipmentDevice>
): Promise<void> {
  try {
    const validated = updateEquipmentInputSchema.partial().parse({
      ...updates,
      id: equipmentId,
    })
    const { id, ...updateData} = validated
    await _updateEquipment(equipmentId, updateData as any)
  } catch (error) {
    if (error instanceof ZodError) {
      throw new ValidationError("Equipment update validation failed", error)
    }
    throw new FirestoreServiceError("Failed to update equipment", error)
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Format validation errors into user-friendly messages
 */
export function formatValidationErrors(error: ZodError): string[] {
  return error.errors.map((err) => {
    const path = err.path.join(".")
    return `${path}: ${err.message}`
  })
}

/**
 * Check if an error is a validation error
 */
export function isValidationError(error: any): error is ValidationError {
  return error instanceof ValidationError
}

/**
 * Check if an error is a Firestore service error
 */
export function isFirestoreServiceError(error: any): error is FirestoreServiceError {
  return error instanceof FirestoreServiceError
}
