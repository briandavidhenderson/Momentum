import {
    createEvent,
    updateEvent,
    deleteEvent,
    getEvents,
    subscribeToEvents,
    createCalendarConnection,
    getCalendarConnections,
    deleteCalendarConnection,
    createSyncConflict,
    resolveSyncConflict,
    createSyncLog
} from '@/lib/services/calendarService';
import {
    collection,
    doc,
    getDoc,
    getDocs,
    setDoc,
    updateDoc,
    deleteDoc,
    onSnapshot,
    writeBatch,
    Timestamp
} from 'firebase/firestore';

// Mock Firebase and Logger
jest.mock('@/lib/firebase', () => ({
    getFirebaseDb: jest.fn(() => ({}))
}));

jest.mock('@/lib/logger', () => ({
    logger: {
        info: jest.fn(),
        error: jest.fn(),
        warn: jest.fn()
    }
}));

jest.mock('firebase/firestore', () => {
    const originalModule = jest.requireActual('firebase/firestore');
    return {
        ...originalModule,
        collection: jest.fn(),
        doc: jest.fn(),
        getDoc: jest.fn(),
        getDocs: jest.fn(),
        setDoc: jest.fn(),
        updateDoc: jest.fn(),
        deleteDoc: jest.fn(),
        query: jest.fn(),
        where: jest.fn(),
        orderBy: jest.fn(),
        onSnapshot: jest.fn(),
        writeBatch: jest.fn(),
        serverTimestamp: jest.fn(() => 'mock-timestamp'),
        Timestamp: {
            fromDate: jest.fn((date) => ({ toDate: () => date })),
            now: jest.fn(() => ({ toDate: () => new Date() }))
        }
    };
});

describe('calendarService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (collection as jest.Mock).mockReturnValue('mock-collection-ref');
        (doc as jest.Mock).mockReturnValue({ id: 'mock-id' });
    });

    describe('Events', () => {
        const mockEvent = {
            title: 'Test Event',
            start: new Date(),
            end: new Date(),
            createdBy: 'user-1'
        };

        it('createEvent should create a document in "events" collection', async () => {
            await createEvent(mockEvent);

            expect(collection).toHaveBeenCalledWith(expect.anything(), 'events');
            expect(setDoc).toHaveBeenCalledWith(
                expect.objectContaining({ id: 'mock-id' }),
                expect.objectContaining({
                    title: 'Test Event',
                    id: 'mock-id'
                })
            );
        });

        it('updateEvent should update the document', async () => {
            await updateEvent('event-1', { title: 'Updated' });

            expect(doc).toHaveBeenCalledWith(expect.anything(), 'events', 'event-1');
            expect(updateDoc).toHaveBeenCalledWith(
                expect.objectContaining({ id: 'mock-id' }),
                { title: 'Updated' }
            );
        });

        it('deleteEvent should delete the document', async () => {
            await deleteEvent('event-1');

            expect(doc).toHaveBeenCalledWith(expect.anything(), 'events', 'event-1');
            expect(deleteDoc).toHaveBeenCalledWith(expect.objectContaining({ id: 'mock-id' }));
        });

        it('getEvents should return mapped events', async () => {
            const mockSnap = {
                docs: [{
                    data: () => ({
                        id: 'event-1',
                        title: 'Event 1',
                        start: { toDate: () => new Date() },
                        end: { toDate: () => new Date() }
                    })
                }]
            };
            (getDocs as jest.Mock).mockResolvedValue(mockSnap);

            const events = await getEvents();
            expect(events).toHaveLength(1);
            expect(events[0].id).toBe('event-1');
        });
    });

    describe('Calendar Connections', () => {
        const mockConnection = {
            userId: 'user-1',
            provider: 'google' as const,
            email: 'test@example.com',
            status: 'active' as const,
            lastSyncedAt: new Date().toISOString()
        };

        it('createCalendarConnection should create a document', async () => {
            await createCalendarConnection(mockConnection);

            expect(collection).toHaveBeenCalledWith(expect.anything(), 'calendarConnections');
            expect(setDoc).toHaveBeenCalled();
        });

        it('deleteCalendarConnection should perform batch deletion', async () => {
            const mockBatch = {
                delete: jest.fn(),
                commit: jest.fn().mockResolvedValue(undefined)
            };
            (writeBatch as jest.Mock).mockReturnValue(mockBatch);
            (getDocs as jest.Mock).mockResolvedValue({ docs: [], size: 0 }); // Mock empty conflicts/logs

            await deleteCalendarConnection('conn-1');

            expect(writeBatch).toHaveBeenCalled();
            expect(mockBatch.delete).toHaveBeenCalled(); // Should delete connection
            expect(mockBatch.commit).toHaveBeenCalled();
        });
    });

    describe('Sync Conflicts', () => {
        it('createSyncConflict should create a document', async () => {
            await createSyncConflict({
                connectionId: 'conn-1',
                eventId: 'evt-1',
                type: 'modified',
                details: {},
                resolved: false,
                createdAt: '2024-01-01',
                userId: 'user-1'
            });

            expect(collection).toHaveBeenCalledWith(expect.anything(), 'calendarConflicts');
            expect(setDoc).toHaveBeenCalled();
        });

        it('resolveSyncConflict should update the document', async () => {
            await resolveSyncConflict('conflict-1', 'keep_momentum', 'admin');

            expect(doc).toHaveBeenCalledWith(expect.anything(), 'calendarConflicts', 'conflict-1');
            expect(updateDoc).toHaveBeenCalledWith(
                expect.anything(),
                expect.objectContaining({
                    resolved: true,
                    resolution: 'keep_momentum'
                })
            );
        });
    });

    describe('Sync Logs', () => {
        it('createSyncLog should create a document', async () => {
            await createSyncLog({
                connectionId: 'conn-1',
                userId: 'user-1',
                status: 'success',
                syncStartedAt: '2024-01-01'
            });

            expect(collection).toHaveBeenCalledWith(expect.anything(), 'calendarSyncLogs');
            expect(setDoc).toHaveBeenCalled();
        });
    });
});
