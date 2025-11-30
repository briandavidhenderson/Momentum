

const mockGet = jest.fn();
const mockSet = jest.fn();
const mockUpdate = jest.fn();
const mockDelete = jest.fn();
const mockAdd = jest.fn();
const mockCommit = jest.fn();

const mockDoc = {
    get: mockGet,
    set: mockSet,
    update: mockUpdate,
    delete: mockDelete,
};

const mockCollection = {
    doc: jest.fn(() => mockDoc),
    add: mockAdd,
    where: jest.fn(() => ({
        get: mockGet,
    })),
    get: mockGet,
};

const firestoreInstance = {
    collection: jest.fn(() => mockCollection),
    batch: jest.fn(() => ({
        set: mockSet,
        update: mockUpdate,
        delete: mockDelete,
        commit: mockCommit,
    })),
};

const firestoreFn = jest.fn(() => firestoreInstance);

(firestoreFn as any).FieldValue = {
    serverTimestamp: jest.fn(),
    increment: jest.fn(),
    arrayUnion: jest.fn(),
    arrayRemove: jest.fn(),
};

const authFn = jest.fn(() => ({
    verifyIdToken: jest.fn(),
    getUser: jest.fn(),
}));

const initializeAppFn = jest.fn();

const databaseFn = jest.fn();
(databaseFn as any).DataSnapshot = class DataSnapshot {
    val() { return null; }
    exists() { return false; }
};

const adminMock = {
    firestore: firestoreFn,
    auth: authFn,
    initializeApp: initializeAppFn,
    database: databaseFn,
    credential: {
        cert: jest.fn(),
    },
    // Expose DataSnapshot at root for deep imports
    DataSnapshot: (databaseFn as any).DataSnapshot,
    DocumentSnapshot: class DocumentSnapshot {
        exists = false;
        data() { return undefined; }
    },
    QueryDocumentSnapshot: class QueryDocumentSnapshot {
        exists = true;
        data() { return {}; }
    },
};

// Use CommonJS export
module.exports = adminMock;
