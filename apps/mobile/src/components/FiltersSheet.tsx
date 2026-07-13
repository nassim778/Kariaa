import { useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  Filters,
  PROPERTY_TYPES,
  PropertyType,
  RADII,
  propertyTypeKey,
} from "@karia/shared";
import { useI18n } from "@/providers/LanguageProvider";
import { colors, radius as rad } from "@/theme";

interface Props {
  visible: boolean;
  onClose: () => void;
  filters: Filters;
  onChange: (f: Filters) => void;
  radiusM: number;
  onRadiusChange: (m: number) => void;
  poiActive: boolean;
}

export default function FiltersSheet({
  visible,
  onClose,
  filters,
  onChange,
  radiusM,
  onRadiusChange,
  poiActive,
}: Props) {
  const { t } = useI18n();
  const [minPrice, setMinPrice] = useState(
    filters.minPrice != null ? String(filters.minPrice) : ""
  );
  const [maxPrice, setMaxPrice] = useState(
    filters.maxPrice != null ? String(filters.maxPrice) : ""
  );

  const selectedType = filters.types?.length === 1 ? filters.types[0] : null;

  const toggleType = (type: PropertyType) => {
    onChange({
      ...filters,
      types: selectedType === type ? undefined : [type],
    });
  };

  const setBeds = (n: number | undefined) => {
    onChange({ ...filters, minBeds: n });
  };

  const apply = () => {
    onChange({
      ...filters,
      minPrice: minPrice ? Number(minPrice) : undefined,
      maxPrice: maxPrice ? Number(maxPrice) : undefined,
    });
    onClose();
  };

  const reset = () => {
    setMinPrice("");
    setMaxPrice("");
    onChange({});
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={styles.sheet}>
        <View style={styles.grabber} />
        <View style={styles.header}>
          <Text style={styles.title}>{t("filters")}</Text>
          <Pressable onPress={reset} hitSlop={8}>
            <Text style={styles.reset}>{t("reset")}</Text>
          </Pressable>
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Radius */}
          <Text style={styles.sectionLabel}>
            {poiActive ? t("radius_enabled") : t("radius_pick_place")}
          </Text>
          <View style={styles.chipRow}>
            {RADII.map((r) => {
              const active = radiusM === r;
              return (
                <Pressable
                  key={r}
                  disabled={!poiActive}
                  onPress={() => onRadiusChange(r)}
                  style={[
                    styles.chip,
                    active && poiActive && styles.chipActiveBlue,
                    !poiActive && styles.chipDisabled,
                  ]}
                >
                  <Text
                    style={[
                      styles.chipText,
                      active && poiActive && styles.chipTextActive,
                      !poiActive && styles.chipTextDisabled,
                    ]}
                  >
                    {r / 1000} {t("km")}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Property type */}
          <Text style={styles.sectionLabel}>{t("field_type")}</Text>
          <View style={styles.chipRow}>
            {PROPERTY_TYPES.map((type) => {
              const active = selectedType === type;
              return (
                <Pressable
                  key={type}
                  onPress={() => toggleType(type)}
                  style={[styles.chip, active && styles.chipActive]}
                >
                  <Text
                    style={[styles.chipText, active && styles.chipTextActive]}
                  >
                    {t(propertyTypeKey(type))}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Price */}
          <Text style={styles.sectionLabel}>
            {t("price_min")} – {t("price_max")} ({t("currency")})
          </Text>
          <View style={styles.priceRow}>
            <TextInput
              value={minPrice}
              onChangeText={setMinPrice}
              placeholder={t("price_min")}
              placeholderTextColor={colors.slate400}
              keyboardType="numeric"
              style={styles.priceInput}
            />
            <Text style={styles.dash}>–</Text>
            <TextInput
              value={maxPrice}
              onChangeText={setMaxPrice}
              placeholder={t("price_max")}
              placeholderTextColor={colors.slate400}
              keyboardType="numeric"
              style={styles.priceInput}
            />
          </View>

          {/* Bedrooms */}
          <Text style={styles.sectionLabel}>{t("bedrooms")}</Text>
          <View style={styles.chipRow}>
            {[undefined, 1, 2, 3, 4].map((n, i) => {
              const active = (filters.minBeds ?? undefined) === n;
              return (
                <Pressable
                  key={i}
                  onPress={() => setBeds(n)}
                  style={[styles.chip, active && styles.chipActive]}
                >
                  <Text
                    style={[styles.chipText, active && styles.chipTextActive]}
                  >
                    {n === undefined ? t("clear") : `${n}+`}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>

        <Pressable style={styles.applyBtn} onPress={apply}>
          <Text style={styles.applyText}>{t("apply")}</Text>
        </Pressable>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.35)" },
  sheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 34,
    maxHeight: "82%",
  },
  grabber: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.slate300,
    marginBottom: 12,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  title: { fontSize: 18, fontWeight: "700", color: colors.slate800 },
  reset: { fontSize: 13, fontWeight: "600", color: colors.brand },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.slate500,
    marginTop: 16,
    marginBottom: 8,
  },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: rad.full,
    borderWidth: 1,
    borderColor: colors.slate200,
    backgroundColor: colors.white,
  },
  chipActive: { backgroundColor: colors.brand, borderColor: colors.brand },
  chipActiveBlue: { backgroundColor: colors.blue, borderColor: colors.blue },
  chipDisabled: { backgroundColor: colors.slate50, borderColor: colors.slate200 },
  chipText: { fontSize: 13, color: colors.slate600, fontWeight: "500" },
  chipTextActive: { color: colors.white },
  chipTextDisabled: { color: colors.slate300 },
  priceRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  priceInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.slate200,
    borderRadius: rad.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: colors.slate800,
  },
  dash: { color: colors.slate400 },
  applyBtn: {
    marginTop: 20,
    backgroundColor: colors.brand,
    borderRadius: rad.md,
    paddingVertical: 14,
    alignItems: "center",
  },
  applyText: { color: colors.white, fontWeight: "700", fontSize: 15 },
});
