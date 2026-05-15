import React, { useCallback } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withTiming, Easing,
} from 'react-native-reanimated';
import { useFocusEffect } from 'expo-router';

const BG = '#0d0b14';

export function FadeScreen({ children }: { children: React.ReactNode }) {
  const opacity = useSharedValue(0);

  useFocusEffect(
    useCallback(() => {
      opacity.value = withTiming(1, { duration: 180, easing: Easing.out(Easing.quad) });
      return () => {
        opacity.value = 0;
      };
    }, [])
  );

  const animStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    // Outer view: always dark, fills the scene — no flash ever
    <Animated.View style={styles.bg}>
      {/* Inner view: fades the content in over the dark base */}
      <Animated.View style={[StyleSheet.absoluteFill, animStyle]}>
        {children}
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  bg: {
    flex: 1,
    backgroundColor: BG,
  },
});
