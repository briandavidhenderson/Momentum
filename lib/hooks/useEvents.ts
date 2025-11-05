
import { useState, useEffect, useMemo, useCallback } from 'react';
import { CalendarEvent, Person, Project, Workpackage } from '@/lib/types';

export function useEvents(visibleProjects: Project[], workpackages: Workpackage[], currentUser: any) {
  const [manualEvents, setManualEvents] = useState<CalendarEvent[]>([]);

  useEffect(() => {
    const storedEvents = localStorage.getItem('gantt-events');
    if (storedEvents) {
      const parsed = JSON.parse(storedEvents);
      const eventsWithDates = parsed.map((event: any) => ({
        ...event,
        start: new Date(event.start),
        end: new Date(event.end),
        createdAt: event.createdAt ? new Date(event.createdAt) : new Date(),
        updatedAt: event.updatedAt ? new Date(event.updatedAt) : undefined,
      }));
      setManualEvents(eventsWithDates);
    }
  }, []);

  useEffect(() => {
    const serialized = manualEvents.map((event) => ({
      ...event,
      start: event.start.toISOString(),
      end: event.end.toISOString(),
      createdAt: event.createdAt.toISOString(),
      updatedAt: event.updatedAt ? event.updatedAt.toISOString() : undefined,
    }));
    localStorage.setItem('gantt-events', JSON.stringify(serialized));
  }, [manualEvents]);

  const autoEvents = useMemo(() => {
    const generated: CalendarEvent[] = [];
    const createdBy = currentUser?.id ?? 'system';

    visibleProjects.forEach((project) => {
      const projectEnd = new Date(project.end);
      generated.push({
        id: `auto-project-${project.id}`,
        title: `${project.name} deadline`,
        description: project.notes,
        start: projectEnd,
        end: new Date(projectEnd.getTime() + 60 * 60 * 1000),
        recurrence: undefined,
        attendees: [],
        reminders: [],
        tags: ['project', 'deadline'],
        visibility: 'lab',
        ownerId: project.principalInvestigatorId,
        relatedIds: { projectId: project.id },
        type: 'deadline',
        notes: project.notes,
        createdBy,
        createdAt: new Date(),
      });

      project.tasks?.forEach((task) => {
        const taskEnd = new Date(task.end);
        const attendees = new Set<string>();
        if (task.primaryOwner) attendees.add(task.primaryOwner);
        task.helpers?.forEach((helper) => attendees.add(helper));

        generated.push({
          id: `auto-task-${task.id}`,
          title: task.name,
          description: task.notes,
          start: taskEnd,
          end: new Date(taskEnd.getTime() + 45 * 60 * 1000),
          recurrence: undefined,
          attendees: Array.from(attendees).map((personId) => ({ personId })),
          reminders: [],
          tags: ['task', 'deadline'],
          visibility: 'lab',
          ownerId: task.primaryOwner,
          relatedIds: { projectId: project.id, taskId: task.id },
          type: 'deadline',
          notes: task.notes,
          createdBy,
          createdAt: new Date(),
        });
      });
    });

    workpackages.forEach((workpackage) => {
      const wpEnd = new Date(workpackage.end);
      generated.push({
        id: `auto-workpackage-${workpackage.id}`,
        title: `Workpackage checkpoint: ${workpackage.name}`,
        description: workpackage.notes,
        start: wpEnd,
        end: new Date(wpEnd.getTime() + 60 * 60 * 1000),
        recurrence: undefined,
        attendees: workpackage.ownerId ? [{ personId: workpackage.ownerId }] : [],
        reminders: [],
        tags: ['workpackage', 'checkpoint'],
        visibility: 'lab',
        ownerId: workpackage.ownerId,
        relatedIds: { workpackageId: workpackage.id, masterProjectId: workpackage.profileProjectId },
        type: 'milestone',
        notes: workpackage.notes,
        createdBy,
        createdAt: new Date(),
      });
    });

    return generated;
  }, [visibleProjects, workpackages, currentUser]);

  const upcomingEvents = useMemo(() => {
    const manualIds = new Set(manualEvents.map((event) => event.id));
    const manual = manualEvents.map((event) => ({
      ...event,
      start: new Date(event.start),
      end: new Date(event.end),
    }));
    const auto = autoEvents
      .filter((event) => !manualIds.has(event.id))
      .map((event) => ({
        ...event,
        start: new Date(event.start),
        end: new Date(event.end),
      }));

    return [...manual, ...auto].sort((a, b) => a.start.getTime() - b.start.getTime());
  }, [manualEvents, autoEvents]);

  const handleCreateEvent = useCallback(() => {
    // This will be handled by the UI hook
  }, []);

  const handleSaveEvent = useCallback((event: CalendarEvent) => {
    setManualEvents((prev) => {
      const exists = prev.some((current) => current.id === event.id);
      if (exists) {
        return prev.map((current) => (current.id === event.id ? event : current));
      }
      return [...prev, event];
    });
  }, []);

  const handleSelectEvent = useCallback((event: CalendarEvent) => {
    // This will be handled by the UI hook
  }, []);

  const handleDeleteEvent = useCallback((eventId: string) => {
    setManualEvents((prev) => prev.filter((event) => event.id !== eventId));
  }, []);

  const handleAssignPersonToEvent = useCallback((eventId: string, person: Person) => {
    setManualEvents((prev) => {
      const index = prev.findIndex((event) => event.id === eventId);
      if (index >= 0) {
        const existing = prev[index];
        if (existing.attendees.some((attendee) => attendee.personId === person.id)) {
          return prev;
        }
        const updated: CalendarEvent = {
          ...existing,
          attendees: [...existing.attendees, { personId: person.id }],
          updatedAt: new Date(),
        };
        const clone = [...prev];
        clone[index] = updated;
        return clone;
      }

      const autoMatch = autoEvents.find((event) => event.id === eventId);
      if (autoMatch) {
        const updated: CalendarEvent = {
          ...autoMatch,
          attendees: [...(autoMatch.attendees || []), { personId: person.id }],
          updatedAt: new Date(),
          createdBy: autoMatch.createdBy || currentUser?.id || 'system',
        };
        return [...prev, updated];
      }

      return prev;
    });
  }, [autoEvents, currentUser?.id]);

  return {
    upcomingEvents,
    handleCreateEvent,
    handleSaveEvent,
    handleSelectEvent,
    handleDeleteEvent,
    handleAssignPersonToEvent,
  };
}
