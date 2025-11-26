
import { useState, useEffect } from 'react';
import { CalendarEvent } from '@/lib/types';
import {
  subscribeToEvents,
  createEvent,
  updateEvent,
  deleteEvent,
} from '@/lib/firestoreService';
import { useAuth } from './useAuth';

export function useCalendar() {
  const { currentUserProfile: profile, currentUser } = useAuth();
  const [events, setEvents] = useState<CalendarEvent[]>([]);

  useEffect(() => {
    if (!profile?.labId && !currentUser?.uid) return;

    const unsubscribe = subscribeToEvents({
      labId: profile?.labId,
      userId: currentUser?.uid,
    }, (newEvents) => {
      setEvents(newEvents);
    });
    return () => unsubscribe();
  }, [profile?.labId, currentUser?.uid]);

  const handleCreateEvent = async (eventData: Omit<CalendarEvent, 'id' | 'labId'>) => {
    if (!profile) return;
    const eventId = await createEvent({ ...eventData, labId: profile.labId });
    return eventId;
  };

  const handleUpdateEvent = async (
    eventId: string,
    updates: Partial<CalendarEvent>
  ) => {
    await updateEvent(eventId, updates);
  };

  const handleDeleteEvent = async (eventId: string) => {
    await deleteEvent(eventId);
  };

  return {
    events,
    handleCreateEvent,
    handleUpdateEvent,
    handleDeleteEvent,
  };
}
