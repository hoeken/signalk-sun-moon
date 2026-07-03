// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { MoonRenderer } from '../../src/graphics/MoonRenderer.js';

const r = new MoonRenderer();

describe('MoonRenderer.toMarkup (§6.5)', () => {
  it('emits a 4:3 accessible SVG with a phase label', () => {
    const svg = r.toMarkup({ illumination: { fraction: 0.5, phaseName: 'Full Moon' } });
    expect(svg).toContain('viewBox="0 0 100 75"');
    expect(svg).toContain('role="img"');
    expect(svg).toContain('aria-label="Moon: Full Moon, 50% illuminated"');
  });

  it('rotates the disc by the negated bright-limb zenith angle', () => {
    const svg = r.toMarkup({
      illumination: { fraction: 0.3 },
      brightLimb: { zenithAngleDeg: 90 },
    });
    expect(svg).toContain('rotate(-90 50 37.5)');
  });

  it('draws a terminator ellipse for gibbous and crescent, but not at exactly half', () => {
    expect(r.toMarkup({ illumination: { fraction: 0.8 } })).toContain('<ellipse'); // gibbous
    expect(r.toMarkup({ illumination: { fraction: 0.2 } })).toContain('<ellipse'); // crescent
    expect(r.toMarkup({ illumination: { fraction: 0.5 } })).not.toContain('<ellipse'); // half
  });

  it('fills the gibbous terminator with the lit gradient and the crescent one with shadow', () => {
    const gibbous = r.toMarkup({ illumination: { fraction: 0.8 } });
    const crescent = r.toMarkup({ illumination: { fraction: 0.2 } });
    // The terminator ellipse's own fill differs between the two branches.
    expect(gibbous).toMatch(/<ellipse[^>]*fill="url\(#[^)]*-lit\)"/);
    expect(crescent).toMatch(/<ellipse[^>]*fill="#2b3242"/);
  });

  it('clamps out-of-range fractions into 0..100% in the label', () => {
    expect(r.toMarkup({ illumination: { fraction: 2 } })).toContain('100% illuminated');
    expect(r.toMarkup({ illumination: { fraction: -1 } })).toContain('0% illuminated');
  });

  it('degrades gracefully when the moon object is empty', () => {
    const svg = r.toMarkup({});
    expect(svg).toContain('aria-label="Moon: phase, 0% illuminated"');
    expect(svg).toContain('rotate(0 50 37.5)'); // zenith defaults to 0
  });
});

describe('MoonRenderer.render', () => {
  it('produces a live <svg> DOM node', () => {
    const node = r.render({ illumination: { fraction: 0.5, phaseName: 'Full Moon' } });
    expect(node).not.toBeNull();
    expect(node.nodeName).toBe('svg');
    expect(node.getAttribute('viewBox')).toBe('0 0 100 75');
  });
});
