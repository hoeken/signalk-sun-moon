import { describe, it, expect } from 'vitest';
import { DateController } from '../../src/util/DateController.js';

describe('DateController.parts / isValid', () => {
  it('accepts real dates and rejects malformed or impossible ones', () => {
    expect(DateController.parts('2026-07-03')).toEqual({ y: 2026, mo: 7, d: 3 });
    expect(DateController.parts('2026-7-3')).toBeNull();
    expect(DateController.parts('2026-02-30')).toBeNull();
    expect(DateController.parts('nope')).toBeNull();
    expect(DateController.isValid('2024-02-29')).toBe(true);
    expect(DateController.isValid('2026-02-29')).toBe(false);
  });
});

describe('DateController.format', () => {
  it('formats a Date as zero-padded local YYYY-MM-DD', () => {
    // Constructed from local components, so this is timezone-independent.
    expect(DateController.format(new Date(2026, 6, 3))).toBe('2026-07-03');
    expect(DateController.format(new Date(2026, 0, 5))).toBe('2026-01-05');
  });
});

describe('DateController.shift', () => {
  it('moves whole calendar days, crossing month/year boundaries', () => {
    expect(DateController.shift('2026-07-03', 1)).toBe('2026-07-04');
    expect(DateController.shift('2026-07-03', -1)).toBe('2026-07-02');
    expect(DateController.shift('2026-07-31', 1)).toBe('2026-08-01');
    expect(DateController.shift('2026-12-31', 1)).toBe('2027-01-01');
    expect(DateController.shift('2026-01-01', -1)).toBe('2025-12-31');
  });

  it('handles leap-year February correctly', () => {
    expect(DateController.shift('2024-02-28', 1)).toBe('2024-02-29');
    expect(DateController.shift('2026-02-28', 1)).toBe('2026-03-01');
  });

  it('returns the input unchanged when it cannot be parsed', () => {
    expect(DateController.shift('garbage', 1)).toBe('garbage');
  });
});

describe('DateController — instance', () => {
  it('keeps a valid initial date and falls back to today for an invalid one', () => {
    expect(new DateController('2026-07-03').value).toBe('2026-07-03');
    const fallback = new DateController('not-a-date');
    expect(fallback.value).toBe(DateController.today());
    expect(DateController.isValid(fallback.value)).toBe(true);
  });

  it('set() applies valid dates and ignores invalid ones', () => {
    const c = new DateController('2026-07-03');
    expect(c.set('2026-08-15')).toBe('2026-08-15');
    expect(c.value).toBe('2026-08-15');
    expect(c.set('bad')).toBe('2026-08-15'); // unchanged
    expect(c.value).toBe('2026-08-15');
  });

  it('prev()/next() page by one day and return the new value', () => {
    const c = new DateController('2026-07-03');
    expect(c.next()).toBe('2026-07-04');
    expect(c.value).toBe('2026-07-04');
    expect(c.prev()).toBe('2026-07-03');
    expect(c.prev()).toBe('2026-07-02');
  });

  it('setToday()/isToday() track the current day', () => {
    const c = new DateController('2000-01-01');
    expect(c.isToday()).toBe(false);
    c.setToday();
    expect(c.value).toBe(DateController.today());
    expect(c.isToday()).toBe(true);
  });
});
