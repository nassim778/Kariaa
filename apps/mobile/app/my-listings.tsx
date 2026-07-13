import { useCallback, useState } from "react";
import {
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import {
  Listing,
  listingCoverImage,
  propertyTypeKey,
  sizeLabel,
} from "@karia/shared";
import { useAuth } from "@/providers/AuthProvider";
import { useI18n } from "@/providers/LanguageProvider";
import { apiBaseUrl, getSupabase } from "@/lib/supabase";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import Spinner from "@/components/Spinner";
import { colors, radius as rad, PLACEHOLDER_IMAGE } from "@/theme";

export default function MyListingsScreen() {
  const insets = useSafeAreaInsets();
  const { user, isAdmin, loading: authLoading, configured, session, signOut } =
    useAuth();
  const { t } = useI18n();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const supabase = getSupabase();
    if (!supabase || !user) {
      setListings([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data } = await supabase
      .from("listings")
      .select("*")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: false });
    setListings((data as Listing[]) ?? []);
    setLoading(false);
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      if (!authLoading) load();
    }, [authLoading, load])
  );

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Text style={styles.back}>{t("back_to_map")}</Text>
        </Pressable>
        <View style={styles.headerRight}>
          {isAdmin && (
            <Pressable
              style={styles.adminLink}
              onPress={() => router.push("/admin")}
            >
              <Text style={styles.adminLinkText}>{t("admin_space")}</Text>
            </Pressable>
          )}
          <LanguageSwitcher />
        </View>
      </View>
      <Text style={styles.title}>{t("my_listings")}</Text>

      {authLoading || loading ? (
        <Spinner style={styles.center} />
      ) : !configured ? (
        <Empty text={t("not_configured_manage")} />
      ) : !user ? (
        <Empty text={t("login_to_manage")}>
          <Pressable style={styles.cta} onPress={() => router.push("/auth")}>
            <Text style={styles.ctaText}>{t("login")}</Text>
          </Pressable>
        </Empty>
      ) : (
        <FlatList
          data={listings}
          keyExtractor={(l) => l.id}
          contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24 }}
          ListEmptyComponent={<Empty text={t("no_listings_yet")} />}
          ListFooterComponent={
            user ? (
              <View style={styles.dangerZone}>
                <Pressable
                  style={styles.logoutBtn}
                  onPress={async () => {
                    await signOut();
                    router.replace("/");
                  }}
                >
                  <Text style={styles.logoutText}>{t("logout")}</Text>
                </Pressable>
                <Pressable
                  style={styles.deleteBtn}
                  onPress={() => {
                    Alert.alert(t("delete_account"), t("delete_account_confirm"), [
                      { text: t("cancel"), style: "cancel" },
                      {
                        text: t("delete_account"),
                        style: "destructive",
                        onPress: async () => {
                          if (!session?.access_token || !apiBaseUrl) {
                            Alert.alert(
                              t("generic_error"),
                              "Set EXPO_PUBLIC_GEOCODE_BASE_URL and service role on web"
                            );
                            return;
                          }
                          const res = await fetch(`${apiBaseUrl}/api/account`, {
                            method: "DELETE",
                            headers: {
                              Authorization: `Bearer ${session.access_token}`,
                            },
                          });
                          if (!res.ok) {
                            const data = await res.json().catch(() => ({}));
                            Alert.alert(
                              t("generic_error"),
                              data?.error?.message ?? t("generic_error")
                            );
                            return;
                          }
                          await signOut();
                          Alert.alert(t("delete_account_done"));
                          router.replace("/");
                        },
                      },
                    ]);
                  }}
                >
                  <Text style={styles.deleteText}>{t("delete_account")}</Text>
                </Pressable>
              </View>
            ) : null
          }
          renderItem={({ item: l }) => (
            <View style={styles.card}>
              <Image
                source={{ uri: listingCoverImage(l) ?? PLACEHOLDER_IMAGE }}
                style={styles.cardImage}
                contentFit="cover"
              />
              <View style={styles.cardBody}>
                <Text style={styles.badge}>{sizeLabel(l)}</Text>
                <Text style={styles.cardPrice}>
                  {l.price} {t("currency")}
                  <Text style={styles.perMonth}> {t("per_month")}</Text>
                </Text>
                <Text style={styles.cardTitle} numberOfLines={1}>
                  {l.title}
                </Text>
                <Text style={styles.cardMeta} numberOfLines={1}>
                  {t(propertyTypeKey(l.type))} · {l.bedrooms} {t("rooms_abbr")} ·{" "}
                  {l.area_sqm ?? "—"} m²
                </Text>
                <Pressable
                  style={styles.editBtn}
                  onPress={() =>
                    router.push({
                      pathname: "/add-listing",
                      params: { id: l.id },
                    })
                  }
                >
                  <Text style={styles.editText}>{t("edit_delete")}</Text>
                </Pressable>
              </View>
            </View>
          )}
        />
      )}
    </View>
  );
}

function Empty({
  text,
  children,
}: {
  text: string;
  children?: React.ReactNode;
}) {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyText}>{text}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.slate50 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  back: { fontSize: 13, fontWeight: "600", color: colors.slate600 },
  adminLink: {
    backgroundColor: colors.redLight,
    borderRadius: rad.sm,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  adminLinkText: { fontSize: 12, fontWeight: "600", color: colors.red },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: colors.slate800,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  center: { flex: 1 },
  card: {
    flexDirection: "row",
    gap: 12,
    backgroundColor: colors.white,
    borderRadius: rad.lg,
    borderWidth: 1,
    borderColor: colors.slate200,
    padding: 10,
    marginBottom: 12,
  },
  cardImage: {
    width: 96,
    height: 96,
    borderRadius: rad.md,
    backgroundColor: colors.slate100,
  },
  cardBody: { flex: 1, minWidth: 0 },
  badge: {
    alignSelf: "flex-start",
    backgroundColor: colors.brand,
    color: colors.white,
    fontSize: 11,
    fontWeight: "700",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: rad.full,
    overflow: "hidden",
  },
  cardPrice: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.brand,
    marginTop: 4,
  },
  perMonth: { fontSize: 11, fontWeight: "400", color: colors.slate400 },
  cardTitle: { fontSize: 14, fontWeight: "600", color: colors.slate800, marginTop: 2 },
  cardMeta: { fontSize: 12, color: colors.slate500, marginTop: 1 },
  editBtn: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: colors.brand,
    borderRadius: rad.sm,
    paddingVertical: 8,
    alignItems: "center",
  },
  editText: { fontSize: 12, fontWeight: "600", color: colors.brand },
  empty: {
    margin: 16,
    padding: 32,
    borderRadius: rad.lg,
    borderWidth: 1,
    borderColor: colors.slate200,
    borderStyle: "dashed",
    backgroundColor: colors.white,
    alignItems: "center",
  },
  emptyText: { fontSize: 14, color: colors.slate500, textAlign: "center" },
  cta: {
    marginTop: 12,
    backgroundColor: colors.brand,
    borderRadius: rad.md,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  ctaText: { color: colors.white, fontWeight: "600" },
  dangerZone: { marginTop: 24, gap: 10 },
  logoutBtn: {
    borderWidth: 1,
    borderColor: colors.slate200,
    borderRadius: rad.md,
    paddingVertical: 12,
    alignItems: "center",
    backgroundColor: colors.white,
  },
  logoutText: { color: colors.slate600, fontWeight: "600" },
  deleteBtn: {
    borderRadius: rad.md,
    paddingVertical: 12,
    alignItems: "center",
    backgroundColor: "#fef2f2",
    borderWidth: 1,
    borderColor: "#fecaca",
  },
  deleteText: { color: colors.red, fontWeight: "700" },
});
