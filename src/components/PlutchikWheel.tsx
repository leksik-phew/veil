import React from 'react';
import { View } from 'react-native';
import Svg, { Path, Circle, Text as SvgText } from 'react-native-svg';
import { EMOTIONS, getEmotion } from '../constants/emotions';
import type { EmotionId } from '../types';

interface Props {
  selected: EmotionId | null;
  onSelect: (id: EmotionId | null) => void;
  size?: number;
}

const CX = 110, CY = 110, R_IN = 38, R_OUT = 90;
const toRad = (d: number) => (d - 90) * Math.PI / 180;

function sector(sd: number, ed: number, ri: number, ro: number) {
  const s = toRad(sd), e = toRad(ed);
  const x1 = CX + ro * Math.cos(s), y1 = CY + ro * Math.sin(s);
  const x2 = CX + ro * Math.cos(e), y2 = CY + ro * Math.sin(e);
  const x3 = CX + ri * Math.cos(e), y3 = CY + ri * Math.sin(e);
  const x4 = CX + ri * Math.cos(s), y4 = CY + ri * Math.sin(s);
  return `M${x1},${y1} A${ro},${ro} 0 0,1 ${x2},${y2} L${x3},${y3} A${ri},${ri} 0 0,0 ${x4},${y4} Z`;
}

export default function PlutchikWheel({ selected, onSelect, size = 240 }: Props) {
  const sel = selected ? getEmotion(selected) : null;
  return (
    <View style={{ alignItems: 'center' }}>
      <Svg width={size} height={size} viewBox="0 0 220 220">
        {EMOTIONS.map(e => {
          const active = selected === e.id;
          const mid = toRad(e.angle);
          return (
            <React.Fragment key={e.id}>
              <Path
                d={sector(e.angle - 22.5, e.angle + 22.5, R_IN, R_OUT)}
                fill={active ? e.color : e.color + '50'}
                stroke={active ? e.color : 'rgba(255,255,255,0.07)'}
                strokeWidth={active ? 2 : 1}
                onPress={() => onSelect(active ? null : e.id)}
              />
              <SvgText
                x={CX + 66 * Math.cos(mid)} y={CY + 66 * Math.sin(mid)}
                textAnchor="middle" alignmentBaseline="middle"
                fontSize={8.5} fill={active ? '#fff' : 'rgba(255,255,255,0.5)'}
                fontWeight={active ? '600' : '400'}
              >
                {e.label}
              </SvgText>
            </React.Fragment>
          );
        })}
        <Circle cx={CX} cy={CY} r={R_IN - 2} fill={sel ? sel.color + '22' : '#1a1625'} />
        {sel ? (
          <>
            <SvgText x={CX} y={CY - 7} textAnchor="middle" fontSize={18} fill={sel.color}>●</SvgText>
            <SvgText x={CX} y={CY + 10} textAnchor="middle" alignmentBaseline="middle" fontSize={9} fill="rgba(255,255,255,0.85)">{sel.label}</SvgText>
          </>
        ) : (
          <SvgText x={CX} y={CY} textAnchor="middle" alignmentBaseline="middle" fontSize={9} fill="rgba(255,255,255,0.25)">choose</SvgText>
        )}
      </Svg>
    </View>
  );
}
