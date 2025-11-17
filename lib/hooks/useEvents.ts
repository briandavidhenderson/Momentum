
import { useState, useEffect, useMemo, useCallback } from 'react';
import { CalendarEvent, Person, Project, Workpackage, PersonProfile } from '@/lib/types';
import { logger } from '@/lib/logger';

export function useEvents(visibleProjects: Project[], workpackages: Workpackage[], currentUser: PersonProfile | null) {
  const [manualEvents, setManualEvents] = useState<CalendarEvent[]>([]);

  useEffect(() => {
    const storedEvents = localStorage.getItem('gantt-events');
    if (storedEvents) {
      try {
        const parsed = JSON.parse(storedEvents);
        const eventsWithDates = parsed.map((event: any) => {
          const start = new Date(event.start);
          const end = new Date(event.end);
          const createdAt = event.createdAt ? new Date(event.createdAt) : new Date();
          const updatedAt = event.updatedAt ? new Date(event.updatedAt) : undefined;

          // Validate dates
          if (isNaN(start.getTime()) || isNaN(end.getTime()) || (createdAt && isNaN(createdAt.getTime()))) {
            logger.error('Invalid date found in stored event', new Error('Invalid date'), { event });
            return null;
          }

          return {
            ...event,
            start,
            end,
            createdAt,
            updatedAt,
          };
        }).filter(Boolean); // Remove null entries from invalid dates

        setManualEvents(eventsWithDates);
      } catch (error) {
        logger.error('Error parsing stored events from localStorage', error);
        // Clear invalid data
        localStorage.removeItem('gantt-events');
      }
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
      const projectEnd = new Date(project.endDate);
      // Validate date
      if (isNaN(projectEnd.getTime())) {
        logger.error('Invalid project end date', new Error('Invalid date'), { project });
        return;
      }
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
        ownerId: project.principalInvestigatorIds?.[0],
        relatedIds: { projectId: project.id },
        type: 'deadline',
        notes: project.notes,
        createdBy,
        createdAt: new Date(),
      });

      // Note: Tasks are now accessed through workpackages, not directly from projects
      // Task deadline events are generated from workpackage tasks below
    });

    workpackages.forEach((workpackage) => {
      const wpEnd = new Date(workpackage.end);
      // Validate date
      if (isNaN(wpEnd.getTime())) {
        logger.error('Invalid workpackage end date', new Error('Invalid date'), { workpackage });
        return;
      }
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
        relatedIds: { workpackageId: workpackage.id, masterProjectId: workpackage.projectId },
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
