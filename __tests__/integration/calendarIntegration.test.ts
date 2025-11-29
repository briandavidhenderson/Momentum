import * as admin from 'firebase-admin';
import functions from 'firebase-functions-test';
import { unlinkGoogleCalendar } from '../../firebase/functions/src/calendar-google';

// Set emulator env vars
process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';
process.env.FIREBASE_AUTH_EMULATOR_HOST = 'localhost:9099';
process.env.GCLOUD_PROJECT = 'momentum-a60c5';

// Mock calendar-token-service
jest.mock('../../firebase/functions/src/calendar-token-service', () => ({
    deleteTokens: jest.fn().mockResolvedValue(undefined),
    storeTokens: jest.fn().mockResolvedValue(undefined),
}));

// Initialize test sdk
const testEnv = functions({
    projectId: 'momentum-a60c5',
});

// Initialize admin if not already
if (!admin.apps.length) {
    admin.initializeApp({
        projectId: 'momentum-a60c5'
    });
}

describe('Calendar Integration', () => {
    let wrappedUnlink: any;

    beforeAll(() => {
        wrappedUnlink = testEnv.wrap(unlinkGoogleCalendar);
    });

    afterAll(() => {
        testEnv.cleanup();
    });

    it('should unlink google calendar and update profile', async () => {
        const userId = 'test-user-integration';
        const connectionId = `google_${userId}_123`;
        const profileId = 'profile-123';

        // 1. Setup User and Profile in Emulator
        await admin.firestore().collection('users').doc(userId).set({
            profileId,
            isAdministrator: false
        });

        await admin.firestore().collection('personProfiles').doc(profileId).set({
            'calendarConnections': {
                'google': connectionId,
                'googleEmail': 'test@example.com',
                'googleUpdatedAt': new Date().toISOString()
            }
        });

        // 2. Call the function
        const context = {
            auth: {
                uid: userId
            }
        };
        const data = {
            connectionId
        };

        await wrappedUnlink(data, context);

        // 3. Verify Profile Update
        const updatedProfile = await admin.firestore().collection('personProfiles').doc(profileId).get();
        const profileData = updatedProfile.data();

        expect(profileData?.calendarConnections?.google).toBeUndefined();
        expect(profileData?.calendarConnections?.googleEmail).toBeUndefined();
    });
});
