import { useState, useEffect, useMemo } from 'react';
import { CalendarEvent, Project, Workpackage } from '@/lib/types';
import {
  subscribeToEvents,
  createEvent,
  updateEvent,
  deleteEvent,
} from '@/lib/firestoreService';
import { useAuth } from './useAuth';
import { logger } from '@/lib/logger';

export function useCalendar(projects: Project[] = [], workpackages: Workpackage[] = []) {
  const { currentUserProfile: profile, currentUser } = useAuth();
  const [firestoreEvents, setFirestoreEvents] = useState<CalendarEvent[]>([]);

  useEffect(() => {
    if (!profile?.labId && !currentUser?.uid) return;

    const unsubscribe = subscribeToEvents({
      labId: profile?.labId,
      userId: currentUser?.uid,
      profileId: profile?.id,
    }, (newEvents) => {
      setFirestoreEvents(newEvents);
    });
    return () => unsubscribe();
  }, [profile?.labId, currentUser?.uid]);

  const autoEvents = useMemo(() => {
    const generated: CalendarEvent[] = [];
    const createdBy = currentUser?.uid ?? 'system';

    projects.forEach((project) => {
      if (!project.endDate) return;
      const projectEnd = new Date(project.endDate);
      // Validate date
      if (isNaN(projectEnd.getTime())) {
        return;
      }
      generated.push({
        id: `auto-project-${project.id}`,
        title: `${project.name} deadline`,
        description: undefined,
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
        notes: undefined,
        createdBy,
        createdAt: new Date(),
        labId: project.labId
      });
    });

    workpackages.forEach((workpackage) => {
      if (!workpackage.end) return;
      const wpEnd = new Date(workpackage.end);
      // Validate date
      if (isNaN(wpEnd.getTime())) {
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
  }, [projects, workpackages, currentUser?.uid]);

  const events = useMemo(() => {
    // Merge firestore events and auto events
    // If IDs conflict, firestore events take precedence (though IDs should be distinct)
    const firestoreIds = new Set(firestoreEvents.map(e => e.id));
    const uniqueAutoEvents = autoEvents.filter(e => !firestoreIds.has(e.id));
    return [...firestoreEvents, ...uniqueAutoEvents];
  }, [firestoreEvents, autoEvents]);

  const handleCreateEvent = async (eventData: Omit<CalendarEvent, 'id' | 'labId'>) => {
    if (!profile) return;
    const eventId = await createEvent({ ...eventData, labId: profile.labId });
    return eventId;
  };

  const handleUpdateEvent = async (
    eventId: string,
    updates: Partial<CalendarEvent>
  ) => {
    // Prevent updating auto-generated events
    if (eventId.startsWith('auto-')) {
      logger.warn('Cannot update auto-generated event');
      return;
    }
    await updateEvent(eventId, updates);
  };

  const handleDeleteEvent = async (eventId: string) => {
    // Prevent deleting auto-generated events
    if (eventId.startsWith('auto-')) {
      logger.warn('Cannot delete auto-generated event');
      return;
    }
    await deleteEvent(eventId);
  };

  return {
    events,
    handleCreateEvent,
    handleUpdateEvent,
    handleDeleteEvent,
  };
}
