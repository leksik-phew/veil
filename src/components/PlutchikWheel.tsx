import React, { useState } from 'react';
import { View } from 'react-native';
import Svg, { Path, Circle, Text as SvgText, Defs, RadialGradient, Stop } from 'react-native-svg';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import { EMOTIONS, getEmotion, getEmotionLabel } from '../constants/emotions';
import { useVeilStore } from '../store/useStore';
import { TRANSLATIONS } from '../i18n/translations';
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

function emotionAtPoint(x: number, y: number, svgSize: number): EmotionId | null {
  const cx = svgSize / 2, cy = svgSize / 2;
  const dx = x - cx, dy = y - cy;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const scale = svgSize / 220;
  if (dist < R_IN * scale * 0.55 || dist > R_OUT * scale * 1.18) return null;
  let angle = (Math.atan2(dy, dx) * 180) / Math.PI + 90;
  if (angle < 0) angle += 360;
  if (angle >= 360) angle -= 360;
  return EMOTIONS[Math.floor(((angle + 22.5) % 360) / 45) % 8].id;
}

export default function PlutchikWheel({ selected, onSelect, size = 240 }: Props) {
  const t    = useVeilStore(s => s.theme);
  const lang = useVeilStore(s => s.lang);
  const [hovered, setHovered] = useState<EmotionId | null>(null);

  const displayed    = hovered ?? selected;
  const displayedEmo = displayed ? getEmotion(displayed) : null;

  // Localised centre hint
  const hintText = lang === 'ru' ? 'слайд или тап' : 'slide or tap';

  const tapGesture = Gesture.Tap()
    .runOnJS(true)
    .maxDuration(500)
    .maxDistance(12)
    .onStart((e) => {
      const eid = emotionAtPoint(e.x, e.y, size);
      if (!eid) return;
      onSelect(eid === selected ? null : eid);
    });

  const panGesture = Gesture.Pan()
    .runOnJS(true)
    .minDistance(10)
    .onBegin((e) => { setHovered(emotionAtPoint(e.x, e.y, size)); })
    .onUpdate((e) => { setHovered(emotionAtPoint(e.x, e.y, size)); })
    .onEnd((e) => {
      const eid = emotionAtPoint(e.x, e.y, size);
      if (eid) onSelect(eid === selected ? null : eid);
      setHovered(null);
    })
    .onFinalize(() => { setHovered(null); });

  const gesture = Gesture.Race(tapGesture, panGesture);

  return (
    <View style={{ alignItems: 'center' }}>
      <GestureDetector gesture={gesture}>
        <View style={{ width: size, height: size }}>
          <Svg width={size} height={size} viewBox="0 0 220 220">
            <Defs>
              <RadialGradient id="cg" cx="50%" cy="50%" r="50%">
                <Stop offset="0%"   stopColor={displayedEmo?.color ?? t.accent} stopOpacity={0.28} />
                <Stop offset="100%" stopColor={displayedEmo?.color ?? t.accent} stopOpacity={0}    />
              </RadialGradient>
            </Defs>

            {EMOTIONS.map(e => {
              const isSelected = selected === e.id;
              const isHovered  = hovered  === e.id;
              const mid = toRad(e.angle);
              return (
                <React.Fragment key={e.id}>
                  {isHovered && (
                    <Path
                      d={sectorPath(e.angle - 22.5, e.angle + 22.5, R_IN - 3, R_OUT + 8)}
                      fill={e.color + '28'}
                    />
                  )}
                  <Path
                    d={sectorPath(e.angle - 22.5, e.angle + 22.5, R_IN, R_OUT)}
                    fill={isSelected ? e.color : isHovered ? e.color + 'a0' : e.color + '55'}
                    stroke={isSelected ? e.color : isHovered ? e.color + 'cc' : t.border}
                    strokeWidth={isSelected || isHovered ? 2 : 1}
                  />
                  <SvgText
                    x={CX + 66 * Math.cos(mid)} y={CY + 66 * Math.sin(mid)}
                    textAnchor="middle" alignmentBaseline="middle"
                    fontSize={isHovered ? 9 : 8}
                    fill={isSelected || isHovered ? t.text : t.textDim}
                    fontWeight={isSelected || isHovered ? '600' : '400'}
                  >
                    {getEmotionLabel(e.id, lang)}
                  </SvgText>
                </React.Fragment>
              );
            })}

            <Circle cx={CX} cy={CY} r={R_IN - 2} fill={t.wheelCenter} />
            {displayedEmo && <Circle cx={CX} cy={CY} r={R_IN - 2} fill="url(#cg)" />}

            {displayedEmo ? (
              <>
                <SvgText x={CX} y={CY - 8} textAnchor="middle"
                  fontSize={20} fill={displayedEmo.color} opacity={hovered ? 0.7 : 1}>
                  ●
                </SvgText>
                <SvgText x={CX} y={CY + 11} textAnchor="middle"
                  alignmentBaseline="middle" fontSize={9} fontWeight="600"
                  fill={hovered ? t.textMuted : t.text}>
                  {getEmotionLabel(displayedEmo.id, lang)}
                </SvgText>
              </>
            ) : (
              <SvgText x={CX} y={CY} textAnchor="middle"
                alignmentBaseline="middle" fontSize={9} fill={t.textDim}>
                {hintText}
              </SvgText>
            )}
          </Svg>
        </View>
      </GestureDetector>
    </View>
  );
}
