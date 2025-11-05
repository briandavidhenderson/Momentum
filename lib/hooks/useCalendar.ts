
import { useState, useEffect } from 'react';
import { CalendarEvent } from '@/lib/types';
import {
  subscribeToEvents,
  createEvent,
  updateEvent,
  deleteEvent,
} from '@/lib/firestoreService';

export function useCalendar() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);

  useEffect(() => {
    const unsubscribe = subscribeToEvents((newEvents) => {
      setEvents(newEvents);
    });
    return () => unsubscribe();
  }, []);

  const handleCreateEvent = async (eventData: Omit<CalendarEvent, 'id'>) => {
    const eventId = await createEvent(eventData);
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
