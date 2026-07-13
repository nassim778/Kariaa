import { Pressable, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import {
  Listing,
  listingCoverImage,
  propertyTypeKey,
} from "@karia/shared";
import { useI18n } from "@/providers/LanguageProvider";
import { colors, radius, PLACEHOLDER_IMAGE } from "@/theme";

interface Props {
  listing: Listing;
  active?: boolean;
  onPress: () => void;
}

export default function ListingCard({ listing: l, active, onPress }: Props) {
  const { t } = useI18n();
  const cover = listingCoverImage(l) ?? PLACEHOLDER_IMAGE;

  return (
    <Pressable
      onPress={onPress}
      style={[styles.row, active && styles.rowActive]}
    >
      <Image source={{ uri: cover }} style={styles.thumb} contentFit="cover" />
      <View style={styles.body}>
        <View style={styles.priceRow}>
          <Text style={styles.price}>
            {l.price} {t("currency")}
          </Text>
          <Text style={styles.perMonth}>{t("per_month")}</Text>
          {l.distance_m !== undefined && (
            <Text style={styles.distance}>
              {(l.distance_m / 1000).toFixed(1)} km
            </Text>
          )}
        </View>
        <Text style={styles.title} numberOfLines={1}>
          {l.title}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          {t(propertyTypeKey(l.type))} · {l.bedrooms} {t("rooms_abbr")} ·{" "}
          {l.area_sqm ?? "—"} m²
        </Text>
        <Text style={styles.location} numberOfLines={1}>
          {[l.delegation, l.governorate].filter(Boolean).join(", ")}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: 12,
    padding: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.slate100,
  },
  rowActive: { backgroundColor: colors.teal50 },
  thumb: {
    width: 88,
    height: 72,
    borderRadius: radius.md,
    backgroundColor: colors.slate100,
  },
  body: { flex: 1, minWidth: 0 },
  priceRow: { flexDirection: "row", alignItems: "baseline", gap: 4 },
  price: { fontSize: 14, fontWeight: "700", color: colors.brand },
  perMonth: { fontSize: 11, color: colors.slate400 },
  distance: {
    marginLeft: "auto",
    fontSize: 11,
    fontWeight: "600",
    color: colors.blue,
  },
  title: { fontSize: 14, fontWeight: "600", color: colors.slate800, marginTop: 2 },
  meta: { fontSize: 12, color: colors.slate500, marginTop: 1 },
  location: { fontSize: 11, color: colors.slate400, marginTop: 1 },
});
