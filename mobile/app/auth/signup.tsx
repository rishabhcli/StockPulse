import React, { useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Text, TextInput, Button, HelperText } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../stores/useAuthStore';
import { colors, fontFamily, borderRadius, spacing } from '../../constants/theme';
import { isLiquidGlassAvailable } from '../../components/ui/Surface';

// iOS 26 Liquid Glass
let GlassView: any = null;
try {
  const glassModule = require('expo-glass-effect');
  GlassView = glassModule.GlassView;
} catch {}

export default function SignUpScreen() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const signUp = useAuthStore((state) => state.signUp);
  const router = useRouter();

  const handleSignUp = async () => {
    if (!email.trim() || !password) {
      setError('Please fill in all required fields');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    setError('');

    const { error: authError } = await signUp(email.trim(), password, fullName.trim() || undefined);

    if (authError) {
      setError(authError.message || 'Sign up failed');
    } else {
      router.replace('/(tabs)');
    }

    setLoading(false);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text variant="headlineLarge" style={styles.title}>StockPulse</Text>
          <Text variant="bodyLarge" style={styles.subtitle}>Create your account</Text>
        </View>

        {isLiquidGlassAvailable() && GlassView ? (
          <View style={styles.formGlassWrapper}>
            <GlassView style={styles.formGlass} glassEffectStyle="regular">
              <View style={styles.formInner}>
                <TextInput
                  label="Full Name (optional)"
                  value={fullName}
                  onChangeText={setFullName}
                  mode="outlined"
                  style={styles.input}
                  outlineColor={colors.ios.glassBorderMedium}
                  activeOutlineColor={colors.primary}
                  textColor={colors.text}
                />
                <TextInput
                  label="Email"
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  mode="outlined"
                  style={styles.input}
                  outlineColor={colors.ios.glassBorderMedium}
                  activeOutlineColor={colors.primary}
                  textColor={colors.text}
                />
                <TextInput
                  label="Password"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  mode="outlined"
                  style={styles.input}
                  outlineColor={colors.ios.glassBorderMedium}
                  activeOutlineColor={colors.primary}
                  textColor={colors.text}
                />
                <TextInput
                  label="Confirm Password"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry
                  mode="outlined"
                  style={styles.input}
                  outlineColor={colors.ios.glassBorderMedium}
                  activeOutlineColor={colors.primary}
                  textColor={colors.text}
                />
                {error ? (
                  <HelperText type="error" visible={!!error}>{error}</HelperText>
                ) : null}
                <Button
                  mode="contained"
                  onPress={handleSignUp}
                  loading={loading}
                  disabled={loading}
                  style={styles.button}
                  buttonColor={colors.primary}
                >
                  Create Account
                </Button>
                <Button
                  mode="text"
                  onPress={() => router.back()}
                  style={styles.linkButton}
                  textColor={colors.primary}
                >
                  Already have an account? Sign In
                </Button>
              </View>
            </GlassView>
          </View>
        ) : (
        <View style={styles.form}>
          <TextInput
            label="Full Name (optional)"
            value={fullName}
            onChangeText={setFullName}
            mode="outlined"
            style={styles.input}
            outlineColor={colors.border}
            activeOutlineColor={colors.primary}
            textColor={colors.text}
          />

          <TextInput
            label="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            mode="outlined"
            style={styles.input}
            outlineColor={colors.border}
            activeOutlineColor={colors.primary}
            textColor={colors.text}
          />

          <TextInput
            label="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            mode="outlined"
            style={styles.input}
            outlineColor={colors.border}
            activeOutlineColor={colors.primary}
            textColor={colors.text}
          />

          <TextInput
            label="Confirm Password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
            mode="outlined"
            style={styles.input}
            outlineColor={colors.border}
            activeOutlineColor={colors.primary}
            textColor={colors.text}
          />

          {error ? (
            <HelperText type="error" visible={!!error}>
              {error}
            </HelperText>
          ) : null}

          <Button
            mode="contained"
            onPress={handleSignUp}
            loading={loading}
            disabled={loading}
            style={styles.button}
            buttonColor={colors.primary}
          >
            Create Account
          </Button>

          <Button
            mode="text"
            onPress={() => router.back()}
            style={styles.linkButton}
            textColor={colors.primary}
          >
            Already have an account? Sign In
          </Button>
        </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  title: {
    color: colors.primary,
    fontFamily: fontFamily.serif,
    marginBottom: 8,
  },
  subtitle: {
    color: colors.textSecondary,
  },
  formGlassWrapper: {
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
    borderRadius: borderRadius['2xl'],
    overflow: 'hidden',
  },
  formGlass: {
    borderRadius: borderRadius['2xl'],
    overflow: 'hidden',
  },
  formInner: {
    padding: spacing.lg,
  },
  form: {
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
  },
  input: {
    marginBottom: 16,
    backgroundColor: 'transparent',
  },
  button: {
    marginTop: 8,
    paddingVertical: 4,
  },
  linkButton: {
    marginTop: 16,
  },
});
