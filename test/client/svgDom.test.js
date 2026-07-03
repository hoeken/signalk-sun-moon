// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { svgFromString, num } from '../../src/graphics/svgDom.js';

describe('num', () => {
  it('rounds to 2 decimals by default and stringifies', () => {
    expect(num(1.23456)).toBe('1.23');
    expect(num(5)).toBe('5');
    expect(num(1.0)).toBe('1');
  });

  it('honours a custom precision', () => {
    expect(num(1.23456, 3)).toBe('1.235');
    expect(num(1.23456, 0)).toBe('1');
  });

  it('returns "0" for non-finite / non-number input', () => {
    expect(num(NaN)).toBe('0');
    expect(num(Infinity)).toBe('0');
    expect(num('x')).toBe('0');
    expect(num(undefined)).toBe('0');
  });
});

describe('svgFromString', () => {
  it('parses valid SVG markup into a live <svg> node', () => {
    const node = svgFromString(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 75"><circle r="33"/></svg>'
    );
    expect(node).not.toBeNull();
    expect(node.nodeName).toBe('svg');
    // camelCase attributes survive the XML parse.
    expect(node.getAttribute('viewBox')).toBe('0 0 100 75');
  });

  it('trims surrounding whitespace before parsing', () => {
    const node = svgFromString('   <svg xmlns="http://www.w3.org/2000/svg"></svg>  ');
    expect(node).not.toBeNull();
    expect(node.nodeName).toBe('svg');
  });

  it('returns null on malformed markup', () => {
    expect(svgFromString('<svg><not-closed')).toBeNull();
  });
});
