import { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { router } from "expo-router";
import { useI18n } from "@/providers/LanguageProvider";
import { useAuth } from "@/providers/AuthProvider";
import { getSupabase, isSupabaseConfigured, legalBaseUrl } from "@/lib/supabase";
import Spinner from "@/components/Spinner";
import { colors, radius as rad } from "@/theme";

type Mode = "signin" | "signup" | "reset";

export default function AuthScreen() {
  const { t } = useI18n();
  const { signOut, user } = useAuth();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const openLegal = (path: "/privacy" | "/terms") => {
    if (!legalBaseUrl) {
      Alert.alert(t("generic_error"), "Set EXPO_PUBLIC_LEGAL_BASE_URL");
      return;
    }
    Linking.openURL(`${legalBaseUrl.replace(/\/$/, "")}${path}`);
  };

  const submit = async () => {
    setError(null);
    setInfo(null);
    const supabase = getSupabase();
    if (!supabase) {
      setError(t("auth_unavailable"));
      return;
    }
    if (!email.trim()) {
      setError(t("required_error"));
      return;
    }
    if (mode !== "reset" && password.length < 6) {
      setError(t("required_error"));
      return;
    }
    setLoading(true);
    try {
      if (mode === "reset") {
        const redirectTo = legalBaseUrl
          ? `${legalBaseUrl.replace(/\/$/, "")}/auth/callback?next=/reset-password`
          : undefined;
        const { error } = await supabase.auth.resetPasswordForEmail(
          email.trim(),
          redirectTo ? { redirectTo } : undefined,
        );
        if (error) throw error;
        setInfo(t("reset_password_sent"));
      } else if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
        });
        if (error) throw error;
        if (data.session) {
          router.back();
        } else {
          setInfo(t("signup_confirm_email"));
          setMode("signin");
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) throw error;
        router.back();
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t("generic_error"));
    } finally {
      setLoading(false);
    }
  };

  const title =
    mode === "reset"
      ? t("forgot_password")
      : mode === "signin"
        ? t("signin_title")
        : t("signup_title");

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <Text style={styles.brand}>Karia</Text>
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <Text style={styles.close}>✕</Text>
          </Pressable>
        </View>

        <Text style={styles.title}>{title}</Text>
        {mode !== "reset" && (
          <Text style={styles.sub}>
            {mode === "signin" ? t("signin_sub") : t("signup_sub")}
          </Text>
        )}

        {!isSupabaseConfigured && (
          <Text style={styles.warn}>{t("auth_unavailable")}</Text>
        )}

        <Text style={styles.label}>{t("email")}</Text>
        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder={t("email_ph")}
          placeholderTextColor={colors.slate400}
          autoCapitalize="none"
          keyboardType="email-address"
          style={styles.input}
        />

        {mode !== "reset" && (
          <>
            <Text style={styles.label}>{t("password")}</Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              placeholderTextColor={colors.slate400}
              secureTextEntry
              style={styles.input}
            />
          </>
        )}

        {error && <Text style={styles.error}>{error}</Text>}
        {info && <Text style={styles.info}>{info}</Text>}

        <Pressable
          style={[styles.submit, loading && styles.submitDisabled]}
          onPress={submit}
          disabled={loading}
        >
          {loading ? (
            <Spinner size="small" color={colors.white} />
          ) : (
            <Text style={styles.submitText}>
              {mode === "reset"
                ? t("reset_password_btn")
                : mode === "signin"
                  ? t("signin_btn")
                  : t("signup_btn")}
            </Text>
          )}
        </Pressable>

        {mode === "signin" && (
          <Pressable
            onPress={() => {
              setMode("reset");
              setError(null);
              setInfo(null);
            }}
            style={styles.forgot}
          >
            <Text style={styles.switchLink}>{t("forgot_password")}</Text>
          </Pressable>
        )}

        <View style={styles.switchRow}>
          {mode === "reset" ? (
            <Pressable
              onPress={() => {
                setMode("signin");
                setError(null);
                setInfo(null);
              }}
            >
              <Text style={styles.switchLink}>{t("signin_btn")}</Text>
            </Pressable>
          ) : (
            <>
              <Text style={styles.switchLabel}>
                {mode === "signin" ? t("no_account") : t("have_account")}{" "}
              </Text>
              <Pressable
                onPress={() => {
                  setMode(mode === "signin" ? "signup" : "signin");
                  setError(null);
                  setInfo(null);
                }}
              >
                <Text style={styles.switchLink}>
                  {mode === "signin" ? t("create_account") : t("signin_btn")}
                </Text>
              </Pressable>
            </>
          )}
        </View>

        {user && (
          <Pressable
            style={styles.logout}
            onPress={async () => {
              await signOut();
              router.back();
            }}
          >
            <Text style={styles.logoutText}>{t("logout")}</Text>
          </Pressable>
        )}

        <View style={styles.legalRow}>
          <Pressable onPress={() => openLegal("/privacy")}>
            <Text style={styles.legalLink}>{t("privacy_link")}</Text>
          </Pressable>
          <Pressable onPress={() => openLegal("/terms")}>
            <Text style={styles.legalLink}>{t("terms_link")}</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.white },
  content: { padding: 24, paddingTop: 20 },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  brand: { fontSize: 20, fontWeight: "800", color: colors.brand },
  close: { fontSize: 20, color: colors.slate400 },
  title: { fontSize: 22, fontWeight: "700", color: colors.slate800 },
  sub: { fontSize: 13, color: colors.slate500, marginTop: 4, marginBottom: 8 },
  warn: {
    backgroundColor: colors.redLight,
    color: colors.red,
    fontSize: 12,
    padding: 10,
    borderRadius: rad.sm,
    marginTop: 8,
  },
  label: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.slate600,
    marginTop: 16,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.slate200,
    borderRadius: rad.md,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.slate800,
  },
  error: {
    backgroundColor: colors.redLight,
    color: colors.red,
    fontSize: 12,
    padding: 10,
    borderRadius: rad.sm,
    marginTop: 14,
  },
  info: {
    backgroundColor: colors.teal50,
    color: colors.teal700,
    fontSize: 12,
    padding: 10,
    borderRadius: rad.sm,
    marginTop: 14,
  },
  submit: {
    marginTop: 20,
    backgroundColor: colors.brand,
    borderRadius: rad.md,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 50,
  },
  submitDisabled: { opacity: 0.7 },
  submitText: { color: colors.white, fontWeight: "700", fontSize: 15 },
  forgot: { marginTop: 12, alignItems: "center" },
  switchRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 18,
    flexWrap: "wrap",
  },
  switchLabel: { fontSize: 13, color: colors.slate500 },
  switchLink: { fontSize: 13, fontWeight: "600", color: colors.brand },
  logout: {
    marginTop: 24,
    alignItems: "center",
    padding: 12,
    borderRadius: rad.md,
    borderWidth: 1,
    borderColor: colors.slate200,
  },
  logoutText: { color: colors.slate600, fontWeight: "600" },
  legalRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 16,
    marginTop: 20,
  },
  legalLink: { fontSize: 12, color: colors.slate400 },
});
