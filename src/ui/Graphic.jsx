import React, { useEffect, useRef } from 'react';

/**
 * Mounts a provider-produced DOM node (SVG or <img>) into a 4:3 graphic slot
 * using a ref, so the framework-free renderers/providers stay React-free (§6.3).
 * The slot uses the padding-top hack, not `aspect-ratio` (§6.2).
 */
export function Graphic(props) {
  const { node, loading, label } = props;
  const mountRef = useRef(null);

  useEffect(() => {
    const el = mountRef.current;
    if (!el) return undefined;
    while (el.firstChild) el.removeChild(el.firstChild);
    if (node) el.appendChild(node);
    return () => {
      if (el) {
        while (el.firstChild) el.removeChild(el.firstChild);
      }
    };
  }, [node]);

  const showOverlay = loading || !node;

  return (
    <div className="card__graphic">
      <div className="card__graphic-mount" ref={mountRef} />
      {showOverlay ? (
        <div className={'card__overlay' + (loading ? ' is-loading' : '')}>
          <span className="card__overlay-text">{loading ? 'Updating…' : (label || 'No data')}</span>
        </div>
      ) : null}
    </div>
  );
}
