import { Pressable, StyleSheet, Text, View } from "react-native";
import { LOCALES } from "@karia/shared";
import { useI18n } from "@/providers/LanguageProvider";
import { colors, radius } from "@/theme";

interface Props {
  /** Single chip that cycles locales — better for tight map headers. */
  compact?: boolean;
}

export default function LanguageSwitcher({ compact = false }: Props) {
  const { locale, setLocale } = useI18n();

  if (compact) {
    const current = LOCALES.find((l) => l.id === locale) ?? LOCALES[0];
    const next = () => {
      const idx = LOCALES.findIndex((l) => l.id === locale);
      const n = LOCALES[(idx + 1) % LOCALES.length];
      setLocale(n.id);
    };
    return (
      <Pressable onPress={next} style={styles.compactChip} hitSlop={6}>
        <Text style={styles.compactLabel}>{current.label}</Text>
      </Pressable>
    );
  }

  return (
    <View style={styles.row}>
      {LOCALES.map((l) => {
        const active = l.id === locale;
        return (
          <Pressable
            key={l.id}
            onPress={() => setLocale(l.id)}
            style={[styles.chip, active && styles.chipActive]}
            hitSlop={4}
          >
            <Text style={[styles.label, active && styles.labelActive]}>
              {l.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    backgroundColor: colors.slate100,
    borderRadius: radius.full,
    padding: 2,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.full,
  },
  chipActive: {
    backgroundColor: colors.white,
    shadowColor: colors.black,
    shadowOpacity: 0.08,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  label: { fontSize: 12, fontWeight: "600", color: colors.slate500 },
  labelActive: { color: colors.brand },
  compactChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.full,
    backgroundColor: colors.slate100,
  },
  compactLabel: { fontSize: 11, fontWeight: "700", color: colors.brand },
});
