import React from "react";

/**
 * Top toolbar (§6.2): ‹ Prev · <input type="date"> · Next › · Today, plus the
 * resolved position + its source and the active time zone.
 */
export function Toolbar(props) {
  const { date, isToday, onPrev, onNext, onToday, onSet, loading, position } = props;

  return (
    <div className="toolbar">
      <div className="toolbar__nav">
        <button type="button" className="btn" onClick={onPrev} aria-label="Previous day">‹ Prev</button>
        <input
          type="date"
          className="toolbar__date"
          value={date}
          onChange={(e) => onSet(e.target.value)}
          aria-label="Choose day"
        />
        <button type="button" className="btn" onClick={onNext} aria-label="Next day">Next ›</button>
        <button
          type="button"
          className="btn btn--ghost"
          onClick={onToday}
          disabled={isToday}
          title="Jump to today"
        >
          Today
        </button>
      </div>

      <div className="toolbar__meta">
        {loading ? <span className="toolbar__spinner" aria-label="Loading">●</span> : null}
        <span className="toolbar__pos">{formatPosition(position)}</span>
      </div>
    </div>
  );
}

function formatPosition(position) {
  if (!position)
    return "Locating…";
  const lat = fmtCoord(position.latitude, "N", "S");
  const lon = fmtCoord(position.longitude, "E", "W");
  return lat + " " + lon;
}

function fmtCoord(v, pos, neg) {
  if (typeof v !== "number" || !isFinite(v))
    return "—";
  const hemi = v >= 0 ? pos : neg;
  return Math.abs(v).toFixed(3) + "° " + hemi;
}
