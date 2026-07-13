import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { GeoPlace } from "@karia/shared";
import { useI18n } from "@/providers/LanguageProvider";
import { searchPlaces } from "@/lib/api";
import { colors, radius } from "@/theme";

interface Props {
  onSelect: (place: GeoPlace) => void;
}

function minQueryLen(q: string): number {
  return /[\u0600-\u06FF]/.test(q) ? 2 : 3;
}

export default function PlaceSearch({ onSelect }: Props) {
  const { t, locale, dir } = useI18n();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<GeoPlace[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const reqId = useRef(0);

  useEffect(() => {
    const trimmed = q.trim();
    if (trimmed.length < minQueryLen(trimmed)) {
      setResults([]);
      setOpen(false);
      return;
    }
    setLoading(true);
    const id = ++reqId.current;
    const timer = setTimeout(async () => {
      const places = await searchPlaces(trimmed, locale);
      if (id !== reqId.current) return; // stale response
      setResults(places);
      setOpen(true);
      setLoading(false);
    }, 350);
    return () => clearTimeout(timer);
  }, [q, locale]);

  const pick = (p: GeoPlace) => {
    setQ(p.name.split(",")[0]);
    setOpen(false);
    Keyboard.dismiss();
    onSelect(p);
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.inputRow}>
        <PinIcon />
        <TextInput
          value={q}
          onChangeText={setQ}
          placeholder={t("search_placeholder")}
          placeholderTextColor={colors.slate400}
          style={[styles.input, { textAlign: dir === "rtl" ? "right" : "left" }]}
          onFocus={() => results.length && setOpen(true)}
          returnKeyType="search"
        />
        {loading && <ActivityIndicator size="small" color={colors.brand} />}
      </View>

      {open && results.length > 0 && (
        <View style={styles.dropdown}>
          <FlatList
            data={results}
            keyExtractor={(_, i) => String(i)}
            keyboardShouldPersistTaps="handled"
            style={{ maxHeight: 260 }}
            renderItem={({ item }) => (
              <Pressable style={styles.result} onPress={() => pick(item)}>
                <Text style={styles.resultPin}>📍</Text>
                <Text
                  style={[
                    styles.resultText,
                    { textAlign: dir === "rtl" ? "right" : "left" },
                  ]}
                >
                  {item.name}
                </Text>
              </Pressable>
            )}
          />
        </View>
      )}
    </View>
  );
}

function PinIcon() {
  return (
    <View style={styles.pinIcon}>
      <View style={styles.pinIconDot} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: "relative", width: "100%" },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.slate200,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  input: { flex: 1, fontSize: 15, color: colors.slate800, padding: 0 },
  pinIcon: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: colors.brand,
    alignItems: "center",
    justifyContent: "center",
  },
  pinIconDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: colors.brand,
  },
  dropdown: {
    position: "absolute",
    top: "100%",
    left: 0,
    right: 0,
    marginTop: 4,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.slate200,
    shadowColor: colors.black,
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
    zIndex: 30,
    overflow: "hidden",
  },
  result: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    alignItems: "flex-start",
  },
  resultPin: { fontSize: 14 },
  resultText: { flex: 1, fontSize: 14, color: colors.slate700, lineHeight: 19 },
});
