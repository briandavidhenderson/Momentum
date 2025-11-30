import * as admin from 'firebase-admin';
import functions from 'firebase-functions-test';
import {
    migrateTokensToSecretManager,
    verifyTokenMigration,
    cleanupFirestoreTokens
} from '../firebase/functions/src/migrate-tokens-to-secret-manager';
import * as tokenService from '../firebase/functions/src/calendar-token-service';

// Initialize test sdk
const testEnv = functions();

// Mock calendar-token-service
jest.mock('../firebase/functions/src/calendar-token-service', () => ({
    storeTokens: jest.fn(),
    tokensExist: jest.fn(),
}));

// Firebase Admin is mocked via jest.config.js moduleNameMapper pointing to __mocks__/firebase-admin-mock.ts

describe('migrationService', () => {
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

        // Get mock instances from the module (which is the manual mock)
        mockFirestore = admin.firestore();
        mockCollection = mockFirestore.collection();
        mockDoc = mockCollection.doc();
        mockGet = mockDoc.get;
        mockBatch = mockFirestore.batch();

        // Reset default mock behaviors
        mockGet.mockResolvedValue({
            exists: true,
            data: () => ({ isAdministrator: true }),
            docs: [],
            size: 0
        });
    });

    describe('migrateTokensToSecretManager', () => {
        it('should fail if not authenticated', async () => {
            await expect(migrateTokensToSecretManager({}, {})).rejects.toThrow('Must be logged in');
        });

        it('should fail if not admin', async () => {
            mockGet.mockResolvedValueOnce({
                exists: true,
                data: () => ({ isAdministrator: false })
            });
            await expect(migrateTokensToSecretManager({}, mockContext)).rejects.toThrow('Only administrators');
        });

        it('should migrate tokens successfully', async () => {
            // Mock connections
            const mockConnections = {
                docs: [{
                    id: 'conn-1',
                    data: () => ({ userId: 'user-1', provider: 'google' })
                }],
                size: 1
            };

            // Mock tokens
            const mockTokens = {
                docs: [{
                    id: 'conn-1',
                    data: () => ({ accessToken: 'token', refreshToken: 'refresh' })
                }],
                size: 1
            };

            mockGet
                .mockResolvedValueOnce({ exists: true, data: () => ({ isAdministrator: true }) }) // User check
                .mockResolvedValueOnce(mockConnections) // Get connections
                .mockResolvedValueOnce(mockTokens); // Get tokens

            (tokenService.tokensExist as jest.Mock)
                .mockResolvedValueOnce(false) // Check if migrated (no)
                .mockResolvedValueOnce(true); // Verify after migration (yes)

            const result = await migrateTokensToSecretManager({}, mockContext);

            expect(result.migrated).toBe(1);
            expect(tokenService.storeTokens).toHaveBeenCalled();
        });
    });

    describe('verifyTokenMigration', () => {
        it('should verify migration status', async () => {
            const mockConnections = {
                docs: [{
                    id: 'conn-1',
                    data: () => ({ userId: 'user-1', provider: 'google' })
                }],
                size: 1
            };

            mockGet
                .mockResolvedValueOnce({ exists: true, data: () => ({ isAdministrator: true }) })
                .mockResolvedValueOnce(mockConnections);

            (tokenService.tokensExist as jest.Mock).mockResolvedValue(true);

            const result = await verifyTokenMigration({}, mockContext);

            expect(result.allMigrated).toBe(true);
            expect(result.migrated).toBe(1);
        });
    });

    describe('cleanupFirestoreTokens', () => {
        it('should require confirmation code', async () => {
            await expect(cleanupFirestoreTokens({}, mockContext)).rejects.toThrow('confirmation code');
        });

        it('should delete tokens if verified', async () => {
            // Mock verification success inside cleanup
            // Simulating db calls for verification:
            const mockConnections = {
                docs: [{ id: 'conn-1', data: () => ({}) }],
                size: 1
            };

            mockGet
                .mockResolvedValueOnce({ exists: true, data: () => ({ isAdministrator: true }) }) // Auth check
                .mockResolvedValueOnce({ exists: true, data: () => ({ isAdministrator: true }) }) // Verify auth check
                .mockResolvedValueOnce(mockConnections) // Verify get connections
                .mockResolvedValueOnce({ docs: [{ ref: 'ref' }] }); // Get tokens to delete

            (tokenService.tokensExist as jest.Mock).mockResolvedValue(true);

            const result = await cleanupFirestoreTokens({ confirmationCode: 'DELETE_FIRESTORE_TOKENS' }, mockContext);

            expect(result.success).toBe(true);
            expect(mockBatch.delete).toHaveBeenCalled();
            expect(mockBatch.commit).toHaveBeenCalled();
        });
    });
});
