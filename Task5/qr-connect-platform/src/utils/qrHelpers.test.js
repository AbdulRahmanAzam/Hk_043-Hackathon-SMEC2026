import { makeQRPayload, parseQRPayload } from './qrHelpers';

// Mock env for tests
const OLD_ENV = process.env;

beforeEach(() => {
  jest.resetModules();
  process.env = { ...OLD_ENV };
});

afterAll(() => {
  process.env = OLD_ENV;
});

test('makeQRPayload returns plain JSON when no key', () => {
  process.env.REACT_APP_ENCRYPTION_KEY = '';
  const user = { id: 'u1', name: 'Test User', username: '@test' };
  const value = makeQRPayload(user, true);
  const obj = JSON.parse(value);
  expect(obj.userId).toBe('u1');
  expect(obj.name).toBe('Test User');
});

test('makeQRPayload returns encrypted wrapper when key is set', () => {
  process.env.REACT_APP_ENCRYPTION_KEY = 'secret';
  const user = { id: 'u1', name: 'Test User', username: '@test' };
  const value = makeQRPayload(user, true);
  const obj = JSON.parse(value);
  expect(obj.enc).toBe('AES');
  expect(typeof obj.data).toBe('string');
});

test('parseQRPayload decrypts encrypted payload', () => {
  process.env.REACT_APP_ENCRYPTION_KEY = 'secret';
  const user = { id: 'u2', name: 'Alice', username: '@alice' };
  const enc = makeQRPayload(user, true);
  const parsed = parseQRPayload(enc);
  expect(parsed.userId).toBe('u2');
  expect(parsed.username).toBe('@alice');
});

test('privacy toggles omit fields in payload', () => {
  process.env.REACT_APP_ENCRYPTION_KEY = '';
  const user = { id: 'u3', name: 'Bob', username: '@bob', shareName: false, shareUsername: false };
  const value = makeQRPayload(user, true);
  const obj = JSON.parse(value);
  expect(obj.userId).toBe('u3');
  expect(obj.name).toBeUndefined();
  expect(obj.username).toBeUndefined();
});