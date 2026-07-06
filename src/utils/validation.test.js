import { describe, it, expect } from 'vitest';
import { validateEmail, validatePhone, validateName, validateAge, getValidationError } from './validation';

describe('validation utils', () => {
  it('validates emails', () => {
    expect(validateEmail('a@b.com')).toBe(true);
    expect(validateEmail('nope')).toBe(false);
  });

  it('validates Iraqi phone numbers', () => {
    expect(validatePhone('07712345678')).toBeTruthy();
    expect(validatePhone('123')).toBeFalsy();
  });

  it('validates names by length', () => {
    expect(validateName('Ali')).toBe(true);
    expect(validateName('A')).toBe(false);
  });

  it('validates age range', () => {
    expect(validateAge(25)).toBe(true);
    expect(validateAge(200)).toBe(false);
  });

  it('returns field error messages', () => {
    expect(getValidationError('name', '')).toMatch(/required/i);
    expect(getValidationError('email', 'bad')).toMatch(/invalid/i);
    expect(getValidationError('name', 'Sara')).toBeNull();
  });
});
