import * as admin from 'firebase-admin';
import {
    normalizeGoogleEvent,
    syncGoogleCalendarEvents,
    getAccessToken
} from '../firebase/functions/src/calendar-sync';
import * as tokenService from '../firebase/functions/src/calendar-token-service';

// Mock calendar-token-service
jest.mock('../firebase/functions/src/calendar-token-service', () => ({
    getTokens: jest.fn(),
    updateTokens: jest.fn(),
    tokensExist: jest.fn(),
}));

// Mock global fetch
global.fetch = jest.fn();

describe('calendarSync', () => {
    let mockFirestore: any;
    let mockCollection: any;
    let mockDoc: any;
    let mockGet: any;
    let mockUpdate: any;
    let mockSet: any;
    let mockDelete: any;
    let mockAdd: any;

    beforeEach(() => {
        jest.clearAllMocks();

        // Mock Firestore
        mockFirestore = admin.firestore();
        mockCollection = mockFirestore.collection();
        mockDoc = mockCollection.doc();
        mockGet = mockDoc.get;
        mockUpdate = mockDoc.update;
        mockSet = mockDoc.set;
        mockDelete = mockDoc.delete;
        mockAdd = mockCollection.add;

        // Default mock behaviors
        mockGet.mockResolvedValue({
            exists: true,
            data: () => ({
                calendars: [{ id: 'cal-1', isSelected: true }],
                syncToken: 'sync-token-1'
            })
        });

        mockAdd.mockResolvedValue({ id: 'new-doc-id' });
    });

    describe('normalizeGoogleEvent', () => {
        it('should normalize a valid Google event', () => {
            const googleEvent = {
                id: 'evt-1',
                summary: 'Test Event',
                start: { dateTime: '2023-01-01T10:00:00Z' },
                end: { dateTime: '2023-01-01T11:00:00Z' }
            };

            const result = normalizeGoogleEvent(googleEvent, 'user-1', 'conn-1', 'cal-1');

            expect(result.id).toBe('google-conn-1-evt-1');
            expect(result.title).toBe('Test Event');
            expect(result.start).toEqual(new Date('2023-01-01T10:00:00Z'));
            expect(result.calendarSource).toBe('google');
        });

        it('should throw error if missing dates', () => {
            const googleEvent = {
                id: 'evt-1',
                summary: 'Test Event'
            };

            expect(() => normalizeGoogleEvent(googleEvent, 'user-1', 'conn-1', 'cal-1'))
                .toThrow('Event missing start or end time');
        });
    });

    describe('getAccessToken', () => {
        it('should return token from Secret Manager if valid', async () => {
            (tokenService.getTokens as jest.Mock).mockResolvedValue({
                accessToken: 'valid-token',
                expiresAt: Date.now() + 3600000
            });

            const token = await getAccessToken('conn-1');
            expect(token).toBe('valid-token');
        });

        it('should refresh token if expired', async () => {
            (tokenService.getTokens as jest.Mock).mockResolvedValue({
                accessToken: 'expired-token',
                refreshToken: 'refresh-token',
                expiresAt: Date.now() - 1000,
                provider: 'google'
            });

            (tokenService.tokensExist as jest.Mock).mockResolvedValue(true);

            (global.fetch as jest.Mock).mockResolvedValue({
                ok: true,
                json: async () => ({
                    access_token: 'new-token',
                    expires_in: 3600
                })
            });

            const token = await getAccessToken('conn-1');
            expect(token).toBe('new-token');
            expect(tokenService.updateTokens).toHaveBeenCalled();
        });
    });

    describe('syncGoogleCalendarEvents', () => {
        it('should sync events successfully', async () => {
            // Mock getAccessToken to return a token
            (tokenService.getTokens as jest.Mock).mockResolvedValue({
                accessToken: 'valid-token',
                expiresAt: Date.now() + 3600000
            });

            // Mock Google API response
            (global.fetch as jest.Mock).mockResolvedValue({
                ok: true,
                json: async () => ({
                    items: [
                        {
                            id: 'evt-1',
                            summary: 'Test Event',
                            start: { dateTime: '2023-01-01T10:00:00Z' },
                            end: { dateTime: '2023-01-01T11:00:00Z' }
                        }
                    ],
                    nextSyncToken: 'new-sync-token'
                })
            });

            // Mock existing event check (does not exist)
            mockGet
                .mockResolvedValueOnce({ // Connection doc
                    exists: true,
                    data: () => ({ calendars: [{ id: 'cal-1', isSelected: true }] })
                })
                .mockResolvedValueOnce({ // Event doc check
                    exists: false
                });

            const result = await syncGoogleCalendarEvents('user-1', 'conn-1');

            expect(result.status).toBe('success');
            expect(result.eventsImported).toBe(1);
            expect(mockSet).toHaveBeenCalled(); // Should create new event
            expect(mockUpdate).toHaveBeenCalled(); // Should update sync token
        });

        it('should handle cancelled events', async () => {
            // Mock getAccessToken
            (tokenService.getTokens as jest.Mock).mockResolvedValue({
                accessToken: 'valid-token',
                expiresAt: Date.now() + 3600000
            });

            // Mock Google API response with cancelled event
            (global.fetch as jest.Mock).mockResolvedValue({
                ok: true,
                json: async () => ({
                    items: [
                        {
                            id: 'evt-1',
                            status: 'cancelled'
                        }
                    ]
                })
            });

            const result = await syncGoogleCalendarEvents('user-1', 'conn-1');

            expect(result.status).toBe('success');
            expect(result.eventsDeleted).toBe(1);
            expect(mockDelete).toHaveBeenCalled();
        });
    });
});
