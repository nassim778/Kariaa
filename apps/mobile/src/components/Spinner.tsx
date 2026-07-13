import { ActivityIndicator, View, ViewStyle } from "react-native";
import { colors } from "@/theme";

export default function Spinner({
  size = "large",
  color = colors.brand,
  style,
}: {
  size?: "small" | "large";
  color?: string;
  style?: ViewStyle;
}) {
  return (
    <View style={[{ alignItems: "center", justifyContent: "center" }, style]}>
      <ActivityIndicator size={size} color={color} />
    </View>
  );
}
