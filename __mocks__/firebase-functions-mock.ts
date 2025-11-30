export const https = {
    onCall: jest.fn((handler) => {
        const wrapped = (data: any, context: any) => handler(data, context);
        wrapped.run = handler; // For direct testing if needed
        return wrapped;
    }),
    HttpsError: class HttpsError extends Error {
        code: string;
        details: any;
        constructor(code: string, message: string, details?: any) {
            super(message);
            this.code = code;
            this.details = details;
        }
    },
};

export const config = jest.fn(() => ({}));

export const database = {
    DataSnapshot: class DataSnapshot {
        val() { return null; }
        exists() { return false; }
    }
};

export const pubsub = {
    Message: class Message {
        json: any;
        constructor(data: any) { this.json = data; }
    }
};
