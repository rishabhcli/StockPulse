import 'react-native-gesture-handler/jestSetup';
jest.mock('react-native-reanimated', () => {
  const React = require('react');
  const View = 'AnimatedView';
  const mockAnimation = (value: any) => value;
  return {
    __esModule: true,
    default: {
      View,
      createAnimatedComponent: (Component: any) => Component,
    },
    View,
    createAnimatedComponent: (Component: any) => Component,
    useSharedValue: (value: any) => ({ value }),
    useAnimatedStyle: (factory: any) => factory(),
    withSpring: mockAnimation,
    withTiming: mockAnimation,
    withDelay: (_delay: number, value: any) => value,
    withRepeat: (_value: any) => _value,
    withSequence: (...values: any[]) => values[values.length - 1],
    interpolate: (_value: number, _input: number[], output: number[]) => output[0] ?? 0,
    Easing: {
      inOut: (value: any) => value,
      out: (value: any) => value,
      in: (value: any) => value,
      ease: 'ease',
    },
    FadeIn: { duration: () => ({}) },
    FadeInDown: { delay: () => ({ duration: () => ({}) }) },
  };
});
jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));

jest.mock('react-native/Libraries/Animated/NativeAnimatedHelper', () => ({}), { virtual: true });

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  selectionAsync: jest.fn(),
  notificationAsync: jest.fn(),
  ImpactFeedbackStyle: {
    Light: 'Light',
    Medium: 'Medium',
    Heavy: 'Heavy',
  },
  NotificationFeedbackType: {
    Success: 'Success',
    Warning: 'Warning',
    Error: 'Error',
  },
}));

jest.mock('expo-glass-effect', () => ({
  GlassView: 'GlassView',
  GlassContainer: 'GlassContainer',
}));
