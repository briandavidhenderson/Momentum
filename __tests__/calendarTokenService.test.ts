import { mockInstance } from '@google-cloud/secret-manager';
import * as admin from 'firebase-admin';
import {
    storeTokens,
    getTokens,
    updateTokens,
    deleteTokens
} from '../firebase/functions/src/calendar-token-service';

// Secret Manager is auto-mocked via jest.config.js moduleNameMapper
// We import mockInstance which is exported from our manual mock

// Manual mock for Firebase Admin
jest.mock('firebase-admin', () => {
    const mockAdd = jest.fn();
    const mockCollection = jest.fn(() => ({ add: mockAdd }));
    const mockFirestore = jest.fn(() => ({
        collection: mockCollection
    }));
    (mockFirestore as any).FieldValue = {
        serverTimestamp: jest.fn()
    };
    return {
        firestore: mockFirestore
    };
});

describe('calendarTokenService', () => {
    const mockConnectionId = 'conn-1';
    const mockTokenData = {
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        expiresAt: 1234567890,
        provider: 'google' as const,
        userId: 'user-1',
        email: 'test@example.com',
        createdAt: '2024-01-01',
        lastRefreshedAt: '2024-01-01'
    };

    // We use the singleton mock instance
    const mockSecretManager = mockInstance as any;

    beforeEach(() => {
        jest.clearAllMocks();
        process.env.GCLOUD_PROJECT = 'test-project';

        // Setup default successful responses
        mockSecretManager.getSecret.mockResolvedValue([{}]);
        mockSecretManager.createSecret.mockResolvedValue([{ name: 'secret-name' }]);
        mockSecretManager.addSecretVersion.mockResolvedValue([{}]);
        mockSecretManager.accessSecretVersion.mockResolvedValue([{
            payload: { data: Buffer.from(JSON.stringify({ ...mockTokenData, connectionId: mockConnectionId })) }
        }]);
        mockSecretManager.deleteSecret.mockResolvedValue([{}]);
        mockSecretManager.setIamPolicy.mockResolvedValue([{}]);
    });

    afterEach(() => {
        delete process.env.GCLOUD_PROJECT;
    });

    describe('storeTokens', () => {
        it('should create a new secret if it does not exist', async () => {
            mockSecretManager.getSecret.mockRejectedValue({ code: 5 }); // NOT_FOUND

            await storeTokens(mockConnectionId, mockTokenData);

            expect(mockSecretManager.createSecret).toHaveBeenCalled();
            expect(mockSecretManager.addSecretVersion).toHaveBeenCalled();
        });

        it('should add a new version if secret exists', async () => {
            mockSecretManager.getSecret.mockResolvedValue([{}]);

            await storeTokens(mockConnectionId, mockTokenData);

            expect(mockSecretManager.createSecret).not.toHaveBeenCalled();
            expect(mockSecretManager.addSecretVersion).toHaveBeenCalled();
        });
    });

    describe('getTokens', () => {
        it('should retrieve and parse tokens', async () => {
            const tokens = await getTokens(mockConnectionId);
            expect(tokens).toMatchObject(mockTokenData);
        });
    });

    describe('updateTokens', () => {
        it('should get existing tokens and store updated version', async () => {
            await updateTokens(mockConnectionId, { accessToken: 'new-access-token' });

            expect(mockSecretManager.addSecretVersion).toHaveBeenCalled();
            const callArgs = mockSecretManager.addSecretVersion.mock.calls[0][0];
            const sentPayload = JSON.parse(callArgs.payload.data.toString());
            expect(sentPayload.accessToken).toBe('new-access-token');
        });
    });

    describe('deleteTokens', () => {
        it('should delete the secret', async () => {
            await deleteTokens(mockConnectionId);
            expect(mockSecretManager.deleteSecret).toHaveBeenCalled();
        });
    });
});
