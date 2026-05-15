import React from 'react';
import Svg, { Path, Circle } from 'react-native-svg';

/**
 * Minimalist gear icon — 8 teeth, hollow centre ring.
 * Fits Veil's circle-based aesthetic.
 */
export function SettingsIcon({ focused, color }: { focused: boolean; color: string }) {
  const opacity = focused ? 1 : 0.42;
  // Gear geometry
  const cx = 11, cy = 11, r = 3.2;
  const rOuter = 5.6, rTooth = 7.0, teeth = 8;

  let toothPath = '';
  for (let i = 0; i < teeth; i++) {
    const aBase  = (i / teeth) * Math.PI * 2 - Math.PI / 2;
    const aHalf  = Math.PI / teeth;
    const aW     = Math.PI / (teeth * 2.8);
    const x1 = cx + rOuter * Math.cos(aBase - aW);
    const y1 = cy + rOuter * Math.sin(aBase - aW);
    const x2 = cx + rTooth * Math.cos(aBase - aW * 0.5);
    const y2 = cy + rTooth * Math.sin(aBase - aW * 0.5);
    const x3 = cx + rTooth * Math.cos(aBase + aW * 0.5);
    const y3 = cy + rTooth * Math.sin(aBase + aW * 0.5);
    const x4 = cx + rOuter * Math.cos(aBase + aW);
    const y4 = cy + rOuter * Math.sin(aBase + aW);
    const xNext = cx + rOuter * Math.cos(aBase + aHalf - aW);
    const yNext = cy + rOuter * Math.sin(aBase + aHalf - aW);
    if (i === 0) toothPath += `M${x1.toFixed(2)},${y1.toFixed(2)}`;
    toothPath += ` L${x2.toFixed(2)},${y2.toFixed(2)} L${x3.toFixed(2)},${y3.toFixed(2)} L${x4.toFixed(2)},${y4.toFixed(2)} L${xNext.toFixed(2)},${yNext.toFixed(2)}`;
  }
  toothPath += ' Z';

  return (
    <Svg width={22} height={22} viewBox="0 0 22 22" opacity={opacity}>
      {/* Outer gear body */}
      <Path d={toothPath} fill={color} />
      {/* Hollow centre */}
      <Circle cx={cx} cy={cy} r={r} fill="transparent" />
      <Circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth={1.5} />
    </Svg>
  );
}
