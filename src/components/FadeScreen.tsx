import React, { useCallback } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withTiming, Easing,
} from 'react-native-reanimated';
import { useFocusEffect } from 'expo-router';
import { useVeilStore } from '../store/useStore';

export function FadeScreen({ children }: { children: React.ReactNode }) {
  const bg      = useVeilStore(s => s.theme.bg);
  const opacity = useSharedValue(0);

  useFocusEffect(
    useCallback(() => {
      opacity.value = withTiming(1, { duration: 180, easing: Easing.out(Easing.quad) });
      return () => { opacity.value = 0; };
    }, [])
  );

  const animStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    // Outer: always the theme bg — never flashes white
    <Animated.View style={[styles.base, { backgroundColor: bg }]}>
      <Animated.View style={[StyleSheet.absoluteFill, animStyle]}>
        {children}
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  base: { flex: 1 },
});
