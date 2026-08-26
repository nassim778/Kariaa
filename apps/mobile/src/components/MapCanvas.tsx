import { useEffect, useRef, type ElementRef } from "react";
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import * as Location from "expo-location";
import {
  Camera,
  MapView,
  MarkerView,
  ShapeSource,
  FillLayer,
  LineLayer,
  UserLocation,
} from "@maplibre/maplibre-react-native";
import {
  BBox,
  BasemapId,
  GeoPlace,
  Listing,
  buildRasterStyle,
  circlePolygon,
  sizeLabel,
  DEFAULT_CENTER,
  DEFAULT_ZOOM,
} from "@karia/shared";
import { colors, radius as rad } from "@/theme";

interface Props {
  listings: Listing[];
  activeId: string | null;
  poi: GeoPlace | null;
  radiusM: number;
  basemap: BasemapId;
  pickMode: boolean;
  /** Peek height of the bottom sheet so locate stays above it. */
  bottomInset?: number;
  onListingPress: (id: string) => void;
  onBBoxChange: (bbox: BBox) => void;
  onMapPress: (lng: number, lat: number) => void;
}

export default function MapCanvas({
  listings,
  activeId,
  poi,
  radiusM,
  basemap,
  pickMode,
  bottomInset = 130,
  onListingPress,
  onBBoxChange,
  onMapPress,
}: Props) {
  const mapRef = useRef<ElementRef<typeof MapView> | null>(null);
  const cameraRef = useRef<ElementRef<typeof Camera> | null>(null);

  useEffect(() => {
    if (!poi || poi.fit === false) return;
    const latR = (radiusM / 6371000) * (180 / Math.PI);
    const lngR = latR / Math.cos((poi.lat * Math.PI) / 180);
    cameraRef.current?.fitBounds(
      [poi.lng + lngR, poi.lat + latR],
      [poi.lng - lngR, poi.lat - latR],
      60,
      700
    );
  }, [poi, radiusM]);

  const emitBBox = async () => {
    const map = mapRef.current;
    if (!map) return;
    try {
      const bounds = await map.getVisibleBounds();
      const [ne, sw] = bounds;
      onBBoxChange({
        minLng: sw[0],
        minLat: sw[1],
        maxLng: ne[0],
        maxLat: ne[1],
      });
    } catch {
      // ignore transient errors while the map settles
    }
  };

  const handlePress = (feature: GeoJSON.Feature) => {
    if (!pickMode) return;
    const geom = feature.geometry;
    if (geom && geom.type === "Point") {
      const [lng, lat] = geom.coordinates as [number, number];
      onMapPress(lng, lat);
    }
  };

  const locate = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") return;
    const pos = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });
    cameraRef.current?.setCamera({
      centerCoordinate: [pos.coords.longitude, pos.coords.latitude],
      zoomLevel: 14,
      animationDuration: 700,
    });
  };

  const circle = poi ? circlePolygon(poi.lng, poi.lat, radiusM) : null;

  return (
    <View style={StyleSheet.absoluteFill}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        mapStyle={JSON.stringify(buildRasterStyle(basemap))}
        onPress={handlePress}
        onRegionDidChange={emitBBox}
        onDidFinishLoadingMap={emitBBox}
        logoEnabled={false}
        attributionEnabled
        compassEnabled={false}
      >
        <Camera
          ref={cameraRef}
          defaultSettings={{
            centerCoordinate: DEFAULT_CENTER,
            zoomLevel: DEFAULT_ZOOM,
          }}
        />

        <UserLocation visible renderMode="normal" />

        {circle && (
          <ShapeSource id="radius" shape={circle as GeoJSON.FeatureCollection}>
            <FillLayer
              id="radius-fill"
              style={{ fillColor: colors.blue, fillOpacity: 0.08 }}
            />
            <LineLayer
              id="radius-line"
              style={{
                lineColor: colors.blue,
                lineWidth: 2,
                lineDasharray: [2, 2],
              }}
            />
          </ShapeSource>
        )}

        {poi && (
          <MarkerView
            coordinate={[poi.lng, poi.lat]}
            anchor={{ x: 0.5, y: 0.5 }}
          >
            {/* collapsable={false} + pinWrap keeps Android from stretching markers to screen width */}
            <View style={styles.pinWrap} collapsable={false}>
              <View style={styles.poiMarker}>
                <View style={styles.poiDot} />
              </View>
            </View>
          </MarkerView>
        )}

        {listings.map((l) => {
          const active = activeId === l.id;
          return (
            <MarkerView
              key={l.id}
              coordinate={[l.lng, l.lat]}
              anchor={{ x: 0.5, y: 1 }}
              allowOverlap
            >
              <View style={styles.pinWrap} collapsable={false}>
                <Pressable
                  onPress={() => onListingPress(l.id)}
                  hitSlop={6}
                  style={[styles.pin, active && styles.pinActive]}
                >
                  <Text
                    numberOfLines={1}
                    style={[styles.pinText, active && styles.pinTextActive]}
                  >
                    {sizeLabel(l)}
                  </Text>
                </Pressable>
              </View>
            </MarkerView>
          );
        })}
      </MapView>

      <Pressable
        style={[styles.locateBtn, { bottom: bottomInset }]}
        onPress={locate}
        hitSlop={8}
      >
        <LocateIcon />
      </Pressable>
    </View>
  );
}

function LocateIcon() {
  return (
    <View style={styles.locateIconOuter}>
      <View style={styles.locateIconInner} />
    </View>
  );
}

const styles = StyleSheet.create({
  /**
   * Android MarkerView parents often expand children to the map width.
   * Wrap every marker in a shrink-wrapped container so pills stay compact.
   */
  pinWrap: {
    alignSelf: "flex-start",
    alignItems: "center",
    justifyContent: "center",
    ...(Platform.OS === "android" ? { maxWidth: 64 } : null),
  },
  pin: {
    alignSelf: "flex-start",
    minWidth: 36,
    maxWidth: 64,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: rad.full,
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.brand,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.black,
    shadowOpacity: 0.2,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 3,
  },
  pinActive: { backgroundColor: colors.brand },
  pinText: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.brand,
    includeFontPadding: false,
  },
  pinTextActive: { color: colors.white },
  poiMarker: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "rgba(37,99,235,0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  poiDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.blue,
    borderWidth: 2,
    borderColor: colors.white,
  },
  locateBtn: {
    position: "absolute",
    right: 14,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.black,
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  locateIconOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.brand,
    alignItems: "center",
    justifyContent: "center",
  },
  locateIconInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.brand,
  },
});
