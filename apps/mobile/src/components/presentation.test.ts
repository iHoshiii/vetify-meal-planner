import { describe, expect, it } from 'vitest';
import { foodNotesText, userMessage } from './presentation';

describe('user-facing error messages', () => {
  it.each([
    'TypeError: Unexpected token in JSON',
    'MongoServerSelectionError: timeout',
    'Request failed at http://192.168.8.34:8000/api/v1',
    'C:\\Users\\Owner\\app\\node_modules\\file.js',
    'Invalid input: expected number, received string',
  ])('hides implementation details: %s', (message) => {
    expect(userMessage(message, 'Unable to save. Try again.')).toBe('Unable to save. Try again.');
  });
  it('keeps actionable validation and account messages', () => {
    for (const message of [
      'Create an account first to use the app.',
      'Account already exist. Please login.',
      'The measurement date cannot be in the future.',
      'File sharing is unavailable on this device.',
    ])
      expect(userMessage(message)).toBe(message);
    expect(userMessage('Network request failed')).toBe(
      'Unable to connect. Check your connection and try again.',
    );
    expect(userMessage(undefined)).toBe('');
  });
});

it('preserves custom food notes exactly', () => {
  const notes = 'My recipe: USDA source, measured 10 g on 2026-10-10.';
  expect(foodNotesText(notes, false)).toBe(notes);
});
