
// -------------------------------------

import React, { useEffect, useState, useRef } from "react";
import { View, Text, ActivityIndicator, StyleSheet, Animated } from "react-native";
import MapLibreGL from "@maplibre/maplibre-react-native";
import axios from "axios";

MapLibreGL.setAccessToken(null);

import { API_URL } from '../config';
const ICON_SIZE = 30;



function getMovementBearing(lat1, lon1, lat2, lon2) {
  const toRad = d => (d * Math.PI) / 180;

  const dLon = toRad(lon2 - lon1);
  const y = Math.sin(dLon) * Math.cos(toRad(lat2));
  const x =
    Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
    Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(dLon);

  let brng = (Math.atan2(y, x) * 180) / Math.PI;
  return (brng + 360) % 360;
}



export default function BusMap({ route }) {
  const { busId } = route.params;

  // ----------------------------
  // HOOKS (must be at top always)
  // ----------------------------
  const [location, setLocation] = useState(null);
  const [areas, setAreas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [screenPoint, setScreenPoint] = useState(null);
  const [prevLocation, setPrevLocation] = useState(null);
  const [bearing, setBearing] = useState(0);

  const mapRef = useRef(null);

  // ----------------------------
  // FETCH BUS LOCATION
  // ----------------------------
  const fetchLocation = async () => {
    try {
      const res = await axios.get(`${API_URL}/bus-location/${busId}`);
      setLocation(res.data);
    } catch (err) {
      console.log("Error fetching bus location:", err);
    } finally {
      setLoading(false);
    }
  };

  // ----------------------------
  // FETCH AREAS
  // ----------------------------
  const fetchAreas = async () => {
    try {
      const res = await axios.get(`${API_URL}/areas`);
      setAreas(res.data.filter(a => a.latitude && a.longitude));
    } catch (err) {
      console.log("Error fetching areas:", err);
    }
  };

  // ----------------------------
  // INITIAL FETCH
  // ----------------------------
  useEffect(() => {
    fetchAreas();
  }, []);

  useEffect(() => {
    fetchLocation();
    const interval = setInterval(fetchLocation, 5000);
    return () => clearInterval(interval);
  }, []);

  // ----------------------------
  // UPDATE BUS MARKER SCREEN POINT
  // ----------------------------
  const updateBusPoint = async () => {
    if (!mapRef.current || !location) return;

    try {
      const pt = await mapRef.current.getPointInView([
        Number(location.longitude),
        Number(location.latitude),
      ]);

      setScreenPoint({ x: pt[0], y: pt[1] });
    } catch (err) { }
  };

  useEffect(() => {
    updateBusPoint();
    const interval = setInterval(updateBusPoint, 800);
    return () => clearInterval(interval);
  }, [location]);

  const onRegionDidChange = async () => {
    updateBusPoint();
  };


  // ----------------------------
  // Interpolate Smooth Rotation When New Data Comes
  // ----------------------------

useEffect(() => {
  if (!location) return;

  if (!prevLocation) {
    // first location, just store it
    setPrevLocation(location);
    return;
  }

    const moved =
      Math.abs(location.latitude - prevLocation.latitude) +
      Math.abs(location.longitude - prevLocation.longitude);

    // moved more than ~2 meters
    if (moved > 0.00002) {
      const angle = getMovementBearing(
        prevLocation.latitude,
        prevLocation.longitude,
        location.latitude,
        location.longitude
      );
      setBearing(angle);
  }

  setPrevLocation(location);
}, [location]);


  // ----------------------------
  // LOADING UI
  // ----------------------------
  if (loading || !location) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={{ marginTop: 10 }}>Fetching bus location...</Text>
      </View>
    );
  }

  const { latitude, longitude, last_updated } = location;
  const rotationAnim = new Animated.Value(0);
  let lastRotation = 0;

  // ----------------------------
  // MAIN UI
  // ----------------------------
  return (
    <View style={styles.container}>
      <MapLibreGL.MapView
        ref={mapRef}
        style={styles.map}
        styleURL="https://api.maptiler.com/maps/streets-v2/style.json?key=thU2kmYJKMBPIRVcRREe"
        onRegionDidChange={onRegionDidChange}
      >
        <MapLibreGL.Camera
          zoomLevel={13}
          centerCoordinate={[Number(longitude), Number(latitude)]}
        />

        {/* OPTIONAL RASTER LAYER */}
        <MapLibreGL.RasterSource
          id="streets"
          tileSize={256}
          tileUrlTemplates={[
            "https://api.maptiler.com/maps/streets/256/{z}/{x}/{y}.png?key=thU2kmYJKMBPIRVcRREe",
          ]}
        >
          <MapLibreGL.RasterLayer id="streetsLayer" sourceID="streets" />
        </MapLibreGL.RasterSource>

        {/* AREA LABELS */}
        <MapLibreGL.ShapeSource
          id="areas"
          shape={{
            type: "FeatureCollection",
            features: areas.map((a, i) => ({
              type: "Feature",
              id: i,
              properties: { name: a.name },
              geometry: {
                type: "Point",
                coordinates: [Number(a.longitude), Number(a.latitude)],
              },
            })),
          }}
        >
          <MapLibreGL.SymbolLayer
            id="areaLabels"
            style={{
              textField: ["get", "name"],
              textSize: 22,
              textColor: "#000",
              textHaloColor: "#fff",
              textHaloWidth: 1,
              textAllowOverlap: true,
            }}
          />
        </MapLibreGL.ShapeSource>


        <MapLibreGL.Images
          images={{
            bus: require("../../assets/bus-uber.png")
          }}
        />
        {/* BUS IMAGEs */}

        <MapLibreGL.ShapeSource
          id="busSource"
          shape={{
            type: "Feature",
            geometry: {
              type: "Point",
              coordinates: [Number(longitude), Number(latitude)],
            },
            properties: {
              // bearing: location.rotation || 0,  // for rotation based on direction
              bearing: bearing,
            },
          }}
        >
          <MapLibreGL.SymbolLayer
            id="busIconLayer"
            style={{
              iconImage: "bus",
              iconSize: 0.07,
              iconRotate: ["get", "bearing"],
              iconAllowOverlap: true,
              iconAnchor: "center",
            }}
          />
        </MapLibreGL.ShapeSource>
      </MapLibreGL.MapView>
      lat , lng
      {/* INFO BOX */}
      <View style={styles.infoBox}>
        <Text style={styles.infoText}>Bus #{busId}</Text>
        <Text style={styles.infoText}>
          Last Updated: {new Date(last_updated).toLocaleTimeString()}
        </Text>
      </View>
    </View>
  );
}

// ----------------------------
// STYLES
// ----------------------------
const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  infoBox: {
    position: "absolute",
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: "rgba(0,0,0,0.5)",
    padding: 10,
    borderRadius: 10,
  },
  infoText: {
    color: "#fff",
    textAlign: "center",
    fontWeight: "bold",
  },
});

// ---------------------------------------------------
