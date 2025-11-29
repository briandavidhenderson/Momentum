export const mockInstance = {
    getSecret: jest.fn(),
    createSecret: jest.fn(),
    addSecretVersion: jest.fn(),
    accessSecretVersion: jest.fn(),
    deleteSecret: jest.fn(),
    setIamPolicy: jest.fn(),
    listSecrets: jest.fn()
};

export const SecretManagerServiceClient = jest.fn(() => mockInstance);
