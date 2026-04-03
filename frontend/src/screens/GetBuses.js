




import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  // SafeAreaView,
  StatusBar,
  Animated,
} from "react-native";
import axios from "axios";
import { Bus, MapPin, ChevronLeft } from "../components/AppIcons";
import { useNavigation } from "@react-navigation/native";
import { SafeAreaView } from 'react-native-safe-area-context';

import { API_URL } from '../config';

/* ---------------- LIVE INDICATOR ---------------- */
const LiveIndicator = () => {
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(scale, {
          toValue: 1.4,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  return (
    <View style={styles.liveContainer}>
      <Animated.View style={[styles.pulse, { transform: [{ scale }] }]} />
      <Text style={styles.liveText}>LIVE</Text>
    </View>
  );
};

/* ---------------- MAIN SCREEN ---------------- */
export default function GetBuses({ route }) {
  const navigation = useNavigation();
  const { fromStopId, toStopId } = route.params;

  
  const [buses, setBuses] = useState([]);
  const [loading, setLoading] = useState(true);
  const prevData = useRef(null);

  const fetchBuses = async () => {
    try {
      // const res = await axios.get(`${API_URL}/next-buses`, {
      //   params: { fromStopId, toStopId, limit: 5 },
      // });
      const res = await axios.get(`${API_URL}/next-buses?fromStopId=${fromStopId}&toStopId=${toStopId}&limit=5`);

      const serialized = JSON.stringify(res.data.trips);
      if (prevData.current !== serialized) {
        prevData.current = serialized;
        setBuses(res.data.trips);
      }
    } catch (err) {
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBuses();
    const interval = setInterval(fetchBuses, 15000);
    return () => clearInterval(interval);
  }, []);

  function formatETA(minutes) {
  if (!minutes || minutes <= 0) return "ETA unavailable";

  if (minutes < 60) {
    return `Arriving in ${minutes} min`;
  }
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;

  if (mins === 0) {
    return `Arriving in ${hrs} hr`;
  }
  return `Arriving in ${hrs} hr ${mins} min`;
}


  /* ---------------- CARD RENDER ---------------- */
  const renderBusItem = ({ item }) => {
    const statusMap = {
      arriving: "Arriving now",
      approaching: "Approaching",
      on_the_way: "On the way",
      not_tracking: "Not tracking",
    };

    return (
      <TouchableOpacity style={styles.cardWrapper} activeOpacity={0.9}>
        <View style={styles.card}>
          {/* Header */}
          <View style={styles.cardHeader}>
            <View style={styles.busIconContainer}>
              <Bus color={item.busColor || "#007AFF"} size={20} />
              <Text style={styles.busName}>{item.bus_name}</Text>
            </View>

            {item.liveState === "live" && <LiveIndicator />}
            {item.liveState === "stale" && (
              <Text style={styles.staleText}>UPDATED</Text>
            )}
            {item.liveState === "offline" && (
              <Text style={styles.offlineText}>OFFLINE</Text>
            )}
          </View>

          {/* ETA */}
          <Text style={styles.etaText}>
            {formatETA(item.etaMinutes)}
          </Text>

          {/* Meta */}
          <Text style={styles.metaText}>
            {item.stopsRemaining} stops away • {statusMap[item.status]}
          </Text>

          {/* Footer */}
          <View style={styles.cardFooter}>
            <TouchableOpacity
              onPress={() =>
                navigation.navigate("BusMap", { busId: item.busId })
              }
            >
              <View style={styles.mapAction}>
                <Text style={styles.mapActionText}>View on Map</Text>
                <MapPin color="#007AFF" size={16} />
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  /* ---------------- UI ---------------- */
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.navHeader}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <ChevronLeft color="#000" size={28} />
          </TouchableOpacity>
          <View>
            <Text style={styles.headerTitle}>Available Buses</Text>
            <Text style={styles.headerSub}>Real-time tracking</Text>
          </View>
          <View style={{ width: 28 }} />
        </View>

        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.loadingText}>Fetching live buses…</Text>
          </View>
        ) : (
          <FlatList
            data={buses}
            renderItem={renderBusItem}
            keyExtractor={(item) => item.tripId.toString()}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <Text style={styles.noResult}>No buses found.</Text>
            }
          />
        )}
      </View>
    </SafeAreaView>
  );
}

/* ---------------- STYLES ---------------- */
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#FFF" },
  container: { flex: 1, backgroundColor: "#F8F9FE" },

  navHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    backgroundColor: "#FFF",
  },
  headerTitle: { fontSize: 22, fontWeight: "800", color: "#1C1C1E" },
  headerSub: { fontSize: 13, color: "#8E8E93" },

  listContent: { padding: 16 },

  cardWrapper: {
    marginBottom: 14,
    borderRadius: 18,
    backgroundColor: "#FFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
  },
  card: { padding: 16 },

  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  busIconContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0F7FF",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  busName: {
    marginLeft: 8,
    fontWeight: "700",
    fontSize: 20,
    color: "#007AFF",
  },

  etaText: {
    fontSize: 20,
    fontWeight: "800",
    color: "#1C1C1E",
    marginTop: 10,
  },
  metaText: {
    fontSize: 14,
    color: "#8E8E93",
    marginTop: 4,
  },

  cardFooter: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F2F2F7",
    alignItems: "flex-end",
  },

  mapAction: { flexDirection: "row", alignItems: "center" },
  mapActionText: {
    color: "#007AFF",
    fontWeight: "600",
    fontSize: 13,
    marginRight: 4,
  },

  liveContainer: { flexDirection: "row", alignItems: "center" },
  pulse: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#34C759",
    marginRight: 6,
  },
  liveText: { fontSize: 12, fontWeight: "800", color: "#34C759" },
  staleText: { fontSize: 12, fontWeight: "800", color: "#FF9F0A" },
  offlineText: { fontSize: 12, fontWeight: "800", color: "#FF3B30" },

  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: { marginTop: 12, color: "#8E8E93" },
  noResult: {
    textAlign: "center",
    color: "#8E8E93",
    marginTop: 40,
    fontSize: 14,
  },
});
