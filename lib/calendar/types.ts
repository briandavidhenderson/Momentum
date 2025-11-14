/**
 * Provider-specific types for calendar integrations
 * These types match the API responses from Google Calendar and Microsoft Graph
 */

// ============================================================================
// GOOGLE CALENDAR API TYPES
// ============================================================================

/**
 * Google Calendar API - Calendar resource
 * @see https://developers.google.com/calendar/api/v3/reference/calendars
 */
export interface GoogleCalendar {
  kind: "calendar#calendar"
  id: string
  summary: string
  description?: string
  timeZone: string
  colorId?: string
  backgroundColor?: string
  foregroundColor?: string
  selected?: boolean
  accessRole?: "freeBusyReader" | "reader" | "writer" | "owner"
  primary?: boolean
  deleted?: boolean
  hidden?: boolean
  conferenceProperties?: {
    allowedConferenceSolutionTypes?: string[]
  }
}

/**
 * Google Calendar API - CalendarListEntry resource
 * @see https://developers.google.com/calendar/api/v3/reference/calendarList
 */
export interface GoogleCalendarListEntry {
  kind: "calendar#calendarListEntry"
  id: string
  summary: string
  description?: string
  location?: string
  timeZone: string
  summaryOverride?: string
  colorId?: string
  backgroundColor?: string
  foregroundColor?: string
  hidden?: boolean
  selected?: boolean
  accessRole: "freeBusyReader" | "reader" | "writer" | "owner"
  defaultReminders?: Array<{
    method: "email" | "popup"
    minutes: number
  }>
  notificationSettings?: {
    notifications: Array<{
      type: string
      method: string
    }>
  }
  primary?: boolean
  deleted?: boolean
  conferenceProperties?: {
    allowedConferenceSolutionTypes?: string[]
  }
}

/**
 * Google Calendar API - Event resource
 * @see https://developers.google.com/calendar/api/v3/reference/events
 */
export interface GoogleCalendarEvent {
  kind: "calendar#event"
  id: string
  status?: "confirmed" | "tentative" | "cancelled"
  htmlLink?: string
  created?: string // ISO 8601
  updated?: string // ISO 8601
  summary?: string
  description?: string
  location?: string
  colorId?: string
  creator?: {
    id?: string
    email?: string
    displayName?: string
    self?: boolean
  }
  organizer?: {
    id?: string
    email?: string
    displayName?: string
    self?: boolean
  }
  start: GoogleEventDateTime
  end: GoogleEventDateTime
  endTimeUnspecified?: boolean
  recurrence?: string[] // RRULE, EXRULE, RDATE, EXDATE format
  recurringEventId?: string
  originalStartTime?: GoogleEventDateTime
  transparency?: "opaque" | "transparent"
  visibility?: "default" | "public" | "private" | "confidential"
  iCalUID?: string
  sequence?: number
  attendees?: Array<{
    id?: string
    email?: string
    displayName?: string
    organizer?: boolean
    self?: boolean
    resource?: boolean
    optional?: boolean
    responseStatus?: "needsAction" | "declined" | "tentative" | "accepted"
    comment?: string
    additionalGuests?: number
  }>
  attendeesOmitted?: boolean
  extendedProperties?: {
    private?: Record<string, string>
    shared?: Record<string, string>
  }
  hangoutLink?: string
  conferenceData?: {
    createRequest?: any
    entryPoints?: Array<{
      entryPointType: string
      uri: string
      label?: string
      pin?: string
      accessCode?: string
      meetingCode?: string
      passcode?: string
      password?: string
    }>
    conferenceSolution?: {
      key: {
        type: string
      }
      name?: string
      iconUri?: string
    }
    conferenceId?: string
    signature?: string
    notes?: string
  }
  gadget?: any
  anyoneCanAddSelf?: boolean
  guestsCanInviteOthers?: boolean
  guestsCanModify?: boolean
  guestsCanSeeOtherGuests?: boolean
  privateCopy?: boolean
  locked?: boolean
  reminders?: {
    useDefault: boolean
    overrides?: Array<{
      method: "email" | "popup"
      minutes: number
    }>
  }
  source?: {
    url?: string
    title?: string
  }
  attachments?: Array<{
    fileUrl: string
    title?: string
    mimeType?: string
    iconLink?: string
    fileId?: string
  }>
  eventType?: "default" | "outOfOffice" | "focusTime" | "workingLocation"
}

/**
 * Google Calendar API - DateTime format
 */
export interface GoogleEventDateTime {
  date?: string // Date-only (YYYY-MM-DD)
  dateTime?: string // ISO 8601 with timezone
  timeZone?: string
}

/**
 * Google Calendar API - Events list response
 */
export interface GoogleCalendarEventsListResponse {
  kind: "calendar#events"
  summary: string
  description?: string
  updated: string
  timeZone: string
  accessRole: string
  defaultReminders: Array<{
    method: string
    minutes: number
  }>
  nextPageToken?: string
  nextSyncToken?: string
  items: GoogleCalendarEvent[]
}

/**
 * Google Calendar API - Channel resource for push notifications
 * @see https://developers.google.com/calendar/api/guides/push
 */
export interface GoogleCalendarChannel {
  kind: "api#channel"
  id: string
  resourceId: string
  resourceUri: string
  token?: string
  expiration?: string // Unix timestamp in milliseconds
  type: "web_hook"
  address: string
  params?: Record<string, string>
  payload?: boolean
}

// ============================================================================
// MICROSOFT GRAPH API TYPES
// ============================================================================

/**
 * Microsoft Graph API - Calendar resource
 * @see https://learn.microsoft.com/en-us/graph/api/resources/calendar
 */
export interface MicrosoftCalendar {
  id: string
  name: string
  color?: "lightBlue" | "lightGreen" | "lightOrange" | "lightGray" | "lightYellow" | "lightTeal" | "lightPink" | "lightBrown" | "lightRed" | "maxColor" | "auto"
  hexColor?: string
  isDefaultCalendar?: boolean
  changeKey?: string
  canShare?: boolean
  canViewPrivateItems?: boolean
  isShared?: boolean
  isSharedWithMe?: boolean
  canEdit?: boolean
  allowedOnlineMeetingProviders?: string[]
  defaultOnlineMeetingProvider?: string
  isTallyingResponses?: boolean
  isRemovable?: boolean
  owner?: {
    name?: string
    address?: string
  }
}

/**
 * Microsoft Graph API - Event resource
 * @see https://learn.microsoft.com/en-us/graph/api/resources/event
 */
export interface MicrosoftCalendarEvent {
  id: string
  createdDateTime?: string // ISO 8601
  lastModifiedDateTime?: string // ISO 8601
  changeKey?: string
  categories?: string[]
  transactionId?: string
  originalStartTimeZone?: string
  originalEndTimeZone?: string
  iCalUId?: string
  reminderMinutesBeforeStart?: number
  isReminderOn?: boolean
  hasAttachments?: boolean
  subject?: string
  bodyPreview?: string
  importance?: "low" | "normal" | "high"
  sensitivity?: "normal" | "personal" | "private" | "confidential"
  isAllDay?: boolean
  isCancelled?: boolean
  isOrganizer?: boolean
  responseRequested?: boolean
  seriesMasterId?: string
  showAs?: "free" | "tentative" | "busy" | "oof" | "workingElsewhere" | "unknown"
  type?: "singleInstance" | "occurrence" | "exception" | "seriesMaster"
  webLink?: string
  onlineMeetingUrl?: string
  isOnlineMeeting?: boolean
  onlineMeetingProvider?: "unknown" | "teamsForBusiness" | "skypeForBusiness" | "skypeForConsumer"
  allowNewTimeProposals?: boolean
  occurrenceId?: string
  isDraft?: boolean
  hideAttendees?: boolean
  responseStatus?: {
    response?: "none" | "organizer" | "tentativelyAccepted" | "accepted" | "declined" | "notResponded"
    time?: string // ISO 8601
  }
  body?: {
    contentType?: "text" | "html"
    content?: string
  }
  start: MicrosoftDateTimeTimeZone
  end: MicrosoftDateTimeTimeZone
  location?: {
    displayName?: string
    locationType?: "default" | "conferenceRoom" | "homeAddress" | "businessAddress" | "geoCoordinates" | "streetAddress" | "hotel" | "restaurant" | "localBusiness" | "postalAddress"
    uniqueId?: string
    uniqueIdType?: "unknown" | "locationStore" | "directory" | "private" | "bing"
    address?: {
      street?: string
      city?: string
      state?: string
      countryOrRegion?: string
      postalCode?: string
    }
    coordinates?: {
      altitude?: number
      latitude?: number
      longitude?: number
      accuracy?: number
      altitudeAccuracy?: number
    }
  }
  locations?: Array<{
    displayName?: string
    locationType?: string
    uniqueId?: string
    address?: any
    coordinates?: any
  }>
  recurrence?: {
    pattern?: {
      type: "daily" | "weekly" | "absoluteMonthly" | "relativeMonthly" | "absoluteYearly" | "relativeYearly"
      interval: number
      month?: number
      dayOfMonth?: number
      daysOfWeek?: Array<"sunday" | "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday">
      firstDayOfWeek?: "sunday" | "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday"
      index?: "first" | "second" | "third" | "fourth" | "last"
    }
    range?: {
      type: "endDate" | "noEnd" | "numbered"
      startDate: string // YYYY-MM-DD
      endDate?: string // YYYY-MM-DD
      recurrenceTimeZone?: string
      numberOfOccurrences?: number
    }
  }
  attendees?: Array<{
    type?: "required" | "optional" | "resource"
    status?: {
      response?: "none" | "organizer" | "tentativelyAccepted" | "accepted" | "declined" | "notResponded"
      time?: string
    }
    emailAddress?: {
      name?: string
      address?: string
    }
  }>
  organizer?: {
    emailAddress?: {
      name?: string
      address?: string
    }
  }
  onlineMeeting?: {
    joinUrl?: string
    conferenceId?: string
    tollNumber?: string
  }
  attachments?: Array<{
    id?: string
    lastModifiedDateTime?: string
    name?: string
    contentType?: string
    size?: number
    isInline?: boolean
  }>
}

/**
 * Microsoft Graph API - DateTimeTimeZone format
 */
export interface MicrosoftDateTimeTimeZone {
  dateTime: string // ISO 8601 without timezone
  timeZone: string // IANA timezone name
}

/**
 * Microsoft Graph API - Events list response
 */
export interface MicrosoftCalendarEventsListResponse {
  "@odata.context"?: string
  "@odata.nextLink"?: string
  "@odata.deltaLink"?: string
  value: MicrosoftCalendarEvent[]
}

/**
 * Microsoft Graph API - Subscription resource for push notifications
 * @see https://learn.microsoft.com/en-us/graph/api/resources/subscription
 */
export interface MicrosoftGraphSubscription {
  id?: string
  resource: string
  changeType: string // "created,updated,deleted"
  notificationUrl: string
  expirationDateTime: string // ISO 8601
  clientState?: string
  latestSupportedTlsVersion?: "v1_0" | "v1_1" | "v1_2" | "v1_3"
  encryptionCertificate?: string
  encryptionCertificateId?: string
  includeResourceData?: boolean
  lifecycleNotificationUrl?: string
  creatorId?: string
}

/**
 * Microsoft Graph API - Notification payload
 */
export interface MicrosoftGraphNotification {
  subscriptionId: string
  subscriptionExpirationDateTime: string
  changeType: "created" | "updated" | "deleted"
  resource: string
  resourceData?: {
    "@odata.type": string
    "@odata.id": string
    "@odata.etag"?: string
    id?: string
  }
  clientState?: string
  tenantId?: string
  encryptedContent?: {
    data: string
    dataSignature: string
    dataKey: string
    encryptionCertificateId: string
    encryptionCertificateThumbprint: string
  }
}

// ============================================================================
// SHARED OAUTH TYPES
// ============================================================================

/**
 * OAuth token response (shared between Google and Microsoft)
 */
export interface OAuthTokenResponse {
  access_token: string
  token_type: "Bearer"
  expires_in: number // Seconds
  refresh_token?: string
  scope?: string
  id_token?: string // OpenID Connect ID token
}

/**
 * OAuth error response
 */
export interface OAuthErrorResponse {
  error: string
  error_description?: string
  error_uri?: string
}
