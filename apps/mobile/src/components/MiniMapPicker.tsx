import { StyleSheet, View } from "react-native";
import {
  Camera,
  MapView,
  PointAnnotation,
} from "@maplibre/maplibre-react-native";
import { buildRasterStyle } from "@karia/shared";
import { colors } from "@/theme";

interface Props {
  lat: number;
  lng: number;
  onChange: (lng: number, lat: number) => void;
}

export default function MiniMapPicker({ lat, lng, onChange }: Props) {
  const handlePress = (feature: GeoJSON.Feature) => {
    const geom = feature.geometry;
    if (geom && geom.type === "Point") {
      const [lng2, lat2] = geom.coordinates as [number, number];
      onChange(lng2, lat2);
    }
  };

  return (
    <View style={styles.wrap}>
      <MapView
        style={StyleSheet.absoluteFill}
        mapStyle={JSON.stringify(buildRasterStyle("voyager"))}
        onPress={handlePress}
        logoEnabled={false}
        attributionEnabled={false}
        compassEnabled={false}
      >
        <Camera
          zoomLevel={15}
          centerCoordinate={[lng, lat]}
          animationDuration={0}
        />
        <PointAnnotation
          id="listing-pin"
          coordinate={[lng, lat]}
          draggable
          onDragEnd={(e) => {
            const coords = (e.geometry as GeoJSON.Point).coordinates as [
              number,
              number,
            ];
            onChange(coords[0], coords[1]);
          }}
        >
          <View style={styles.pin}>
            <View style={styles.pinInner} />
          </View>
        </PointAnnotation>
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    height: 180,
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: colors.slate100,
  },
  pin: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(15,118,110,0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  pinInner: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.brand,
    borderWidth: 2,
    borderColor: colors.white,
  },
});
