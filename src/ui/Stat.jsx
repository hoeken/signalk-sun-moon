import React from "react";

/** A single label/value row in a card's stat list. `title` becomes a tooltip. */
export function Stat(props) {
  const { label, value, title } = props;
  return (
    <div className="stat" title={title || undefined}>
      <dt className="stat__label">{label}</dt>
      <dd className="stat__value">{value}</dd>
    </div>
  );
}
