/**
 * Zod validation schemas for all data types
 * Provides runtime type checking and validation for user inputs and API data
 */

import { z } from "zod"
import {
  WORK_STATUS,
  PROJECT_STATUS,
  WORKPACKAGE_STATUS,
  IMPORTANCE_LEVEL,
  PROJECT_KIND,
  PROJECT_VISIBILITY,
  EVENT_VISIBILITY,
  ORDER_STATUS,
  INVENTORY_LEVEL,
  DAY_TO_DAY_STATUS,
  TASK_TYPE,
  EVENT_TYPE,
  RECURRENCE_FREQUENCY,
  REMINDER_METHOD,
  AUDIT_ENTITY_TYPE,
  AUDIT_CHANGE_TYPE,
  OAUTH_PROVIDER,
  DELIVERABLE_LINK_PROVIDER,
  ATTENDEE_RESPONSE,
  PROJECT_HEALTH,
  VALIDATION_LIMITS,
} from "./constants"

// ============================================================================
// BASE SCHEMAS
// ============================================================================

const emailSchema = z.string().email(). max(VALIDATION_LIMITS.EMAIL_MAX)
const urlSchema = z.string().url().max(VALIDATION_LIMITS.URL_MAX)
const dateSchema = z.union([z.date(), z.string().datetime()])
const progressSchema = z.number().min(VALIDATION_LIMITS.PROGRESS_MIN).max(VALIDATION_LIMITS.PROGRESS_MAX)
const priceSchema = z.number().min(VALIDATION_LIMITS.PRICE_MIN).max(VALIDATION_LIMITS.PRICE_MAX)
const idSchema = z.string().min(1)

// ============================================================================
// PERSON & USER SCHEMAS
// ============================================================================

export const personProfileSchema = z.object({
  id: idSchema.optional(),
  firstName: z.string().min(VALIDATION_LIMITS.PERSON_NAME_MIN).max(VALIDATION_LIMITS.PERSON_NAME_MAX),
  lastName: z.string().min(VALIDATION_LIMITS.PERSON_NAME_MIN).max(VALIDATION_LIMITS.PERSON_NAME_MAX),
  email: emailSchema,
  position: z.string().min(1).max(100),
  organisation: z.string().min(1).max(200),
  institute: z.string().min(1).max(200),
  lab: z.string().min(1).max(200),
  reportsTo: idSchema.nullable(),
  fundedBy: z.array(idSchema),
  startDate: z.string(),
  phone: z.string().max(VALIDATION_LIMITS.PHONE_MAX),
  officeLocation: z.string().max(200),
  researchInterests: z.array(z.string()),
  qualifications: z.array(z.string()),
  notes: z.string().max(VALIDATION_LIMITS.NOTES_MAX),
  projects: z.array(z.any()), // ProfileProject[]
  principalInvestigatorProjects: z.array(idSchema),
  userId: idSchema.optional(),
  profileComplete: z.boolean().optional(),
  isAdministrator: z.boolean().optional(),
})

export const userSchema = z.object({
  id: idSchema.optional(),
  email: emailSchema,
  fullName: z.string().min(1).max(200),
  passwordHash: z.string().optional(), // Should be hashed server-side
  profileId: idSchema.nullable(),
  createdAt: z.string(),
  isAdministrator: z.boolean().optional(),
  lastLoginAt: z.string().optional(),
  oauthProviders: z.array(z.enum([OAUTH_PROVIDER.GOOGLE, OAUTH_PROVIDER.MICROSOFT])).optional(),
})

export const personSchema = z.object({
  id: idSchema,
  name: z.string().min(1).max(200),
  color: z.string(),
  avatarUrl: z.string().optional(),
  roleId: idSchema.optional(),
})

// ============================================================================
// PROJECT & TASK SCHEMAS
// ============================================================================

export const deliverableLinkSchema = z.object({
  id: idSchema,
  provider: z.enum([
    DELIVERABLE_LINK_PROVIDER.GOOGLE_DRIVE,
    DELIVERABLE_LINK_PROVIDER.ONEDRIVE,
    DELIVERABLE_LINK_PROVIDER.URL,
  ]),
  title: z.string().min(1).max(200),
  targetUrl: urlSchema,
  lastChecked: z.string().optional(),
  iconOverride: z.string().optional(),
})

export const deliverableReviewSchema = z.object({
  id: idSchema,
  reviewerId: idSchema,
  reviewedAt: z.string(),
  summary: z.string().max(500).optional(),
  notes: z.string().max(VALIDATION_LIMITS.NOTES_MAX).optional(),
})

export const deliverableMetricSchema = z.object({
  id: idSchema,
  label: z.string().min(1).max(100),
  value: z.string().min(1).max(100),
  unit: z.string().max(50).optional(),
})

export const deliverableSchema = z.object({
  id: idSchema,
  name: z.string().min(VALIDATION_LIMITS.TASK_NAME_MIN).max(VALIDATION_LIMITS.TASK_NAME_MAX),
  progress: progressSchema,
  status: z.enum([
    WORK_STATUS.NOT_STARTED,
    WORK_STATUS.IN_PROGRESS,
    WORK_STATUS.AT_RISK,
    WORK_STATUS.BLOCKED,
    WORK_STATUS.DONE,
  ]).optional(),
  dueDate: z.string().optional(),
  ownerId: idSchema.optional(),
  description: z.string().max(VALIDATION_LIMITS.DESCRIPTION_MAX).optional(),
  metrics: z.array(deliverableMetricSchema).optional(),
  reviewHistory: z.array(deliverableReviewSchema).optional(),
  documentLinks: z.array(deliverableLinkSchema).optional(),
  blockers: z.array(z.string()).optional(),
  notes: z.string().max(VALIDATION_LIMITS.NOTES_MAX).optional(),
  lastUpdatedAt: z.string().optional(),
})

export const subtaskSchema = z.object({
  id: idSchema,
  name: z.string().min(VALIDATION_LIMITS.TASK_NAME_MIN).max(VALIDATION_LIMITS.TASK_NAME_MAX),
  start: dateSchema,
  end: dateSchema,
  progress: progressSchema,
  status: z.enum([
    WORK_STATUS.NOT_STARTED,
    WORK_STATUS.IN_PROGRESS,
    WORK_STATUS.AT_RISK,
    WORK_STATUS.BLOCKED,
    WORK_STATUS.DONE,
  ]),
  ownerId: idSchema.optional(),
  helpers: z.array(idSchema).optional(),
  notes: z.string().max(VALIDATION_LIMITS.NOTES_MAX).optional(),
  tags: z.array(z.string()).optional(),
  deliverables: z.array(deliverableSchema).optional(),
  linkedOrderIds: z.array(idSchema).optional(),
  linkedInventoryItemIds: z.array(idSchema).optional(),
  isExpanded: z.boolean().optional(),
  dependencies: z.array(idSchema).optional(),
})

export const taskSchema = z.object({
  id: idSchema,
  name: z.string().min(VALIDATION_LIMITS.TASK_NAME_MIN).max(VALIDATION_LIMITS.TASK_NAME_MAX),
  start: dateSchema,
  end: dateSchema,
  progress: progressSchema,
  primaryOwner: idSchema.optional(),
  helpers: z.array(idSchema).optional(),
  workpackageId: idSchema,
  importance: z.enum([
    IMPORTANCE_LEVEL.LOW,
    IMPORTANCE_LEVEL.MEDIUM,
    IMPORTANCE_LEVEL.HIGH,
    IMPORTANCE_LEVEL.CRITICAL,
  ]),
  notes: z.string().max(VALIDATION_LIMITS.NOTES_MAX).optional(),
  deliverables: z.array(deliverableSchema),
  isExpanded: z.boolean().optional(),
  type: z.enum([
    TASK_TYPE.EXPERIMENT,
    TASK_TYPE.WRITING,
    TASK_TYPE.MEETING,
    TASK_TYPE.ANALYSIS,
  ]).optional(),
  dependencies: z.array(idSchema).optional(),
  tags: z.array(z.string()).optional(),
  status: z.enum([
    WORK_STATUS.NOT_STARTED,
    WORK_STATUS.IN_PROGRESS,
    WORK_STATUS.AT_RISK,
    WORK_STATUS.BLOCKED,
    WORK_STATUS.DONE,
  ]).optional(),
  subtasks: z.array(subtaskSchema).optional(),
  linkedOrderIds: z.array(idSchema).optional(),
  linkedInventoryItemIds: z.array(idSchema).optional(),
})

export const workpackageSchema = z.object({
  id: idSchema,
  name: z.string().min(VALIDATION_LIMITS.PROJECT_NAME_MIN).max(VALIDATION_LIMITS.PROJECT_NAME_MAX),
  profileProjectId: idSchema,
  start: dateSchema,
  end: dateSchema,
  progress: progressSchema,
  importance: z.enum([
    IMPORTANCE_LEVEL.LOW,
    IMPORTANCE_LEVEL.MEDIUM,
    IMPORTANCE_LEVEL.HIGH,
    IMPORTANCE_LEVEL.CRITICAL,
  ]),
  notes: z.string().max(VALIDATION_LIMITS.NOTES_MAX).optional(),
  tasks: z.array(taskSchema).optional(),
  isExpanded: z.boolean().optional(),
  status: z.enum([
    WORKPACKAGE_STATUS.PLANNING,
    WORKPACKAGE_STATUS.ACTIVE,
    WORKPACKAGE_STATUS.AT_RISK,
    WORKPACKAGE_STATUS.COMPLETED,
    WORKPACKAGE_STATUS.ON_HOLD,
  ]).optional(),
  colorHex: z.string().optional(),
  ownerId: idSchema.optional(),
  regularProjects: z.array(z.any()).optional(), // Project[]
})

export const projectSchema = z.object({
  id: idSchema,
  name: z.string().min(VALIDATION_LIMITS.PROJECT_NAME_MIN).max(VALIDATION_LIMITS.PROJECT_NAME_MAX),
  kind: z.enum([PROJECT_KIND.MASTER, PROJECT_KIND.REGULAR]).optional(),
  start: dateSchema,
  end: dateSchema,
  progress: progressSchema,
  color: z.string(),
  importance: z.enum([
    IMPORTANCE_LEVEL.LOW,
    IMPORTANCE_LEVEL.MEDIUM,
    IMPORTANCE_LEVEL.HIGH,
    IMPORTANCE_LEVEL.CRITICAL,
  ]),
  notes: z.string().max(VALIDATION_LIMITS.NOTES_MAX).optional(),
  isExpanded: z.boolean().optional(),
  principalInvestigatorId: idSchema.optional(),
  profileProjectId: idSchema.optional(),
  fundedBy: z.array(idSchema).optional(),
  tasks: z.array(taskSchema).optional(),
  totalBudget: priceSchema.optional(),
  health: z.enum([
    PROJECT_HEALTH.GOOD,
    PROJECT_HEALTH.WARNING,
    PROJECT_HEALTH.RISK,
  ]).optional(),
  status: z.enum([
    WORK_STATUS.NOT_STARTED,
    WORK_STATUS.IN_PROGRESS,
    WORK_STATUS.AT_RISK,
    WORK_STATUS.BLOCKED,
    WORK_STATUS.DONE,
  ]).optional(),
  tags: z.array(z.string()).optional(),
  workpackages: z.array(workpackageSchema).optional(),
  defaultTemplates: z.object({
    workPackages: z.array(z.string()).optional(),
    tasks: z.array(z.string()).optional(),
    subtasks: z.array(z.string()).optional(),
  }).optional(),
  linkedOrderIds: z.array(idSchema).optional(),
  linkedInventoryItemIds: z.array(idSchema).optional(),
})

// ============================================================================
// CALENDAR & EVENTS SCHEMAS
// ============================================================================

export const recurrenceRuleSchema = z.object({
  frequency: z.enum([
    RECURRENCE_FREQUENCY.NONE,
    RECURRENCE_FREQUENCY.DAILY,
    RECURRENCE_FREQUENCY.WEEKLY,
    RECURRENCE_FREQUENCY.BIWEEKLY,
    RECURRENCE_FREQUENCY.MONTHLY,
    RECURRENCE_FREQUENCY.QUARTERLY,
    RECURRENCE_FREQUENCY.YEARLY,
    RECURRENCE_FREQUENCY.CUSTOM,
  ]),
  interval: z.number().optional(),
  byWeekday: z.array(z.string()).optional(),
  byMonthDay: z.array(z.number()).optional(),
  endDate: z.string().optional(),
  occurrenceCount: z.number().optional(),
  customRRule: z.string().optional(),
})

export const eventReminderSchema = z.object({
  id: idSchema,
  offsetMinutes: z.number(),
  method: z.enum([
    REMINDER_METHOD.EMAIL,
    REMINDER_METHOD.PUSH,
    REMINDER_METHOD.SMS,
  ]),
})

export const eventAttendeeSchema = z.object({
  personId: idSchema,
  role: z.string().optional(),
  response: z.enum([
    ATTENDEE_RESPONSE.ACCEPTED,
    ATTENDEE_RESPONSE.DECLINED,
    ATTENDEE_RESPONSE.TENTATIVE,
    ATTENDEE_RESPONSE.NONE,
  ]).optional(),
  workloadImpactHours: z.number().optional(),
})

export const calendarEventSchema = z.object({
  id: idSchema,
  title: z.string().min(1).max(200),
  description: z.string().max(VALIDATION_LIMITS.DESCRIPTION_MAX).optional(),
  location: z.string().max(200).optional(),
  linkUrl: urlSchema.optional(),
  start: dateSchema,
  end: dateSchema,
  recurrence: recurrenceRuleSchema.optional(),
  attendees: z.array(eventAttendeeSchema),
  reminders: z.array(eventReminderSchema).optional(),
  tags: z.array(z.string()).optional(),
  visibility: z.enum([
    EVENT_VISIBILITY.PRIVATE,
    EVENT_VISIBILITY.LAB,
    EVENT_VISIBILITY.ORGANISATION,
  ]),
  ownerId: idSchema.optional(),
  relatedIds: z.object({
    masterProjectId: idSchema.optional(),
    workpackageId: idSchema.optional(),
    projectId: idSchema.optional(),
    taskId: idSchema.optional(),
    subtaskId: idSchema.optional(),
    deliverableId: idSchema.optional(),
  }).optional(),
  type: z.enum([
    EVENT_TYPE.MEETING,
    EVENT_TYPE.DEADLINE,
    EVENT_TYPE.MILESTONE,
    EVENT_TYPE.TRAINING,
    EVENT_TYPE.OTHER,
  ]).optional(),
  notes: z.string().max(VALIDATION_LIMITS.NOTES_MAX).optional(),
  createdBy: idSchema,
  createdAt: dateSchema,
  updatedAt: dateSchema.optional(),
  icsUrls: z.object({
    event: z.string().optional(),
    calendar: z.string().optional(),
  }).optional(),
  integrationRefs: z.object({
    googleEventId: z.string().optional(),
    outlookEventId: z.string().optional(),
  }).optional(),
})

// ============================================================================
// INVENTORY & ORDERS SCHEMAS
// ============================================================================

export const fundingAccountSchema = z.object({
  id: idSchema,
  name: z.string().min(1).max(100),
  accountNumber: z.string().min(1).max(50),
})

export const orderSchema = z.object({
  id: idSchema,
  productName: z.string().min(1).max(200),
  catNum: z.string().min(1).max(100),
  status: z.enum([
    ORDER_STATUS.TO_ORDER,
    ORDER_STATUS.ORDERED,
    ORDER_STATUS.RECEIVED,
  ]),
  orderedBy: idSchema.optional(),
  orderedDate: dateSchema.optional(),
  receivedDate: dateSchema.optional(),
  createdBy: idSchema,
  createdDate: dateSchema,
  chargeToAccount: idSchema.optional(),
  category: idSchema.optional(),
  subcategory: z.string().optional(),
  priceExVAT: priceSchema.optional(),
})

export const inventoryItemSchema = z.object({
  id: idSchema,
  productName: z.string().min(1).max(200),
  catNum: z.string().min(1).max(100),
  inventoryLevel: z.enum([
    INVENTORY_LEVEL.EMPTY,
    INVENTORY_LEVEL.LOW,
    INVENTORY_LEVEL.MEDIUM,
    INVENTORY_LEVEL.FULL,
  ]),
  receivedDate: dateSchema,
  lastOrderedDate: dateSchema.optional(),
  chargeToAccount: idSchema.optional(),
  notes: z.string().max(VALIDATION_LIMITS.NOTES_MAX).optional(),
  category: idSchema.optional(),
  subcategory: z.string().optional(),
  priceExVAT: priceSchema.optional(),
  equipmentDeviceIds: z.array(idSchema).optional(),
  burnRatePerWeek: z.number().optional(),
  currentQuantity: z.number().optional(),
  minQuantity: z.number().optional(),
})

// ============================================================================
// EQUIPMENT SCHEMAS
// ============================================================================

export const equipmentSupplySchema = z.object({
  id: idSchema,
  name: z.string().min(1).max(200),
  price: priceSchema,
  qty: z.number(),
  minQty: z.number(),
  burnPerWeek: z.number(),
  inventoryItemId: idSchema.optional(),
})

export const equipmentSOPVersionSchema = z.object({
  version: z.string(),
  content: z.string(),
  authorId: idSchema,
  updatedAt: z.string(),
  changeNotes: z.string().optional(),
})

export const equipmentSOPSchema = z.object({
  id: idSchema,
  title: z.string().min(1).max(200),
  content: z.string(),
  version: z.string(),
  authorId: idSchema,
  createdAt: z.string(),
  updatedAt: z.string().optional(),
  history: z.array(equipmentSOPVersionSchema).optional(),
})

export const equipmentDeviceSchema = z.object({
  id: idSchema,
  name: z.string().min(1).max(200),
  make: z.string().min(1).max(100),
  model: z.string().min(1).max(100),
  serialNumber: z.string().max(100).optional(),
  imageUrl: urlSchema.optional(),
  type: z.string().min(1).max(100),
  maintenanceDays: z.number(),
  lastMaintained: z.string(),
  threshold: z.number().min(0).max(100),
  supplies: z.array(equipmentSupplySchema),
  sops: z.array(equipmentSOPSchema).optional(),
  labId: idSchema.optional(),
  createdAt: z.string(),
  updatedAt: z.string().optional(),
})

// ============================================================================
// LAB OPERATIONS SCHEMAS
// ============================================================================

export const labPollOptionSchema = z.object({
  id: idSchema,
  text: z.string().min(1).max(200),
})

export const labPollResponseSchema = z.object({
  userId: idSchema,
  selectedOptionIds: z.array(idSchema),
  respondedAt: z.string(),
})

export const labPollSchema = z.object({
  id: idSchema,
  question: z.string().min(1).max(500),
  options: z.array(labPollOptionSchema),
  labId: idSchema,
  createdBy: idSchema,
  createdAt: z.string(),
  responses: z.array(labPollResponseSchema).optional(),
})

// ============================================================================
// ELN SCHEMAS
// ============================================================================

export const elnStickyNoteSchema = z.object({
  id: idSchema,
  text: z.string().max(500),
  color: z.string(),
  position: z.object({
    x: z.number(),
    y: z.number(),
  }),
  createdAt: z.string(),
})

export const elnVoiceNoteSchema = z.object({
  id: idSchema,
  audioUrl: z.string(),
  duration: z.number(),
  createdAt: z.string(),
})

export const elnPageSchema = z.object({
  id: idSchema,
  title: z.string().min(1).max(200),
  imageUrl: z.string(),
  voiceNotes: z.array(elnVoiceNoteSchema),
  stickyNotes: z.array(elnStickyNoteSchema),
  createdAt: z.string(),
  updatedAt: z.string().optional(),
})

export const elnExperimentSchema = z.object({
  id: idSchema,
  title: z.string().min(1).max(200),
  description: z.string().max(VALIDATION_LIMITS.DESCRIPTION_MAX).optional(),
  labId: idSchema.optional(),
  createdBy: idSchema,
  pages: z.array(elnPageSchema),
  createdAt: z.string(),
  updatedAt: z.string().optional(),
})

// ============================================================================
// DAY-TO-DAY TASK SCHEMA
// ============================================================================

export const dayToDayTaskSchema = z.object({
  id: idSchema,
  title: z.string().min(VALIDATION_LIMITS.TASK_NAME_MIN).max(VALIDATION_LIMITS.TASK_NAME_MAX),
  description: z.string().max(VALIDATION_LIMITS.DESCRIPTION_MAX).optional(),
  status: z.enum([
    DAY_TO_DAY_STATUS.TODO,
    DAY_TO_DAY_STATUS.WORKING,
    DAY_TO_DAY_STATUS.DONE,
  ]),
  importance: z.enum([
    IMPORTANCE_LEVEL.LOW,
    IMPORTANCE_LEVEL.MEDIUM,
    IMPORTANCE_LEVEL.HIGH,
    IMPORTANCE_LEVEL.CRITICAL,
  ]),
  assigneeId: idSchema.optional(),
  dueDate: dateSchema.optional(),
  createdAt: dateSchema,
  updatedAt: dateSchema,
  createdBy: idSchema,
  tags: z.array(z.string()).optional(),
  linkedProjectId: idSchema.optional(),
  linkedTaskId: idSchema.optional(),
  order: z.number(),
})

// ============================================================================
// AUDIT TRAIL SCHEMA
// ============================================================================

export const auditTrailSchema = z.object({
  id: idSchema,
  entityType: z.enum([
    AUDIT_ENTITY_TYPE.PROJECT,
    AUDIT_ENTITY_TYPE.WORKPACKAGE,
    AUDIT_ENTITY_TYPE.TASK,
    AUDIT_ENTITY_TYPE.DELIVERABLE,
    AUDIT_ENTITY_TYPE.EVENT,
  ]),
  entityId: idSchema,
  change: z.enum([
    AUDIT_CHANGE_TYPE.CREATE,
    AUDIT_CHANGE_TYPE.UPDATE,
    AUDIT_CHANGE_TYPE.DELETE,
  ]),
  before: z.any().optional(),
  after: z.any().optional(),
  authorId: idSchema,
  createdAt: dateSchema,
})

// ============================================================================
// ORGANIZATION SCHEMAS
// ============================================================================

export const organisationSchema = z.object({
  id: idSchema,
  name: z.string().min(1).max(200),
  createdBy: idSchema.optional(),
})

export const instituteSchema = z.object({
  id: idSchema,
  name: z.string().min(1).max(200),
  organisationId: idSchema,
  createdBy: idSchema.optional(),
})

export const labSchema = z.object({
  id: idSchema,
  name: z.string().min(1).max(200),
  instituteId: idSchema,
  organisationId: idSchema,
  createdBy: idSchema.optional(),
})

// ============================================================================
// CREATE INPUT SCHEMAS (for forms - excludes id and auto-generated fields)
// ============================================================================

export const createProjectInputSchema = projectSchema.omit({ id: true }).partial({
  isExpanded: true,
  tasks: true,
  workpackages: true,
})

export const createTaskInputSchema = taskSchema.omit({ id: true }).partial({
  isExpanded: true,
  subtasks: true,
})

export const createEventInputSchema = calendarEventSchema.omit({ id: true, createdAt: true }).partial({
  updatedAt: true,
})

export const createPersonProfileInputSchema = personProfileSchema.omit({ id: true }).partial({
  userId: true,
  profileComplete: true,
  isAdministrator: true,
})

export const createOrderInputSchema = orderSchema.omit({ id: true })

export const createInventoryItemInputSchema = inventoryItemSchema.omit({ id: true })

export const createEquipmentInputSchema = equipmentDeviceSchema.omit({ id: true, createdAt: true }).partial({
  updatedAt: true,
})

export const createDayToDayTaskInputSchema = dayToDayTaskSchema.omit({ id: true, createdAt: true, updatedAt: true })

// ============================================================================
// UPDATE INPUT SCHEMAS (all fields optional except id)
// ============================================================================

export const updateProjectInputSchema = projectSchema.partial().required({ id: true })
export const updateTaskInputSchema = taskSchema.partial().required({ id: true })
export const updateEventInputSchema = calendarEventSchema.partial().required({ id: true })
export const updatePersonProfileInputSchema = personProfileSchema.partial().required({ id: true })
export const updateOrderInputSchema = orderSchema.partial().required({ id: true })
export const updateInventoryItemInputSchema = inventoryItemSchema.partial().required({ id: true })
export const updateEquipmentInputSchema = equipmentDeviceSchema.partial().required({ id: true })
export const updateDayToDayTaskInputSchema = dayToDayTaskSchema.partial().required({ id: true })
