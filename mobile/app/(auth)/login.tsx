import { Link } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from "react-native";

import Button from "../../components/Button";
import FormInput from "../../components/FormInput";
import Screen from "../../components/Screen";
import { colors } from "../../constants/theme";
import { getApiErrorMessage } from "../../lib/api/client";
import { useAuthStore } from "../../stores/authStore";

interface LoginForm {
  email: string;
  password: string;
}

type LoginErrors = Partial<Record<keyof LoginForm, string>>;

export default function LoginScreen() {
  const login = useAuthStore((state) => state.login);

  const [form, setForm] = useState<LoginForm>({ email: "", password: "" });
  const [errors, setErrors] = useState<LoginErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const validate = (): boolean => {
    const next: LoginErrors = {};

    if (!form.email.trim()) {
      next.email = "Email is required.";
    } else if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) {
      next.email = "Enter a valid email address.";
    }

    if (!form.password) {
      next.password = "Password is required.";
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async () => {
    if (loading || !validate()) return;

    setLoading(true);
    setSubmitError(null);
    try {
      await login({ email: form.email.trim(), password: form.password });
    } catch (error) {
      setSubmitError(getApiErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ flexGrow: 1, justifyContent: "center", paddingVertical: 32 }}
          keyboardShouldPersistTaps="handled"
        >
          <View className="mb-8">
            <Text className="text-3xl font-bold text-slate-900">Welcome back</Text>
            <Text className="mt-2 text-slate-500">Sign in to continue to your classroom.</Text>
          </View>

          <FormInput
            label="Email"
            value={form.email}
            onChangeText={(email) => setForm((f) => ({ ...f, email }))}
            placeholder="you@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            error={errors.email}
            editable={!loading}
          />

          <FormInput
            label="Password"
            value={form.password}
            onChangeText={(password) => setForm((f) => ({ ...f, password }))}
            placeholder="Enter your password"
            secureTextEntry
            autoCapitalize="none"
            autoComplete="current-password"
            error={errors.password}
            editable={!loading}
          />

          {submitError ? (
            <Text className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">
              {submitError}
            </Text>
          ) : null}

          <Button title="Sign In" onPress={handleSubmit} loading={loading} />

          <View className="mt-6 flex-row items-center justify-center">
            <Text className="text-slate-500">Don&apos;t have an account? </Text>
            <Link href="/(auth)/register" className="font-semibold" style={{ color: colors.primary }}>
              Register
            </Link>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
