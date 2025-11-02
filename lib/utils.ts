import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { CalendarEvent, RecurrenceRule } from "./types"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getRecurrenceSummary(rule?: RecurrenceRule) {
  if (!rule || rule.frequency === "none") {
    return "One-time"
  }

  const parts: string[] = []

  const interval = rule.interval ?? (rule.frequency === "biweekly" ? 2 : 1)
  const freqLabelMap: Record<string, string> = {
    daily: interval === 1 ? "Every day" : `Every ${interval} days`,
    weekly: interval === 1 ? "Every week" : `Every ${interval} weeks`,
    biweekly: "Every 2 weeks",
    monthly: interval === 1 ? "Every month" : `Every ${interval} months`,
    quarterly: interval === 1 ? "Every quarter" : `Every ${interval} quarters`,
    yearly: interval === 1 ? "Every year" : `Every ${interval} years`,
    custom: "Custom recurrence",
  }

  const freq = rule.frequency in freqLabelMap ? freqLabelMap[rule.frequency] : "Recurring"
  parts.push(freq)

  if (rule.byWeekday && rule.byWeekday.length) {
    parts.push(`on ${rule.byWeekday.join(", ")}`)
  }

  if (rule.byMonthDay && rule.byMonthDay.length) {
    const days = rule.byMonthDay.map((day) => `${day}${getOrdinalSuffix(day)}`)
    parts.push(`on the ${days.join(", ")}`)
  }

  if (rule.occurrenceCount) {
    parts.push(`for ${rule.occurrenceCount} occurrence${rule.occurrenceCount > 1 ? "s" : ""}`)
  }

  if (rule.endDate) {
    parts.push(`until ${new Date(rule.endDate).toLocaleDateString()}`)
  }

  return parts.join(" ")
}

function getOrdinalSuffix(n: number) {
  const remainder = n % 100
  if (remainder >= 11 && remainder <= 13) {
    return "th"
  }
  switch (n % 10) {
    case 1:
      return "st"
    case 2:
      return "nd"
    case 3:
      return "rd"
    default:
      return "th"
  }
}

export function buildICSForEvent(event: CalendarEvent, calendarTitle = "Momentum Lab Calendar") {
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Momentum Lab//Calendar//EN",
    `X-WR-CALNAME:${escapeICS(calendarTitle)}`,
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${event.id}@momentum.lab`,
    `SUMMARY:${escapeICS(event.title)}`,
    `DTSTAMP:${formatICSDate(new Date())}`,
    `DTSTART:${formatICSDate(event.start)}`,
    `DTEND:${formatICSDate(event.end)}`,
  ]

  if (event.description) {
    lines.push(`DESCRIPTION:${escapeICS(event.description)}`)
  }
  if (event.location) {
    lines.push(`LOCATION:${escapeICS(event.location)}`)
  }
  if (event.linkUrl) {
    lines.push(`URL:${escapeICS(event.linkUrl)}`)
  }

  if (event.recurrence) {
    const rrule = buildRRule(event.recurrence)
    if (rrule) {
      lines.push(`RRULE:${rrule}`)
    }
  }

  if (event.attendees?.length) {
    event.attendees.forEach((attendee) => {
      lines.push(`ATTENDEE;CN=${escapeICS(attendee.personId)}:mailto:${escapeICS(attendee.personId)}@lab.local`)
    })
  }

  if (event.reminders?.length) {
    event.reminders.forEach((reminder) => {
      lines.push("BEGIN:VALARM")
      lines.push(`TRIGGER:-PT${reminder.offsetMinutes}M`)
      lines.push("ACTION:DISPLAY")
      lines.push("DESCRIPTION:Reminder")
      lines.push("END:VALARM")
    })
  }

  lines.push("END:VEVENT")
  lines.push("END:VCALENDAR")
  return lines.join("\r\n")
}

export function buildICSForEvents(events: CalendarEvent[], calendarTitle = "Momentum Lab Calendar") {
  const header = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Momentum Lab//Calendar//EN",
    `X-WR-CALNAME:${escapeICS(calendarTitle)}`,
    "CALSCALE:GREGORIAN",
  ]

  const body = events
    .map((event) => {
      const vevent = [
        "BEGIN:VEVENT",
        `UID:${event.id}@momentum.lab`,
        `SUMMARY:${escapeICS(event.title)}`,
        `DTSTAMP:${formatICSDate(new Date())}`,
        `DTSTART:${formatICSDate(event.start)}`,
        `DTEND:${formatICSDate(event.end)}`,
      ]

      if (event.description) {
        vevent.push(`DESCRIPTION:${escapeICS(event.description)}`)
      }
      if (event.location) {
        vevent.push(`LOCATION:${escapeICS(event.location)}`)
      }
      if (event.linkUrl) {
        vevent.push(`URL:${escapeICS(event.linkUrl)}`)
      }

      if (event.recurrence) {
        const rrule = buildRRule(event.recurrence)
        if (rrule) {
          vevent.push(`RRULE:${rrule}`)
        }
      }

      if (event.attendees?.length) {
        event.attendees.forEach((attendee) => {
          vevent.push(`ATTENDEE;CN=${escapeICS(attendee.personId)}:mailto:${escapeICS(attendee.personId)}@lab.local`)
        })
      }

      if (event.reminders?.length) {
        event.reminders.forEach((reminder) => {
          vevent.push("BEGIN:VALARM")
          vevent.push(`TRIGGER:-PT${reminder.offsetMinutes}M`)
          vevent.push("ACTION:DISPLAY")
          vevent.push("DESCRIPTION:Reminder")
          vevent.push("END:VALARM")
        })
      }

      vevent.push("END:VEVENT")
      return vevent.join("\r\n")
    })

  const footer = ["END:VCALENDAR"]

  return [...header, ...body, ...footer].join("\r\n")
}

function formatICSDate(date: Date) {
  const pad = (num: number) => `${num}`.padStart(2, "0")
  return `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}T${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}Z`
}

function escapeICS(value: string) {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;")
}

function buildRRule(rule: RecurrenceRule) {
  if (!rule || rule.frequency === "none") {
    return ""
  }

  if (rule.frequency === "custom" && rule.customRRule) {
    return rule.customRRule
  }

  const components: string[] = []

  const map: Record<string, string> = {
    daily: "DAILY",
    weekly: "WEEKLY",
    biweekly: "WEEKLY",
    monthly: "MONTHLY",
    quarterly: "MONTHLY",
    yearly: "YEARLY",
  }

  const interval = rule.interval ?? (rule.frequency === "biweekly" ? 2 : rule.frequency === "quarterly" ? 3 : 1)

  components.push(`FREQ=${map[rule.frequency]}`)
  if (interval > 1) {
    components.push(`INTERVAL=${interval}`)
  }
  if (rule.byWeekday && rule.byWeekday.length) {
    components.push(`BYDAY=${rule.byWeekday.join(",")}`)
  }
  if (rule.byMonthDay && rule.byMonthDay.length) {
    components.push(`BYMONTHDAY=${rule.byMonthDay.join(",")}`)
  }
  if (rule.occurrenceCount) {
    components.push(`COUNT=${rule.occurrenceCount}`)
  }
  if (rule.endDate) {
    components.push(`UNTIL=${formatICSDate(new Date(rule.endDate))}`)
  }

  return components.join(";")
}

