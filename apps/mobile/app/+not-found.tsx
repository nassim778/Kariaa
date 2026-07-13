import { Link, Stack } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { colors, radius } from "@/theme";

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: "Not found", headerShown: true }} />
      <View style={styles.wrap}>
        <Text style={styles.title}>Page not found</Text>
        <Link href="/" style={styles.link}>
          Back to map
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    padding: 24,
    backgroundColor: colors.slate50,
  },
  title: { fontSize: 18, fontWeight: "700", color: colors.slate800 },
  link: {
    color: colors.brand,
    fontWeight: "600",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.md,
    backgroundColor: colors.white,
  },
});
