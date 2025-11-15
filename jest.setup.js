// Learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom'

// Polyfill for TextEncoder/TextDecoder (required for Firebase in Node.js test environment)
import { TextEncoder, TextDecoder } from 'util'
global.TextEncoder = TextEncoder
global.TextDecoder = TextDecoder

// Mock Firebase to avoid initialization issues in test environment
jest.mock('./lib/firebase', () => ({
  db: {},
  auth: {},
  storage: {},
}));
