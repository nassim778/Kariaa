import { useEffect, useState } from "react";
import {
  Dimensions,
  FlatList,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import {
  Listing,
  listingImages,
  propertyTypeKey,
  sizeLabel,
} from "@karia/shared";
import { useAuth } from "@/providers/AuthProvider";
import { useI18n } from "@/providers/LanguageProvider";
import { getListingById } from "@/lib/api";
import Spinner from "@/components/Spinner";
import { colors, radius as rad, PLACEHOLDER_IMAGE } from "@/theme";

const { width } = Dimensions.get("window");

export default function ListingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { t } = useI18n();
  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);
  const [imageIdx, setImageIdx] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!id) return;
      const l = await getListingById(id);
      if (!cancelled) {
        setListing(l);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) {
    return <Spinner style={styles.center} />;
  }
  if (!listing) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>{t("generic_error")}</Text>
      </View>
    );
  }

  const l = listing;
  const images = listingImages(l);
  const displayImages = images.length ? images : [PLACEHOLDER_IMAGE];
  const owned = Boolean(user?.id && l.owner_id && l.owner_id === user.id);
  const phoneHref = l.phone?.replace(/[^\d+]/g, "");

  return (
    <View style={styles.root}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View>
          <FlatList
            data={displayImages}
            keyExtractor={(_, i) => String(i)}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(e) =>
              setImageIdx(Math.round(e.nativeEvent.contentOffset.x / width))
            }
            renderItem={({ item }) => (
              <Image source={{ uri: item }} style={styles.hero} contentFit="cover" />
            )}
          />
          {displayImages.length > 1 && (
            <View style={styles.dots}>
              {displayImages.map((_, i) => (
                <View
                  key={i}
                  style={[styles.dot, i === imageIdx && styles.dotActive]}
                />
              ))}
            </View>
          )}
          <Pressable style={styles.closeBtn} onPress={() => router.back()}>
            <Text style={styles.closeText}>✕</Text>
          </Pressable>
        </View>

        <View style={styles.body}>
          <View style={styles.priceRow}>
            <Text style={styles.price}>
              {l.price} {t("currency")}
            </Text>
            <Text style={styles.perMonth}>{t("per_month")}</Text>
            {l.distance_m !== undefined && (
              <Text style={styles.distance}>
                {(l.distance_m / 1000).toFixed(1)} {t("km")}
              </Text>
            )}
          </View>

          <Text style={styles.title}>{l.title}</Text>
          <Text style={styles.meta}>
            {t(propertyTypeKey(l.type))} · {sizeLabel(l)} · {l.bedrooms}{" "}
            {t("rooms_abbr")} · {l.bathrooms} {t("field_baths")} ·{" "}
            {l.area_sqm ?? "—"} m²
          </Text>

          {l.phone && (
            <Pressable
              style={styles.callBtn}
              onPress={() =>
                phoneHref && Linking.openURL(`tel:${phoneHref}`)
              }
            >
              <Text style={styles.callText}>
                {t("call_owner")} · {l.phone}
              </Text>
            </Pressable>
          )}

          <View style={styles.locationBox}>
            <Text style={styles.locationLabel}>{t("location_label")}</Text>
            <Text style={styles.locationValue}>
              {[l.delegation, l.governorate].filter(Boolean).join(", ") || "—"}
            </Text>
            {l.address && <Text style={styles.address}>{l.address}</Text>}
            <Text style={styles.coords}>
              {l.lat.toFixed(5)}, {l.lng.toFixed(5)}
            </Text>
          </View>

          <Text style={styles.sectionLabel}>{t("field_description")}</Text>
          <Text style={styles.description}>
            {l.description?.trim() || t("detail_no_description")}
          </Text>

          {owned && (
            <Pressable
              style={styles.editBtn}
              onPress={() =>
                router.replace({
                  pathname: "/add-listing",
                  params: { id: l.id },
                })
              }
            >
              <Text style={styles.editText}>{t("edit_my_listing")}</Text>
            </Pressable>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.white },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.white,
  },
  muted: { color: colors.slate400 },
  hero: { width, height: 260, backgroundColor: colors.slate100 },
  dots: {
    position: "absolute",
    bottom: 10,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.5)",
  },
  dotActive: { width: 16, backgroundColor: colors.white },
  closeBtn: {
    position: "absolute",
    top: 44,
    right: 16,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  closeText: { color: colors.white, fontSize: 16 },
  body: { padding: 20 },
  priceRow: { flexDirection: "row", alignItems: "baseline", gap: 6 },
  price: { fontSize: 26, fontWeight: "800", color: colors.brand },
  perMonth: { fontSize: 14, color: colors.slate400 },
  distance: {
    marginLeft: "auto",
    backgroundColor: colors.blueLight,
    color: colors.blue,
    fontSize: 12,
    fontWeight: "600",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: rad.full,
    overflow: "hidden",
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.slate800,
    marginTop: 8,
  },
  meta: { fontSize: 13, color: colors.slate500, marginTop: 4 },
  callBtn: {
    marginTop: 16,
    backgroundColor: colors.brand,
    borderRadius: rad.md,
    paddingVertical: 14,
    alignItems: "center",
  },
  callText: { color: colors.white, fontWeight: "600", fontSize: 14 },
  locationBox: {
    marginTop: 16,
    backgroundColor: colors.slate50,
    borderRadius: rad.md,
    borderWidth: 1,
    borderColor: colors.slate100,
    padding: 12,
  },
  locationLabel: { fontSize: 12, fontWeight: "600", color: colors.slate500 },
  locationValue: { fontSize: 14, color: colors.slate700, marginTop: 4 },
  address: { fontSize: 12, color: colors.slate500, marginTop: 2 },
  coords: {
    fontSize: 11,
    color: colors.slate400,
    marginTop: 6,
    fontFamily: "monospace",
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.slate500,
    marginTop: 16,
  },
  description: {
    fontSize: 14,
    color: colors.slate600,
    marginTop: 4,
    lineHeight: 21,
  },
  editBtn: {
    marginTop: 22,
    borderWidth: 1,
    borderColor: colors.brand,
    borderRadius: rad.md,
    paddingVertical: 12,
    alignItems: "center",
  },
  editText: { color: colors.brand, fontWeight: "600", fontSize: 14 },
});
