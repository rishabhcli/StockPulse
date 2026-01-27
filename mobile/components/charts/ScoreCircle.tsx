import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
  withSpring,
  withDelay,
  Easing,
  useAnimatedStyle,
  interpolate,
} from 'react-native-reanimated';
import { colors, fontSize, fontFamily, getScoreColor, getScoreLabel, animation } from '../../constants/theme';

// ============================================================================
// ANIMATED COMPONENTS
// ============================================================================

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

// ============================================================================
// TYPES
// ============================================================================

interface ScoreCircleProps {
  score: number;
  size?: number;
  strokeWidth?: number;
  showLabel?: boolean;
  showGlow?: boolean;
  animate?: boolean;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function ScoreCircle({
  score,
  size = 160,
  strokeWidth = 10,
  showLabel = true,
  showGlow = true,
  animate = true,
}: ScoreCircleProps) {
  const animatedScore = useSharedValue(animate ? 0 : score);
  const labelOpacity = useSharedValue(animate ? 0 : 1);
  const labelScale = useSharedValue(animate ? 0.8 : 1);
  const glowOpacity = useSharedValue(0);

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const scoreColor = getScoreColor(score);
  const scoreLabel = getScoreLabel(score);

  useEffect(() => {
    if (animate) {
      // Animate the score value
      animatedScore.value = withTiming(score, {
        duration: 1200,
        easing: Easing.out(Easing.cubic),
      });

      // Animate label appearance
      labelOpacity.value = withDelay(400, withTiming(1, { duration: 300 }));
      labelScale.value = withDelay(400, withSpring(1, animation.spring.bouncy));

      // Animate glow
      if (showGlow) {
        glowOpacity.value = withDelay(800, withTiming(0.6, { duration: 400 }));
      }
    }
  }, [score, animate]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference - (animatedScore.value / 100) * circumference,
  }));

  const labelAnimatedStyle = useAnimatedStyle(() => ({
    opacity: labelOpacity.value,
    transform: [{ scale: labelScale.value }],
  }));

  const glowAnimatedStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      {/* Glow Effect (Behind) — platform-specific intensity */}
      {showGlow && (
        <Animated.View
          style={[
            styles.glow,
            {
              width: size * (Platform.OS === 'ios' ? 1.4 : 1.25),
              height: size * (Platform.OS === 'ios' ? 1.4 : 1.25),
              borderRadius: (size * 1.4) / 2,
              backgroundColor: scoreColor,
            },
            Platform.OS === 'android' && styles.glowAndroid,
            glowAnimatedStyle,
          ]}
          pointerEvents="none"
        />
      )}

      {/* SVG Circle */}
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Gradient Definition */}
        <Defs>
          <LinearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor={scoreColor} stopOpacity="1" />
            <Stop offset="100%" stopColor={scoreColor} stopOpacity="0.6" />
          </LinearGradient>
        </Defs>

        {/* Background Track */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={Platform.select({
            ios: colors.ios.glassBorderMedium,
            android: colors.android.outlineVariant,
            default: colors.web.glassBorder,
          })}
          strokeWidth={strokeWidth}
          fill="none"
          opacity={0.5}
        />

        {/* Animated Progress Circle */}
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={scoreColor}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          animatedProps={animatedProps}
          strokeLinecap="round"
          rotation={-90}
          origin={`${size / 2}, ${size / 2}`}
        />

        {/* Inner decorative circle */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius - strokeWidth - 4}
          stroke={Platform.select({
            ios: colors.ios.glassBorderLight,
            android: colors.android.outlineVariant,
            default: colors.web.glassBorder,
          })}
          strokeWidth={1}
          fill="none"
          opacity={0.3}
        />
      </Svg>

      {/* Center Label */}
      <Animated.View style={[styles.labelContainer, labelAnimatedStyle]}>
        <Text style={[styles.scoreText, { color: scoreColor, fontSize: size * 0.22 }]}>
          {Math.round(score)}
        </Text>
        {showLabel && (
          <View style={[styles.labelBadge, { backgroundColor: `${scoreColor}20` }]}>
            <Text style={[styles.labelText, { color: scoreColor }]}>{scoreLabel}</Text>
          </View>
        )}
      </Animated.View>
    </View>
  );
}

// ============================================================================
// MINI SCORE CIRCLE (Compact Version)
// ============================================================================

interface MiniScoreCircleProps {
  score: number;
  size?: number;
}

export function MiniScoreCircle({ score, size = 48 }: MiniScoreCircleProps) {
  const scoreColor = getScoreColor(score);
  const strokeWidth = 4;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;

  return (
    <View style={[styles.miniContainer, { width: size, height: size }]}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Background */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={Platform.select({
            ios: colors.ios.glassBorderMedium,
            android: colors.android.outlineVariant,
            default: colors.border,
          })}
          strokeWidth={strokeWidth}
          fill="none"
          opacity={0.3}
        />
        {/* Progress */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={scoreColor}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={circumference - progress}
          strokeLinecap="round"
          rotation={-90}
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>
      <Text style={[styles.miniScore, { color: scoreColor, fontSize: size * 0.32 }]}>
        {Math.round(score)}
      </Text>
    </View>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  glow: {
    position: 'absolute',
    opacity: 0,
  },
  glowAndroid: {
    // Android uses elevation instead of blur for glow
    elevation: 8,
  },
  labelContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreText: {
    fontFamily: fontFamily.serifItalic,
    letterSpacing: -1,
  },
  labelBadge: {
    marginTop: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  labelText: {
    fontSize: fontSize.xs,
    fontFamily: fontFamily.sansBold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Mini version
  miniContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  miniScore: {
    position: 'absolute',
    fontFamily: fontFamily.sansBold,
  },
});

export default ScoreCircle;
