import { useCallback, useState } from "react";
import {
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import {
  Listing,
  Profile,
  propertyTypeKey,
  sizeLabel,
} from "@karia/shared";
import { useAuth } from "@/providers/AuthProvider";
import { useI18n } from "@/providers/LanguageProvider";
import { getSupabase } from "@/lib/supabase";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import Spinner from "@/components/Spinner";
import { colors, radius as rad } from "@/theme";

type Tab = "listings" | "users";

export default function AdminScreen() {
  const insets = useSafeAreaInsets();
  const { user, isAdmin, loading: authLoading, configured } = useAuth();
  const { t } = useI18n();
  const [tab, setTab] = useState<Tab>("listings");
  const [listings, setListings] = useState<Listing[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const supabase = getSupabase();
    if (!supabase || !isAdmin) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const [listRes, profRes] = await Promise.all([
      supabase.from("listings").select("*").order("created_at", { ascending: false }),
      supabase
        .from("profiles")
        .select("id, email, is_admin, created_at")
        .order("created_at", { ascending: false }),
    ]);
    setListings((listRes.data as Listing[]) ?? []);
    setProfiles((profRes.data as Profile[]) ?? []);
    setLoading(false);
  }, [isAdmin]);

  useFocusEffect(
    useCallback(() => {
      if (!authLoading) load();
    }, [authLoading, load])
  );

  const toggleActive = async (l: Listing) => {
    const supabase = getSupabase();
    if (!supabase) return;
    await supabase
      .from("listings")
      .update({ is_active: !(l.is_active ?? true) })
      .eq("id", l.id);
    load();
  };

  const deleteListing = (l: Listing) => {
    Alert.alert(t("admin_delete_listing"), t("admin_delete_confirm"), [
      { text: t("cancel"), style: "cancel" },
      {
        text: t("delete"),
        style: "destructive",
        onPress: async () => {
          const supabase = getSupabase();
          if (!supabase) return;
          await supabase.from("listings").delete().eq("id", l.id);
          load();
        },
      },
    ]);
  };

  const toggleAdmin = async (p: Profile) => {
    if (p.id === user?.id) return;
    const supabase = getSupabase();
    if (!supabase) return;
    await supabase
      .from("profiles")
      .update({ is_admin: p.is_admin === 1 ? 0 : 1 })
      .eq("id", p.id);
    load();
  };

  const activeCount = listings.filter((l) => l.is_active !== false).length;

  if (authLoading || loading) {
    return <Spinner style={styles.fullCenter} />;
  }

  if (!configured || !user || !isAdmin) {
    return (
      <View style={styles.fullCenter}>
        <Text style={styles.denied}>{t("admin_access_denied")}</Text>
        <Pressable style={styles.cta} onPress={() => router.replace("/")}>
          <Text style={styles.ctaText}>{t("admin_back")}</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Text style={styles.back}>{t("admin_back")}</Text>
        </Pressable>
        <LanguageSwitcher />
      </View>
      <Text style={styles.title}>{t("admin_title")}</Text>

      <View style={styles.stats}>
        <Stat label={t("admin_stats_listings")} value={listings.length} />
        <Stat label={t("admin_stats_active")} value={activeCount} />
        <Stat
          label={t("admin_stats_inactive")}
          value={listings.length - activeCount}
        />
        <Stat label={t("admin_stats_users")} value={profiles.length} />
      </View>

      <View style={styles.tabs}>
        {(["listings", "users"] as Tab[]).map((id) => (
          <Pressable
            key={id}
            onPress={() => setTab(id)}
            style={[styles.tab, tab === id && styles.tabActive]}
          >
            <Text style={[styles.tabText, tab === id && styles.tabTextActive]}>
              {t(id === "listings" ? "admin_tab_listings" : "admin_tab_users")}
            </Text>
          </Pressable>
        ))}
      </View>

      {tab === "listings" ? (
        <FlatList
          data={listings}
          keyExtractor={(l) => l.id}
          initialNumToRender={12}
          contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24 }}
          renderItem={({ item: l }) => {
            const active = l.is_active !== false;
            return (
              <View style={styles.row}>
                <View style={styles.rowMain}>
                  <Text style={styles.rowTitle} numberOfLines={1}>
                    {l.title}
                  </Text>
                  <Text style={styles.rowMeta} numberOfLines={1}>
                    {t(propertyTypeKey(l.type))} · {sizeLabel(l)} · {l.delegation}
                  </Text>
                  <Text style={styles.rowPrice}>
                    {l.price} {t("currency")}
                  </Text>
                </View>
                <View style={styles.rowActions}>
                  <View
                    style={[
                      styles.statusBadge,
                      active ? styles.statusActive : styles.statusInactive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusText,
                        active
                          ? styles.statusTextActive
                          : styles.statusTextInactive,
                      ]}
                    >
                      {active
                        ? t("admin_status_active")
                        : t("admin_status_inactive")}
                    </Text>
                  </View>
                  <Pressable
                    style={styles.smallBtn}
                    onPress={() => toggleActive(l)}
                  >
                    <Text style={styles.smallBtnText}>
                      {active ? t("admin_deactivate") : t("admin_activate")}
                    </Text>
                  </Pressable>
                  <Pressable
                    style={[styles.smallBtn, styles.dangerBtn]}
                    onPress={() => deleteListing(l)}
                  >
                    <Text style={styles.dangerText}>
                      {t("admin_delete_listing")}
                    </Text>
                  </Pressable>
                </View>
              </View>
            );
          }}
        />
      ) : (
        <FlatList
          data={profiles}
          keyExtractor={(p) => p.id}
          initialNumToRender={12}
          contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24 }}
          renderItem={({ item: p }) => (
            <View style={styles.row}>
              <View style={styles.rowMain}>
                <Text style={styles.rowTitle} numberOfLines={1}>
                  {p.email ?? p.id.slice(0, 8)}
                  {p.id === user.id ? `  ${t("admin_you")}` : ""}
                </Text>
                <View
                  style={[
                    styles.roleBadge,
                    p.is_admin === 1 ? styles.roleAdmin : styles.roleUser,
                  ]}
                >
                  <Text
                    style={[
                      styles.roleText,
                      p.is_admin === 1
                        ? styles.roleTextAdmin
                        : styles.roleTextUser,
                    ]}
                  >
                    {p.is_admin === 1 ? t("admin_role_admin") : t("admin_role_user")}
                  </Text>
                </View>
              </View>
              {p.id !== user.id && (
                <Pressable style={styles.smallBtn} onPress={() => toggleAdmin(p)}>
                  <Text style={styles.smallBtnText}>
                    {p.is_admin === 1
                      ? t("admin_remove_admin")
                      : t("admin_make_admin")}
                  </Text>
                </Pressable>
              )}
            </View>
          )}
        />
      )}
    </View>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.slate50 },
  fullCenter: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    backgroundColor: colors.slate50,
    padding: 24,
  },
  denied: { fontSize: 14, color: colors.slate600, textAlign: "center" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  back: { fontSize: 13, fontWeight: "600", color: colors.slate600 },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: colors.slate800,
    paddingHorizontal: 16,
  },
  stats: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
    marginTop: 12,
  },
  stat: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: rad.md,
    borderWidth: 1,
    borderColor: colors.slate200,
    padding: 10,
  },
  statValue: { fontSize: 20, fontWeight: "800", color: colors.slate800 },
  statLabel: { fontSize: 10, color: colors.slate500, marginTop: 2 },
  tabs: { flexDirection: "row", gap: 8, padding: 16, paddingBottom: 4 },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: rad.sm,
    backgroundColor: colors.white,
  },
  tabActive: { backgroundColor: colors.brand },
  tabText: { fontSize: 13, fontWeight: "600", color: colors.slate600 },
  tabTextActive: { color: colors.white },
  row: {
    backgroundColor: colors.white,
    borderRadius: rad.md,
    borderWidth: 1,
    borderColor: colors.slate200,
    padding: 12,
    marginBottom: 10,
  },
  rowMain: { marginBottom: 8 },
  rowTitle: { fontSize: 14, fontWeight: "600", color: colors.slate800 },
  rowMeta: { fontSize: 12, color: colors.slate400, marginTop: 2 },
  rowPrice: { fontSize: 13, fontWeight: "600", color: colors.brand, marginTop: 2 },
  rowActions: { flexDirection: "row", flexWrap: "wrap", gap: 8, alignItems: "center" },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: rad.full,
  },
  statusActive: { backgroundColor: colors.teal100 },
  statusInactive: { backgroundColor: colors.slate100 },
  statusText: { fontSize: 11, fontWeight: "600" },
  statusTextActive: { color: colors.teal700 },
  statusTextInactive: { color: colors.slate500 },
  smallBtn: {
    borderWidth: 1,
    borderColor: colors.slate200,
    borderRadius: rad.sm,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  smallBtnText: { fontSize: 12, color: colors.slate600, fontWeight: "500" },
  dangerBtn: { borderColor: "#fecaca" },
  dangerText: { fontSize: 12, color: colors.red, fontWeight: "500" },
  roleBadge: {
    alignSelf: "flex-start",
    marginTop: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: rad.full,
  },
  roleAdmin: { backgroundColor: colors.slate800 },
  roleUser: { backgroundColor: colors.slate100 },
  roleText: { fontSize: 11, fontWeight: "600" },
  roleTextAdmin: { color: colors.white },
  roleTextUser: { color: colors.slate600 },
  cta: {
    backgroundColor: colors.brand,
    borderRadius: rad.md,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  ctaText: { color: colors.white, fontWeight: "600" },
});
