import * as admin from 'firebase-admin';
import functions from 'firebase-functions-test';
import {
    auditCalendarCollections,
    getOrphanedConflicts,
    migrateOrphanedConflicts
} from '../firebase/functions/src/audit-calendar-collections';

// Initialize test sdk
const testEnv = functions();

// Firebase Admin is mocked via jest.config.js moduleNameMapper pointing to __mocks__/firebase-admin-mock.ts

describe('auditCalendarCollections', () => {
    const mockContext = {
        auth: {
            uid: 'admin-user'
        }
    };

    let mockFirestore: any;
    let mockCollection: any;
    let mockDoc: any;
    let mockGet: any;
    let mockBatch: any;

    beforeEach(() => {
        jest.clearAllMocks();

        // Get mock instances
        mockFirestore = admin.firestore();
        mockCollection = mockFirestore.collection();
        mockDoc = mockCollection.doc();
        mockGet = mockDoc.get;
        mockBatch = mockFirestore.batch();

        // Default mock behaviors
        mockGet.mockResolvedValue({
            exists: true,
            data: () => ({ isAdministrator: true }),
            docs: [],
            size: 0,
            empty: true
        });

        // Mock count()
        mockCollection.count = jest.fn().mockReturnValue({
            get: jest.fn().mockResolvedValue({
                data: () => ({ count: 0 })
            })
        });

        // Mock where()
        mockCollection.where = jest.fn().mockReturnValue(mockCollection);
    });

    describe('auditCalendarCollections', () => {
        it('should fail if not authenticated', async () => {
            await expect(auditCalendarCollections({}, {})).rejects.toThrow('Must be logged in');
        });

        it('should fail if not admin', async () => {
            mockGet.mockResolvedValueOnce({
                exists: true,
                data: () => ({ isAdministrator: false })
            });
            await expect(auditCalendarCollections({}, mockContext)).rejects.toThrow('Only administrators');
        });

        it('should return healthy status when no issues found', async () => {
            // Mock counts to be 0
            mockCollection.count.mockReturnValue({
                get: jest.fn().mockResolvedValue({ data: () => ({ count: 0 }) })
            });

            const result = await auditCalendarCollections({}, mockContext);

            expect(result.status).toBe('healthy');
            expect(result.findings).toHaveLength(1); // Info finding for orphaned data
            expect(result.findings[0].severity).toBe('info');
        });

        it('should detect orphaned data in calendarSyncConflicts', async () => {
            // Mock specific count for calendarSyncConflicts
            mockCollection.count.mockImplementation(function (this: any) {
                // We can't easily check which collection called count() in this mock setup without more complex logic
                // So we'll rely on the order of calls or just mock the return values in sequence if possible
                // OR we can spy on collection() to return different mocks based on name
                return { get: jest.fn().mockResolvedValue({ data: () => ({ count: 0 }) }) };
            });

            // Re-mock collection to handle specific collection names
            const originalCollection = mockFirestore.collection;
            mockFirestore.collection = jest.fn((name) => {
                const col = originalCollection(name);
                if (name === 'calendarSyncConflicts') {
                    col.count = jest.fn().mockReturnValue({
                        get: jest.fn().mockResolvedValue({ data: () => ({ count: 5 }) })
                    });
                }
                return col;
            });

            const result = await auditCalendarCollections({}, mockContext);

            expect(result.findings).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({
                        severity: 'critical',
                        affectedCollection: 'calendarSyncConflicts',
                        count: 5
                    })
                ])
            );
            expect(result.status).toBe('critical');
        });

        it('should detect token mismatch', async () => {
            // Re-mock collection to handle specific collection names
            const originalCollection = mockFirestore.collection;
            mockFirestore.collection = jest.fn((name) => {
                const col = originalCollection(name);
                if (name === 'calendarConnections') {
                    col.count = jest.fn().mockReturnValue({
                        get: jest.fn().mockResolvedValue({ data: () => ({ count: 2 }) })
                    });
                } else if (name === '_calendarTokens') {
                    col.count = jest.fn().mockReturnValue({
                        get: jest.fn().mockResolvedValue({ data: () => ({ count: 1 }) })
                    });
                }
                return col;
            });

            const result = await auditCalendarCollections({}, mockContext);

            expect(result.findings).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({
                        severity: 'warning',
                        category: 'data_mismatch'
                    })
                ])
            );
        });
    });

    describe('getOrphanedConflicts', () => {
        it('should return orphaned conflicts', async () => {
            const mockDocs = [
                { id: 'doc1', data: () => ({ title: 'Conflict 1' }) },
                { id: 'doc2', data: () => ({ title: 'Conflict 2' }) }
            ];

            mockFirestore.collection = jest.fn((name) => {
                const col = mockCollection;
                if (name === 'calendarSyncConflicts') {
                    col.get = jest.fn().mockResolvedValue({
                        docs: mockDocs,
                        size: 2
                    });
                }
                return col;
            });

            const result = await getOrphanedConflicts({}, mockContext);

            expect(result.count).toBe(2);
            expect(result.conflicts).toHaveLength(2);
            expect(result.migrationRequired).toBe(true);
        });
    });

    describe('migrateOrphanedConflicts', () => {
        it('should migrate conflicts using batch', async () => {
            const mockDocs = [
                { id: 'doc1', data: () => ({ title: 'Conflict 1' }), ref: 'ref1' },
                { id: 'doc2', data: () => ({ title: 'Conflict 2' }), ref: 'ref2' }
            ];

            mockFirestore.collection = jest.fn((name) => {
                const col = mockCollection;
                if (name === 'calendarSyncConflicts') {
                    col.get = jest.fn().mockResolvedValue({
                        docs: mockDocs,
                        size: 2,
                        empty: false
                    });
                }
                return col;
            });

            const result = await migrateOrphanedConflicts({}, mockContext);

            expect(result.success).toBe(true);
            expect(result.migrated).toBe(2);
            expect(mockBatch.set).toHaveBeenCalledTimes(2);
            expect(mockBatch.delete).toHaveBeenCalledTimes(2);
            expect(mockBatch.commit).toHaveBeenCalled();
        });

        it('should return early if no conflicts found', async () => {
            mockFirestore.collection = jest.fn((name) => {
                const col = mockCollection;
                if (name === 'calendarSyncConflicts') {
                    col.get = jest.fn().mockResolvedValue({
                        docs: [],
                        size: 0,
                        empty: true
                    });
                }
                return col;
            });

            const result = await migrateOrphanedConflicts({}, mockContext);

            expect(result.success).toBe(true);
            expect(result.migrated).toBe(0);
            expect(mockBatch.commit).not.toHaveBeenCalled();
        });
    });
});
