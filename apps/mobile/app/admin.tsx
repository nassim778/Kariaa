import { useCallback, useState } from "react";
import {
  Alert,
  FlatList,
  Pressable,
  ScrollView,
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

type Tab = "listings" | "users" | "reports";

type ListingReport = {
  id: string;
  listing_id: string;
  reporter_id: string;
  reason: string;
  created_at: string;
  listing?: Pick<
    Listing,
    "id" | "title" | "is_active" | "price" | "delegation"
  > | null;
};

export default function AdminScreen() {
  const insets = useSafeAreaInsets();
  const { user, isAdmin, loading: authLoading, configured } = useAuth();
  const { t, locale } = useI18n();
  const [tab, setTab] = useState<Tab>("listings");
  const [listings, setListings] = useState<Listing[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [reports, setReports] = useState<ListingReport[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const supabase = getSupabase();
    if (!supabase || !isAdmin) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const [listRes, profRes, reportRes] = await Promise.all([
      supabase
        .from("listings")
        .select("*")
        .order("created_at", { ascending: false }),
      supabase
        .from("profiles")
        .select("id, email, is_admin, created_at")
        .order("created_at", { ascending: false }),
      supabase
        .from("listing_reports")
        .select(
          "id, listing_id, reporter_id, reason, created_at, listing:listings(id, title, is_active, price, delegation)",
        )
        .order("created_at", { ascending: false }),
    ]);
    setListings((listRes.data as Listing[]) ?? []);
    setProfiles((profRes.data as Profile[]) ?? []);
    const raw =
      (reportRes.data as Array<
        ListingReport & {
          listing?: ListingReport["listing"] | ListingReport["listing"][];
        }
      >) ?? [];
    setReports(
      raw.map((r) => ({
        ...r,
        listing: Array.isArray(r.listing)
          ? r.listing[0] ?? null
          : r.listing ?? null,
      })),
    );
    setLoading(false);
  }, [isAdmin]);

  useFocusEffect(
    useCallback(() => {
      if (!authLoading) load();
    }, [authLoading, load]),
  );

  const toggleActive = async (id: string, isActive: boolean | null | undefined) => {
    const supabase = getSupabase();
    if (!supabase) return;
    await supabase
      .from("listings")
      .update({ is_active: !(isActive ?? true) })
      .eq("id", id);
    load();
  };

  const deleteListing = (id: string) => {
    Alert.alert(t("admin_delete_listing"), t("admin_delete_confirm"), [
      { text: t("cancel"), style: "cancel" },
      {
        text: t("delete"),
        style: "destructive",
        onPress: async () => {
          const supabase = getSupabase();
          if (!supabase) return;
          await supabase.from("listings").delete().eq("id", id);
          load();
        },
      },
    ]);
  };

  const dismissReport = (id: string) => {
    Alert.alert(t("admin_dismiss_report"), t("admin_dismiss_confirm"), [
      { text: t("cancel"), style: "cancel" },
      {
        text: t("admin_dismiss_report"),
        onPress: async () => {
          const supabase = getSupabase();
          if (!supabase) return;
          await supabase.from("listing_reports").delete().eq("id", id);
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

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleString(
        locale === "tn" ? "ar-TN" : locale === "en" ? "en-GB" : "fr-FR",
        { dateStyle: "short", timeStyle: "short" },
      );
    } catch {
      return iso;
    }
  };

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

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.stats}
      >
        <Stat label={t("admin_stats_listings")} value={listings.length} />
        <Stat label={t("admin_stats_active")} value={activeCount} />
        <Stat
          label={t("admin_stats_inactive")}
          value={listings.length - activeCount}
        />
        <Stat label={t("admin_stats_users")} value={profiles.length} />
        <Stat label={t("admin_stats_reports")} value={reports.length} />
      </ScrollView>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabs}
      >
        {(["listings", "users", "reports"] as Tab[]).map((id) => (
          <Pressable
            key={id}
            onPress={() => setTab(id)}
            style={[styles.tab, tab === id && styles.tabActive]}
          >
            <Text style={[styles.tabText, tab === id && styles.tabTextActive]}>
              {t(
                id === "listings"
                  ? "admin_tab_listings"
                  : id === "users"
                    ? "admin_tab_users"
                    : "admin_tab_reports",
              )}
              {id === "reports" && reports.length > 0
                ? ` (${reports.length})`
                : ""}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {tab === "listings" ? (
        <FlatList
          data={listings}
          keyExtractor={(l) => l.id}
          initialNumToRender={12}
          contentContainerStyle={{
            padding: 16,
            paddingBottom: insets.bottom + 24,
          }}
          renderItem={({ item: l }) => {
            const active = l.is_active !== false;
            return (
              <View style={styles.row}>
                <View style={styles.rowMain}>
                  <Text style={styles.rowTitle} numberOfLines={1}>
                    {l.title}
                  </Text>
                  <Text style={styles.rowMeta} numberOfLines={1}>
                    {t(propertyTypeKey(l.type))} · {sizeLabel(l)} ·{" "}
                    {l.delegation}
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
                    onPress={() => toggleActive(l.id, l.is_active)}
                  >
                    <Text style={styles.smallBtnText}>
                      {active ? t("admin_deactivate") : t("admin_activate")}
                    </Text>
                  </Pressable>
                  <Pressable
                    style={[styles.smallBtn, styles.dangerBtn]}
                    onPress={() => deleteListing(l.id)}
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
      ) : tab === "users" ? (
        <FlatList
          data={profiles}
          keyExtractor={(p) => p.id}
          initialNumToRender={12}
          contentContainerStyle={{
            padding: 16,
            paddingBottom: insets.bottom + 24,
          }}
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
                    {p.is_admin === 1
                      ? t("admin_role_admin")
                      : t("admin_role_user")}
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
      ) : (
        <FlatList
          data={reports}
          keyExtractor={(r) => r.id}
          initialNumToRender={12}
          contentContainerStyle={{
            padding: 16,
            paddingBottom: insets.bottom + 24,
          }}
          ListEmptyComponent={
            <Text style={styles.empty}>{t("admin_no_reports")}</Text>
          }
          renderItem={({ item: r }) => {
            const listing = r.listing;
            const reporter =
              profiles.find((p) => p.id === r.reporter_id)?.email ??
              r.reporter_id.slice(0, 8);
            return (
              <View style={styles.row}>
                <Text style={styles.rowTitle} numberOfLines={1}>
                  {listing?.title ?? r.listing_id.slice(0, 8)}
                </Text>
                <Text style={styles.rowMeta}>{r.reason}</Text>
                <Text style={styles.rowMeta}>
                  {t("admin_col_reporter")}: {reporter}
                </Text>
                <Text style={styles.rowMeta}>{formatDate(r.created_at)}</Text>
                <View style={styles.rowActions}>
                  {listing && (
                    <>
                      <Pressable
                        style={styles.smallBtn}
                        onPress={() =>
                          toggleActive(listing.id, listing.is_active)
                        }
                      >
                        <Text style={styles.smallBtnText}>
                          {listing.is_active !== false
                            ? t("admin_deactivate")
                            : t("admin_activate")}
                        </Text>
                      </Pressable>
                      <Pressable
                        style={[styles.smallBtn, styles.dangerBtn]}
                        onPress={() => deleteListing(listing.id)}
                      >
                        <Text style={styles.dangerText}>
                          {t("admin_delete_listing")}
                        </Text>
                      </Pressable>
                    </>
                  )}
                  <Pressable
                    style={styles.smallBtn}
                    onPress={() => dismissReport(r.id)}
                  >
                    <Text style={styles.smallBtnText}>
                      {t("admin_dismiss_report")}
                    </Text>
                  </Pressable>
                </View>
              </View>
            );
          }}
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
    minWidth: 88,
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
  empty: {
    textAlign: "center",
    color: colors.slate500,
    fontSize: 14,
    marginTop: 32,
  },
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
  rowPrice: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.brand,
    marginTop: 2,
  },
  rowActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    alignItems: "center",
    marginTop: 8,
  },
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
