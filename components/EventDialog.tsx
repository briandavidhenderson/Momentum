"use client"

import { useCallback, useMemo, useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { CalendarEvent, EventAttendee, EventVisibility, Person, RecurrenceFrequency, RecurrenceRule } from "@/lib/types"
import { buildICSForEvent, getRecurrenceSummary } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Trash2, Lock, ExternalLink, Calendar as CalendarIcon } from "lucide-react"

type EventDialogMode = "create" | "edit"

interface EventDialogProps {
  open: boolean
  mode?: EventDialogMode
  people: Person[]
  defaultVisibility?: EventVisibility
  onClose: () => void
  onSubmit: (event: CalendarEvent) => void
  initialEvent?: CalendarEvent
  onDelete?: (eventId: string) => void
}

const recurrencePresets: { value: RecurrenceFrequency; label: string }[] = [
  { value: "none", label: "One-time" },
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "biweekly", label: "Bi-weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "yearly", label: "Yearly" },
  { value: "custom", label: "Custom (RRULE)" },
]

const reminderOptions = [
  { label: "10 minutes before", value: 10 },
  { label: "30 minutes before", value: 30 },
  { label: "1 hour before", value: 60 },
  { label: "1 day before", value: 1440 },
]

export function EventDialog({
  open,
  mode = "create",
  people,
  defaultVisibility = "lab",
  onClose,
  onSubmit,
  initialEvent,
  onDelete,
}: EventDialogProps) {
  const [title, setTitle] = useState(initialEvent?.title ?? "")
  const [description, setDescription] = useState(initialEvent?.description ?? "")
  const [location, setLocation] = useState(initialEvent?.location ?? "")
  const [linkUrl, setLinkUrl] = useState(initialEvent?.linkUrl ?? "")
  const [start, setStart] = useState(() => formatDateTimeLocal(initialEvent?.start ?? new Date()))
  const [end, setEnd] = useState(() => formatDateTimeLocal(initialEvent?.end ?? new Date(Date.now() + 60 * 60 * 1000)))
  const [recurrence, setRecurrence] = useState<RecurrenceRule | undefined>(initialEvent?.recurrence)
  const [recurrencePreset, setRecurrencePreset] = useState<RecurrenceFrequency>(initialEvent?.recurrence?.frequency ?? "none")
  const [customRRule, setCustomRRule] = useState(initialEvent?.recurrence?.customRRule ?? "")
  const [selectedAttendeeIds, setSelectedAttendeeIds] = useState<string[]>(initialEvent?.attendees?.map((attendee) => attendee.personId) ?? [])
  const [attendeeNotes, setAttendeeNotes] = useState<Record<string, string>>(
    () => {
      const notes: Record<string, string> = {}
      initialEvent?.attendees?.forEach((attendee) => {
        notes[attendee.personId] = attendee.role ?? ""
      })
      return notes
    }
  )
  const [tags, setTags] = useState(initialEvent?.tags ?? [])
  const [tagDraft, setTagDraft] = useState("")
  const [reminders, setReminders] = useState(initialEvent?.reminders ?? [])
  const [visibility, setVisibility] = useState<EventVisibility>(initialEvent?.visibility ?? defaultVisibility)
  const [rruleError, setRRuleError] = useState<string | null>(null)

  const dialogTitle = mode === "create" ? "Create event" : "Edit event"
  const isEditMode = mode === "edit" && Boolean(initialEvent)
  const isReadOnly = initialEvent?.isReadOnly ?? false
  const isExternalEvent = initialEvent?.calendarSource && initialEvent.calendarSource !== 'momentum'

  const recurrenceSummary = useMemo(() => getRecurrenceSummary(recurrence), [recurrence])

  const isValid = title.trim().length > 0 && new Date(start) < new Date(end)

  const buildEventPayload = useCallback((): CalendarEvent => {
    const base: CalendarEvent = {
      id: initialEvent?.id ?? `event-${Date.now()}`,
      title: title.trim(),
      description: description.trim() || undefined,
      location: location.trim() || undefined,
      linkUrl: linkUrl.trim() || undefined,
      start: new Date(start),
      end: new Date(end),
      recurrence,
      attendees: selectedAttendeeIds.map((personId) => ({
        personId,
        role: attendeeNotes[personId]?.trim() || undefined,
      })),
      reminders,
      tags,
      visibility,
      createdAt: initialEvent?.createdAt ?? new Date(),
      createdBy: initialEvent?.createdBy ?? "local",
      updatedAt: new Date(),
      ownerId: initialEvent?.ownerId,
      relatedIds: initialEvent?.relatedIds,
      icsUrls: initialEvent?.icsUrls,
      integrationRefs: initialEvent?.integrationRefs,
      type: initialEvent?.type ?? "meeting",
      notes: initialEvent?.notes,
    }

    return base
  }, [
    initialEvent,
    title,
    description,
    location,
    linkUrl,
    start,
    end,
    recurrence,
    selectedAttendeeIds,
    attendeeNotes,
    reminders,
    tags,
    visibility,
  ])

  const icsContent = useMemo(() => {
    if (!title.trim()) {
      return ""
    }
    const event = buildEventPayload()
    return buildICSForEvent(event)
  }, [title, buildEventPayload])

  function handleApplyRecurrence(preset: RecurrenceFrequency) {
    setRecurrencePreset(preset)

    if (preset === "none") {
      setRecurrence(undefined)
      return
    }

    if (preset === "custom") {
      setRecurrence((prev) => ({
        frequency: "custom",
        customRRule: prev?.customRRule ?? customRRule ?? "",
      }))
      return
    }

    const intervalDefaults: Record<Exclude<RecurrenceFrequency, "none" | "custom">, number> = {
      daily: 1,
      weekly: 1,
      biweekly: 2,
      monthly: 1,
      quarterly: 1,
      yearly: 1,
    }

    setRecurrence({
      frequency: preset,
      interval: intervalDefaults[preset],
    })
  }

  function handleReminderToggle(minutes: number) {
    setReminders((prev) => {
      const exists = prev.find((reminder) => reminder.offsetMinutes === minutes)
      if (exists) {
        return prev.filter((reminder) => reminder.offsetMinutes !== minutes)
      }
      return [...prev, { id: `reminder-${minutes}`, offsetMinutes: minutes, method: "email" }]
    })
  }

  function handleAddTag() {
    const value = tagDraft.trim()
    if (!value) return
    if (!tags.includes(value)) {
      setTags([...tags, value])
    }
    setTagDraft("")
  }

  function handleDeleteTag(tag: string) {
    setTags(tags.filter((t) => t !== tag))
  }

  function handleParseCustomRRule(value: string) {
    setCustomRRule(value)
    if (!value.trim()) {
      setRRuleError("RRULE is required when using custom recurrence")
      return
    }

    try {
      const normalized = value.trim().toUpperCase()
      if (!normalized.startsWith("FREQ=")) {
        throw new Error("RRULE must begin with FREQ=")
      }
      setRecurrence({
        frequency: "custom",
        customRRule: normalized,
      })
      setRRuleError(null)
    } catch (error) {
      setRRuleError(error instanceof Error ? error.message : "Invalid RRULE")
    }
  }

  function handleSubmit() {
    if (!isValid) return
    const eventPayload = buildEventPayload()
    onSubmit(eventPayload)
    onClose()
  }

  function handleDelete() {
    if (isEditMode && initialEvent && onDelete) {
      onDelete(initialEvent.id)
      onClose()
    }
  }

  function handleDownloadICS() {
    const payload = buildEventPayload()
    const ics = buildICSForEvent(payload)
    const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `${payload.title.replace(/\s+/g, "-")}.ics`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  function toggleAttendee(personId: string) {
    setSelectedAttendeeIds((prev) => {
      if (prev.includes(personId)) {
        return prev.filter((id) => id !== personId)
      }
      return [...prev, personId]
    })
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl gap-6">
        <DialogHeader>
          <DialogTitle>{dialogTitle}</DialogTitle>
          <DialogDescription>
            Capture all the essentials, add recurrence, reminders and attendees. Events sync across the dashboard once saved.
          </DialogDescription>
        </DialogHeader>

        {/* Read-only External Event Notice */}
        {isReadOnly && isExternalEvent && (
          <div className="flex items-start gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <Lock className="h-5 w-5 text-blue-600 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-blue-900">Read-only External Event</p>
              <p className="text-xs text-blue-700 mt-1">
                This event is synced from {initialEvent.calendarSource === 'google' ? 'Google Calendar' : 'Microsoft Outlook'} and cannot be edited in Momentum.
                {initialEvent.externalUrl && ' Use the link below to edit in the original calendar.'}
              </p>
              {initialEvent.externalUrl && (
                <a
                  href={initialEvent.externalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 mt-2 hover:underline"
                >
                  <ExternalLink className="h-4 w-4" />
                  Open in {initialEvent.calendarSource === 'google' ? 'Google Calendar' : 'Outlook'}
                </a>
              )}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr] gap-6 overflow-y-auto pr-1 max-h-[70vh]">
          <div className="space-y-6">
            <section className="space-y-3">
              <div>
                <Label htmlFor="event-title">Title *</Label>
                <Input
                  id="event-title"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="e.g. Biomarker stand-up"
                  disabled={isReadOnly}
                />
              </div>

              <div>
                <Label htmlFor="event-description">Description</Label>
                <Textarea
                  id="event-description"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="What do we need to cover?"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="event-location">Location</Label>
                  <Input
                    id="event-location"
                    value={location}
                    onChange={(event) => setLocation(event.target.value)}
                    placeholder="Lab 3.14, Trinity Biomedical Sciences"
                  />
                </div>
                <div>
                  <Label htmlFor="event-link">Video link</Label>
                  <Input
                    id="event-link"
                    value={linkUrl}
                    onChange={(event) => setLinkUrl(event.target.value)}
                    placeholder="https://..."
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="event-start">Start *</Label>
                  <Input
                    id="event-start"
                    type="datetime-local"
                    value={start}
                    onChange={(event) => setStart(event.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="event-end">End *</Label>
                  <Input
                    id="event-end"
                    type="datetime-local"
                    value={end}
                    min={start}
                    onChange={(event) => setEnd(event.target.value)}
                  />
                </div>
              </div>
            </section>

            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Recurrence</Label>
                <span className="text-sm text-muted-foreground">{recurrenceSummary}</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {recurrencePresets.map((preset) => (
                  <Button
                    key={preset.value}
                    type="button"
                    variant={preset.value === recurrencePreset ? "default" : "outline"}
                    className={preset.value === recurrencePreset ? "bg-brand-500 text-white" : ""}
                    onClick={() => handleApplyRecurrence(preset.value)}
                  >
                    {preset.label}
                  </Button>
                ))}
              </div>

              {recurrencePreset !== "none" && recurrencePreset !== "custom" && recurrence && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div>
                    <Label htmlFor="recurrence-interval">Interval</Label>
                    <Input
                      id="recurrence-interval"
                      type="number"
                      min={1}
                      value={recurrence.interval ?? (recurrencePreset === "biweekly" ? 2 : 1)}
                      onChange={(event) =>
                        setRecurrence({
                          ...recurrence,
                          interval: Number(event.target.value) || 1,
                        })
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="recurrence-end">Ends on</Label>
                    <Input
                      id="recurrence-end"
                      type="date"
                      value={recurrence.endDate ?? ""}
                      onChange={(event) =>
                        setRecurrence({
                          ...recurrence,
                          endDate: event.target.value || undefined,
                        })
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="recurrence-count">Occurrences</Label>
                    <Input
                      id="recurrence-count"
                      type="number"
                      min={1}
                      value={recurrence.occurrenceCount ?? ""}
                      onChange={(event) =>
                        setRecurrence({
                          ...recurrence,
                          occurrenceCount: event.target.value ? Number(event.target.value) : undefined,
                        })
                      }
                    />
                  </div>
                </div>
              )}

              {recurrencePreset === "custom" && (
                <div>
                  <Label htmlFor="recurrence-custom">RRULE</Label>
                  <Textarea
                    id="recurrence-custom"
                    rows={2}
                    value={customRRule}
                    placeholder="FREQ=WEEKLY;BYDAY=TU;INTERVAL=2"
                    onChange={(event) => handleParseCustomRRule(event.target.value)}
                  />
                  {rruleError && <p className="text-xs text-destructive mt-1">{rruleError}</p>}
                </div>
              )}
            </section>

            <section className="space-y-3">
              <Label>Tags</Label>
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                    {tag}
                    <button
                      type="button"
                      className="ml-1 text-muted-foreground hover:text-foreground"
                      onClick={() => handleDeleteTag(tag)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  value={tagDraft}
                  onChange={(event) => setTagDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault()
                      handleAddTag()
                    }
                  }}
                  placeholder="Type tag name"
                />
                <Button type="button" variant="outline" onClick={handleAddTag}>
                  Add
                </Button>
              </div>
            </section>
          </div>

          <div className="space-y-6">
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Attendees</Label>
                <span className="text-xs text-muted-foreground">Drag & drop to assign elsewhere too</span>
              </div>
              <div className="max-h-[280px] overflow-y-auto space-y-2 pr-1">
                {people.map((person) => {
                  const selected = selectedAttendeeIds.includes(person.id)
                  return (
                    <button
                      key={person.id}
                      type="button"
                      onClick={() => toggleAttendee(person.id)}
                      className={`w-full rounded-xl border px-3 py-2 text-left transition-colors ${
                        selected ? "border-brand-500 bg-brand-50" : "hover:bg-muted"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{person.name}</span>
                        <span
                          className="inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold text-white"
                          style={{ backgroundColor: person.color }}
                        >
                          {person.name.charAt(0)}
                        </span>
                      </div>
                      {selected && (
                        <div className="mt-2">
                          <Label htmlFor={`attendee-note-${person.id}`} className="text-xs text-muted-foreground">
                            Role / note
                          </Label>
                          <Input
                            id={`attendee-note-${person.id}`}
                            value={attendeeNotes[person.id] ?? ""}
                            onChange={(event) =>
                              setAttendeeNotes({
                                ...attendeeNotes,
                                [person.id]: event.target.value,
                              })
                            }
                            placeholder="Presenter, note-taker, etc."
                            className="mt-1"
                          />
                        </div>
                      )}
                    </button>
                  )
                })}
                {people.length === 0 && (
                  <p className="text-sm text-muted-foreground">No lab members yet. Add people first.</p>
                )}
              </div>
            </section>

            <section className="space-y-3">
              <Label>Reminders</Label>
              <div className="flex flex-wrap gap-2">
                {reminderOptions.map((option) => {
                  const selected = reminders.some((reminder) => reminder.offsetMinutes === option.value)
                  return (
                    <Button
                      key={option.value}
                      type="button"
                      variant={selected ? "default" : "outline"}
                      className={selected ? "bg-brand-500 text-white" : ""}
                      onClick={() => handleReminderToggle(option.value)}
                    >
                      {option.label}
                    </Button>
                  )
                })}
              </div>
              {reminders.length === 0 && <p className="text-xs text-muted-foreground">No reminders set.</p>}
            </section>

            <section className="space-y-3">
              <Label>Visibility</Label>
              <div className="space-y-2">
                {["private", "lab", "organisation"].map((value) => (
                  <label
                    key={value}
                    className={`flex cursor-pointer items-start gap-3 rounded-xl border px-3 py-2 ${
                      visibility === value ? "border-brand-500 bg-brand-50" : "hover:bg-muted"
                    }`}
                  >
                    <input
                      type="radio"
                      name="event-visibility"
                      value={value}
                      checked={visibility === value}
                      onChange={() => setVisibility(value as EventVisibility)}
                      className="mt-1"
                    />
                    <div>
                      <p className="font-medium capitalize">{value}</p>
                      <p className="text-xs text-muted-foreground">
                        {value === "private" && "Only you and invited attendees."}
                        {value === "lab" && "Visible to the lab."}
                        {value === "organisation" && "Visible to the wider organisation."}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            </section>
          </div>
        </div>

        <DialogFooter className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Button type="button" variant="outline" size="sm" onClick={handleDownloadICS} disabled={!icsContent}>
              Export .ics
            </Button>
            <span>{getRecurrenceSummary(recurrence)}</span>
          </div>
          <div className="flex gap-2">
            {isEditMode && onDelete && initialEvent && (
              <Button type="button" variant="destructive" onClick={handleDelete}>
                Delete
              </Button>
            )}
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="button" onClick={handleSubmit} disabled={!isValid} className="bg-brand-500 text-white hover:bg-brand-600">
              {mode === "create" ? "Create event" : "Save changes"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )

  function formatDateTimeLocal(date: Date) {
    const pad = (value: number) => `${value}`.padStart(2, "0")
    const year = date.getFullYear()
    const month = pad(date.getMonth() + 1)
    const day = pad(date.getDate())
    const hours = pad(date.getHours())
    const minutes = pad(date.getMinutes())
    return `${year}-${month}-${day}T${hours}:${minutes}`
  }
}


