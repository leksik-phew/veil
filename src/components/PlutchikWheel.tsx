import React, { useState, useCallback } from 'react';
import { View } from 'react-native';
import Svg, { Path, Circle, Text as SvgText, Defs, RadialGradient, Stop } from 'react-native-svg';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import { EMOTIONS, getEmotion } from '../constants/emotions';
import type { EmotionId } from '../types';

interface Props {
  selected: EmotionId | null;
  onSelect: (id: EmotionId | null) => void;
  size?: number;
}

const CX = 110, CY = 110, R_IN = 38, R_OUT = 90;
const toRad = (d: number) => (d - 90) * Math.PI / 180;

function sectorPath(sd: number, ed: number, ri: number, ro: number): string {
  const s = toRad(sd), e = toRad(ed);
  const x1 = CX + ro * Math.cos(s), y1 = CY + ro * Math.sin(s);
  const x2 = CX + ro * Math.cos(e), y2 = CY + ro * Math.sin(e);
  const x3 = CX + ri * Math.cos(e), y3 = CY + ri * Math.sin(e);
  const x4 = CX + ri * Math.cos(s), y4 = CY + ri * Math.sin(s);
  return `M${x1},${y1} A${ro},${ro} 0 0,1 ${x2},${y2} L${x3},${y3} A${ri},${ri} 0 0,0 ${x4},${y4} Z`;
}

/**
 * Convert (x, y) in component-local coordinates to an EmotionId.
 * Returns null if the touch is outside the wheel ring.
 */
function emotionAtPoint(x: number, y: number, svgSize: number): EmotionId | null {
  const cx = svgSize / 2;
  const cy = svgSize / 2;
  const dx = x - cx;
  const dy = y - cy;
  const dist = Math.sqrt(dx * dx + dy * dy);

  const scale = svgSize / 220;
  // Be generous with hit area: from 60% of inner radius to 115% of outer radius
  if (dist < R_IN * scale * 0.6 || dist > R_OUT * scale * 1.15) return null;

  // Angle: 0° at top, clockwise
  let angle = (Math.atan2(dy, dx) * 180) / Math.PI + 90;
  if (angle < 0) angle += 360;
  if (angle >= 360) angle -= 360;

  // Each sector is 45°, emotions are at 0, 45, 90 … 315
  const sectorIndex = Math.floor(((angle + 22.5) % 360) / 45);
  return EMOTIONS[sectorIndex % 8].id;
}

export default function PlutchikWheel({ selected, onSelect, size = 240 }: Props) {
  const [hovered, setHovered] = useState<EmotionId | null>(null);

  // Which emotion to show in the center
  const displayed = hovered ?? selected;
  const displayedEmo = displayed ? getEmotion(displayed) : null;

  // ── Gesture: Pan with minDistance 0 catches both taps and drags ───────────────
  const gesture = Gesture.Pan()
    .runOnJS(true)           // keep callbacks on JS thread → setState is safe
    .minDistance(0)          // fire immediately on touch down
    .onBegin((e) => {
      const eid = emotionAtPoint(e.x, e.y, size);
      if (eid) setHovered(eid);
    })
    .onChange((e) => {
      // Called every frame while finger moves → live sector highlight
      const eid = emotionAtPoint(e.x, e.y, size);
      setHovered(eid); // null clears highlight when outside ring
    })
    .onEnd((e) => {
      const eid = emotionAtPoint(e.x, e.y, size);
      if (eid) {
        onSelect(eid === selected ? null : eid); // tap same → deselect
      }
      setHovered(null);
    })
    .onFinalize(() => {
      // Cancelled (e.g. scroll steal) — clean up
      setHovered(null);
    });

  return (
    <View style={{ alignItems: 'center' }}>
      <GestureDetector gesture={gesture}>
        {/* Explicit View with exact dimensions so GestureDetector has a hit area */}
        <View style={{ width: size, height: size }}>
          <Svg width={size} height={size} viewBox="0 0 220 220">
            <Defs>
              {/* Subtle radial glow for the center when something is active */}
              <RadialGradient id="centerGlow" cx="50%" cy="50%" r="50%">
                <Stop offset="0%" stopColor={displayedEmo?.color ?? '#8b7cf8'} stopOpacity={0.25} />
                <Stop offset="100%" stopColor={displayedEmo?.color ?? '#8b7cf8'} stopOpacity={0} />
              </RadialGradient>
            </Defs>

            {EMOTIONS.map(e => {
              const isSelected = selected === e.id;
              const isHovered  = hovered === e.id;
              const mid = toRad(e.angle);
              const lx = CX + 66 * Math.cos(mid);
              const ly = CY + 66 * Math.sin(mid);

              return (
                <React.Fragment key={e.id}>
                  {/* Outer glow ring when hovered — slightly expanded sector */}
                  {isHovered && (
                    <Path
                      d={sectorPath(e.angle - 22.5, e.angle + 22.5, R_IN - 3, R_OUT + 8)}
                      fill={e.color + '28'}
                    />
                  )}

                  {/* Main sector */}
                  <Path
                    d={sectorPath(e.angle - 22.5, e.angle + 22.5, R_IN, R_OUT)}
                    fill={
                      isSelected ? e.color
                      : isHovered ? e.color + 'a0'
                      : e.color + '50'
                    }
                    stroke={
                      isSelected ? e.color
                      : isHovered ? e.color + 'cc'
                      : 'rgba(255,255,255,0.07)'
                    }
                    strokeWidth={isSelected || isHovered ? 2 : 1}
                  />

                  {/* Label */}
                  <SvgText
                    x={lx} y={ly}
                    textAnchor="middle" alignmentBaseline="middle"
                    fontSize={isHovered ? 9.5 : 8.5}
                    fill={isSelected || isHovered ? '#fff' : 'rgba(255,255,255,0.5)'}
                    fontWeight={isSelected || isHovered ? '600' : '400'}
                  >
                    {e.label}
                  </SvgText>
                </React.Fragment>
              );
            })}

            {/* Center fill */}
            <Circle cx={CX} cy={CY} r={R_IN - 2} fill="#1a1625" />

            {/* Center glow when active */}
            {displayedEmo && (
              <Circle cx={CX} cy={CY} r={R_IN - 2} fill="url(#centerGlow)" />
            )}

            {/* Center content */}
            {displayedEmo ? (
              <>
                <SvgText
                  x={CX} y={CY - 8}
                  textAnchor="middle"
                  fontSize={20}
                  fill={displayedEmo.color}
                  opacity={hovered ? 0.75 : 1}
                >
                  ●
                </SvgText>
                <SvgText
                  x={CX} y={CY + 11}
                  textAnchor="middle" alignmentBaseline="middle"
                  fontSize={9}
                  fill={hovered ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.9)'}
                  fontWeight="600"
                >
                  {displayedEmo.label}
                </SvgText>
              </>
            ) : (
              <SvgText
                x={CX} y={CY}
                textAnchor="middle" alignmentBaseline="middle"
                fontSize={9}
                fill="rgba(255,255,255,0.2)"
              >
                slide or tap
              </SvgText>
            )}
          </Svg>
        </View>
      </GestureDetector>
    </View>
  );
}
