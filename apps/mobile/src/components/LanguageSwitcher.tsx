import { Pressable, StyleSheet, Text, View } from "react-native";
import { LOCALES } from "@karia/shared";
import { useI18n } from "@/providers/LanguageProvider";
import { colors, radius } from "@/theme";

export default function LanguageSwitcher() {
  const { locale, setLocale } = useI18n();
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
});
