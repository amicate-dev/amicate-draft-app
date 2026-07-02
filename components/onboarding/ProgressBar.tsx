import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

import { colors } from '../../lib/theme';

const SEGMENTS = 4;

type Props = {
  currentSection: 1 | 2 | 3 | 4;
};

export default function ProgressBar({ currentSection }: Props) {
  const animations = useRef(
    Array.from({ length: SEGMENTS }, (_, i) => new Animated.Value(i < currentSection ? 1 : 0))
  ).current;

  useEffect(() => {
    const target = currentSection;
    const parallel = animations.map((anim, index) => {
      const filled = index < target ? 1 : 0;
      return Animated.timing(anim, {
        toValue: filled,
        duration: 380,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      });
    });
    Animated.parallel(parallel).start();
  }, [currentSection, animations]);

  const segmentNodes = useMemo(
    () =>
      Array.from({ length: SEGMENTS }, (_, i) => {
        const backgroundColor = animations[i].interpolate({
          inputRange: [0, 1],
          outputRange: [colors.pillGrey, colors.brand],
        });
        return (
          <View key={i} style={styles.segmentOuter}>
            <Animated.View style={[styles.segmentFill, { backgroundColor }]} />
          </View>
        );
      }),
    [animations]
  );

  return <View style={styles.row}>{segmentNodes}</View>;
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 8,
    width: '100%',
  },
  segmentOuter: {
    flex: 1,
    height: 6,
    borderRadius: 999,
    backgroundColor: colors.pillGrey,
    overflow: 'hidden',
  },
  segmentFill: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 999,
  },
});
