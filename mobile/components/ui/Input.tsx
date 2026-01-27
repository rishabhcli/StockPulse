import React, { useState, useRef } from 'react';
import {
  Platform,
  TextInput,
  View,
  Text,
  StyleSheet,
  ViewStyle,
  TextInputProps,
  Pressable,
} from 'react-native';
import { TextInput as PaperInput } from 'react-native-paper';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolateColor,
} from 'react-native-reanimated';
import { colors, borderRadius, spacing, fontSize, animation } from '../../constants/theme';

// ============================================================================
// TYPES
// ============================================================================

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  hint?: string;
  containerStyle?: ViewStyle;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  onRightIconPress?: () => void;
  variant?: 'default' | 'filled' | 'outlined';
}

// ============================================================================
// ANIMATED VIEW
// ============================================================================

const AnimatedView = Animated.createAnimatedComponent(View);

// ============================================================================
// COMPONENT
// ============================================================================

export function Input({
  label,
  error,
  hint,
  containerStyle,
  leftIcon,
  rightIcon,
  onRightIconPress,
  variant = 'default',
  style,
  onFocus,
  onBlur,
  ...props
}: InputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const focusAnim = useSharedValue(0);
  const inputRef = useRef<TextInput>(null);

  const handleFocus = (e: any) => {
    setIsFocused(true);
    focusAnim.value = withTiming(1, { duration: animation.duration.fast });
    onFocus?.(e);
  };

  const handleBlur = (e: any) => {
    setIsFocused(false);
    focusAnim.value = withTiming(0, { duration: animation.duration.fast });
    onBlur?.(e);
  };

  // ============================================================================
  // ANDROID - USE MATERIAL DESIGN 3 INPUT
  // ============================================================================
  if (Platform.OS === 'android') {
    return (
      <View style={containerStyle}>
        <PaperInput
          label={label}
          error={!!error}
          mode={variant === 'filled' ? 'flat' : 'outlined'}
          style={[styles.paperInput, style as any]}
          outlineColor={colors.android.outlineVariant}
          activeOutlineColor={colors.primary}
          textColor={colors.text}
          left={leftIcon ? <PaperInput.Icon icon={() => leftIcon as React.ReactElement} /> : undefined}
          right={
            rightIcon ? (
              <PaperInput.Icon icon={() => rightIcon as React.ReactElement} onPress={onRightIconPress} />
            ) : undefined
          }
          onFocus={handleFocus}
          onBlur={handleBlur}
          {...(props as any)}
        />
        {error && <Text style={styles.errorText}>{error}</Text>}
        {hint && !error && <Text style={styles.hintText}>{hint}</Text>}
      </View>
    );
  }

  // ============================================================================
  // iOS & WEB - CUSTOM INPUT
  // ============================================================================

  const animatedBorderStyle = useAnimatedStyle(() => {
    const borderColor = error
      ? colors.error
      : interpolateColor(
          focusAnim.value,
          [0, 1],
          [colors.border, colors.primary]
        );

    return { borderColor };
  });

  const getVariantStyles = () => {
    switch (variant) {
      case 'filled':
        return styles.inputContainerFilled;
      case 'outlined':
        return styles.inputContainerOutlined;
      default:
        return styles.inputContainerDefault;
    }
  };

  return (
    <View style={[styles.container, containerStyle]}>
      {label && (
        <Text style={[styles.label, isFocused && styles.labelFocused, error && styles.labelError]}>
          {label}
        </Text>
      )}

      <Pressable onPress={() => inputRef.current?.focus()}>
        <AnimatedView
          style={[
            styles.inputContainer,
            getVariantStyles(),
            Platform.OS === 'ios' && styles.inputContainerIOS,
          Platform.OS === 'web' && styles.inputContainerWeb,
            animatedBorderStyle,
            error && styles.inputContainerError,
          ]}
        >
          {leftIcon && <View style={styles.iconLeft}>{leftIcon}</View>}

          <TextInput
            ref={inputRef}
            style={[
              styles.input,
              leftIcon ? styles.inputWithLeftIcon : undefined,
              rightIcon ? styles.inputWithRightIcon : undefined,
              style,
            ]}
            placeholderTextColor={colors.textMuted}
            selectionColor={colors.primary}
            onFocus={handleFocus}
            onBlur={handleBlur}
            {...props}
          />

          {rightIcon && (
            <Pressable onPress={onRightIconPress} style={styles.iconRight}>
              {rightIcon}
            </Pressable>
          )}
        </AnimatedView>
      </Pressable>

      {error && <Text style={styles.errorText}>{error}</Text>}
      {hint && !error && <Text style={styles.hintText}>{hint}</Text>}
    </View>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },

  // Label
  label: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    fontWeight: '500',
    marginBottom: spacing.xs,
  },
  labelFocused: {
    color: colors.primary,
  },
  labelError: {
    color: colors.error,
  },

  // Input container
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    minHeight: 48,
    overflow: 'hidden',
  },
  inputContainerDefault: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
  },
  inputContainerFilled: {
    backgroundColor: colors.surfaceVariant,
    borderColor: 'transparent',
    borderWidth: 0,
    borderBottomWidth: 2,
    borderRadius: 0,
    borderTopLeftRadius: borderRadius.sm,
    borderTopRightRadius: borderRadius.sm,
  },
  inputContainerOutlined: {
    backgroundColor: 'transparent',
    borderColor: colors.border,
  },
  inputContainerIOS: {
    backgroundColor: colors.ios.glassRegular,
    borderColor: colors.ios.glassBorderMedium,
  },
  inputContainerWeb: {
    backgroundColor: colors.web.glassBackground,
    borderColor: colors.web.glassBorder,
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
  } as any,
  inputContainerError: {
    borderColor: colors.error,
  },

  // Input
  input: {
    flex: 1,
    color: colors.text,
    fontSize: fontSize.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  inputWithLeftIcon: {
    paddingLeft: 0,
  },
  inputWithRightIcon: {
    paddingRight: 0,
  },

  // Icons
  iconLeft: {
    paddingLeft: spacing.md,
    paddingRight: spacing.xs,
  },
  iconRight: {
    paddingRight: spacing.md,
    paddingLeft: spacing.xs,
  },

  // Hint & Error
  hintText: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    marginTop: spacing.xs,
  },
  errorText: {
    color: colors.error,
    fontSize: fontSize.xs,
    marginTop: spacing.xs,
  },

  // Android Paper Input
  paperInput: {
    backgroundColor: colors.android.surfaceContainer,
  },
});

export default Input;
