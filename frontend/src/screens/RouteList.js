
import React, {
  useState, useEffect, useMemo, useCallback, memo
} from "react";
import {
  View, Text, StyleSheet, TextInput,
  TouchableOpacity, StatusBar,
} from "react-native";
// import Ionicons from "react-native-vector-icons/Ionicons";
import { Bus, CheckCircle, ChevronRight, Search, X } from "../components/AppIcons";
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { openDB } from '../db/localDB';
// import Icon from 'react-native-vector-icons/MaterialIcons';
import { FlashList } from '@shopify/flash-list';
import { useResponsive } from "../utils/useResponsive";
import { getBusesByRoute, getRoutesFromSQLite } from "../db/queries";
import { setCachedBuses } from '../cache/busCache';
import { getCachedRoutes, setCachedRoutes } from "../cache/routeCache";


// ─────────────────────────────────────────────────────────────────
// ✅ FIX #1 — chunkData is a pure utility, lives at module level.
// Zero cost — defined once when the file is first imported.
// ─────────────────────────────────────────────────────────────────
function chunkData(data = [], size = 2) {
  if (!Array.isArray(data)) return [];
  const chunked = [];
  for (let i = 0; i < data.length; i += size) {
    chunked.push(data.slice(i, i + size));
  }
  return chunked;
}


// ─────────────────────────────────────────────────────────────────
// ✅ FIX #2 — STATIC STYLES AT MODULE LEVEL
// Colors, flex, border values — never change, never recreated.
// ─────────────────────────────────────────────────────────────────
const S = StyleSheet.create({
  safearea: { flex: 1, backgroundColor: "#f4f8f6" },
  container: { flex: 1 },
  title: { fontWeight: "700" },
  subtitle: { color: "#666" },
  searchBox: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "#FFFFFF", borderWidth: 1,
    borderColor: "#E2E8F0", elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4
  },
  searchInput: { flex: 1 },
  section: { fontWeight: "600", color: "#1A1A1A" },
  sectionTitle: { fontWeight: "700", color: "#1a1a1a" },

  // Route list item — wrapper handles shadow only
  routeItemWrapper: {
    width: "92%", alignSelf: "center",
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08, shadowRadius: 3,
    elevation: 2
  },
  routeContent: {
    flexDirection: "row", alignItems: "stretch",
    backgroundColor: "transparent",
    borderWidth: 1, borderColor: "#F2F2F2",
    overflow: 'hidden'
  },
  routeContentActive: {
    backgroundColor: "#e6f4f1",
    borderColor: "#00695c"
  },
  activeBar: { backgroundColor: "#2e7d32" },
  textWrapper: {
    flex: 1, flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  routeTitle: { fontWeight: "600", color: "#333333" },
  routeVia: { color: "#666" },

  // Popular card
  popularCard: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "#fff", width: "100%",
    borderWidth: 1, borderColor: "#eee",
    elevation: 2, shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08, shadowRadius: 3
  },
  popularCardActive: {
    borderColor: "#00695c",
    backgroundColor: "#e6f4f1", borderWidth: 1.5
  },
  iconContainer: {
    backgroundColor: "#E0F2F1",
    justifyContent: "center", alignItems: "center"
  },
  textContainer: { flex: 1 },
  popularRoute: { fontWeight: "600", color: "#333" },
  popularVia: { color: "#777" },

  // CTA
  cta: { backgroundColor: "#2e7d32", alignItems: "center" },
  ctaText: { color: "#fff", fontWeight: "600" },
  ctaDisabled: { opacity: 0.5 },

  popular: {},
  emptyText: { textAlign: 'center', color: '#999' },
});


// ─────────────────────────────────────────────────────────────────
// ✅ FIX #3 — DYNAMIC STYLES HOOK
// Only values that need scale/moderateScale live here.
// ─────────────────────────────────────────────────────────────────
function useDynamicStyles({ scale, verticalScale, moderateScale, width, isTablet, clamp }) {
  return useMemo(() => ({
    container: { paddingHorizontal: scale(14) },
    title: { fontSize: moderateScale(24), marginLeft: scale(14) },
    subtitle: {
      fontSize: moderateScale(14), marginTop: verticalScale(4),
      marginLeft: scale(14)
    },
    searchBox: {
      borderRadius: moderateScale(10),
      paddingHorizontal: scale(14),
      paddingVertical: verticalScale(6),
      marginHorizontal: scale(10),
      marginTop: verticalScale(14)
    },
    searchInput: { marginLeft: scale(8), fontSize: moderateScale(14) },
    section: {
      fontSize: moderateScale(20), marginBottom: verticalScale(12),
      marginLeft: scale(14)
    },
    sectionTitle: {
      fontSize: moderateScale(18), marginLeft: scale(14),
      marginBottom: verticalScale(10)
    },

    // Route list
    routeItemWrapper: {
      marginBottom: verticalScale(12),
      borderRadius: moderateScale(14)
    },
    routeContent: { borderRadius: moderateScale(14) },
    activeBar: { width: scale(6) },
    textWrapper: {
      paddingVertical: verticalScale(10),
      paddingHorizontal: scale(12)
    },
    routeTitle: {
      fontSize: moderateScale(15),
      marginBottom: verticalScale(3)
    },
    routeVia: { fontSize: moderateScale(13) },

    // Popular cards
    popular: { marginVertical: verticalScale(14) },
    column: {
      flexDirection: "column",
      width: clamp(width * 0.72, 240, isTablet ? 420 : 320),
      marginRight: scale(12),
    },
    popularCard: {
      borderRadius: moderateScale(12),
      paddingVertical: verticalScale(10),
      paddingHorizontal: scale(12),
      marginBottom: verticalScale(10)
    },
    iconContainer: {
      width: scale(38), height: scale(38),
      borderRadius: moderateScale(8),
      marginRight: scale(10)
    },
    popularRoute: { fontSize: moderateScale(15) },
    popularVia: {
      fontSize: moderateScale(12),
      marginTop: verticalScale(2)
    },

    // CTA
    cta: {
      paddingVertical: verticalScale(14),
      borderRadius: moderateScale(10),
      marginTop: verticalScale(2)
    },
    ctaText: { fontSize: moderateScale(16) },

    listContent: { paddingHorizontal: scale(14) },
    listPadding: { paddingBottom: verticalScale(120) },
    emptyText: { marginTop: 20 },

    // Raw values for icon sizes
    iconSize: moderateScale(20),
    iconClose: moderateScale(20),
  }), [scale, verticalScale, moderateScale, width, isTablet, clamp]);
}


// ─────────────────────────────────────────────────────────────────
// ✅ FIX #4 — PopularCard extracted as memo component
// memo() means it only re-renders if its own props change.
// Previously it was an inline function — no memoization at all.
// ─────────────────────────────────────────────────────────────────
const PopularCard = memo(({ item, isActive, onPress, D }) => (
  <TouchableOpacity
    accessibilityRole="button"
    style={[S.popularCard, D.popularCard, isActive && S.popularCardActive]}
    onPress={onPress}
    activeOpacity={0.7}
  >
    <View style={[S.iconContainer, D.iconContainer]}>
      <Bus size={D.iconSize} color="#00695c" />
    </View>
    <View style={S.textContainer}>
      <Text style={[S.popularRoute, D.popularRoute]} numberOfLines={1}>
        {item.from_place} → {item.to_place}
      </Text>
      <Text style={[S.popularVia, D.popularVia]} numberOfLines={1}>
        via {item.via_places}
      </Text>
    </View>
  </TouchableOpacity>
));


// ─────────────────────────────────────────────────────────────────
// ✅ FIX #5 — RouteListItem extracted as memo component
// ─────────────────────────────────────────────────────────────────
const RouteListItem = memo(({ item, isActive, onPress, D }) => (
  <TouchableOpacity
    style={[S.routeItemWrapper, D.routeItemWrapper]}
    onPress={onPress}
    activeOpacity={0.7}
  >
    <View style={[S.routeContent, D.routeContent, isActive && S.routeContentActive]}>
      {isActive && <View style={[S.activeBar, D.activeBar]} />}
      <View style={[S.textWrapper, D.textWrapper]}>
        <View>
          <Text style={[S.routeTitle, D.routeTitle]}>
            {item.from_place} → {item.to_place}
          </Text>
          <Text style={[S.routeVia, D.routeVia]}>
            via {item.via_places}
          </Text>
        </View>
        {isActive
          ? <CheckCircle size={22} color="#2e7d32" />
          : <ChevronRight size={20} color="#999" />
        }
      </View>
    </View>
  </TouchableOpacity>
));


// ─────────────────────────────────────────────────────────────────
// MAIN SCREEN
// ─────────────────────────────────────────────────────────────────
export default function BusInfo() {
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [query, setQuery] = useState("");
  const [allRoutes, setAllRoutes] = useState([]);

  const responsive = useResponsive();
  const {
    scale, verticalScale, moderateScale, width, isTablet, clamp
  } = responsive;

  const D = useDynamicStyles(responsive);
  const navigation = useNavigation();

  // ─── Load routes after transition ───────────────────────────────
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      const loadRoutes = async () => {
        try {
          let routes = getCachedRoutes();          // fast: in-memory
          if (!routes || routes.length === 0) {   // fallback: read SQLite directly
            routes = await getRoutesFromSQLite();
            setCachedRoutes(routes);
          }
          if (!cancelled) setAllRoutes(routes ?? []);
        } catch (e) {
          console.error("SQLite routes error", e);
        }
      };
      loadRoutes();
      return () => { cancelled = true; };
    }, [])
  );

  // ─── Search filter ───────────────────────────────────────────────
  // ✅ useMemo instead of useEffect + setState.
  // Removes one extra render cycle on every keystroke.
  const filteredRoutes = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return allRoutes;
    return allRoutes.filter(r =>
      `${r.from_place} ${r.to_place} ${r.via_places}`.toLowerCase().includes(q)
    );
  }, [query, allRoutes]);

  // ✅ FIX #3 — Popular chunks memoized, not recomputed every render
  const popularChunks = useMemo(() => {
    const popular = allRoutes.filter(r => r.is_popular);
    return chunkData(popular, 2);
  }, [allRoutes]);
  // ↑ Only recomputes when allRoutes changes, not on every query keystroke.

  // ─── Handlers ────────────────────────────────────────────────────
  const handleRoutePress = useCallback((item) => {
    setSelectedRoute(prev => (prev?.id === item.id ? null : item));
  }, []);

  const clearQuery = useCallback(() => setQuery(''), []);

  // console.log("Rendering BusInfo - selectedRoute:", selectedRoute?.id, "query:", query);

  const handleContinue = useCallback(async () => {
    if (!selectedRoute) return;
    try {
      const db = await openDB();
      const buses = await getBusesByRoute(db, selectedRoute.id);
      // console.log(buses);

      setCachedBuses(selectedRoute.id, buses);

      navigation.push("BusList", {
        routeId: selectedRoute.id,
        routeFrom: selectedRoute.from_place,
        routeTo: selectedRoute.to_place,
      });
      console.log("Navigating to BusList with routeId:", selectedRoute.id);
    } catch (e) {
      console.error("Error fetching buses:", e);
    }
  }, [selectedRoute, navigation]);

  // ─── FlashList render functions ─────────────────────────────────
  // ✅ useCallback so FlashList doesn't re-render all items on
  //    unrelated state changes (e.g. query typing)
  const renderPopularColumn = useCallback(({ item: column }) => (
    <View style={D.column}>
      {column.map(route => (
        <PopularCard
          key={route.id}
          item={route}
          isActive={selectedRoute?.id === route.id}
          onPress={() => handleRoutePress(route)}
          D={D}
        />
      ))}
    </View>
  ), [selectedRoute, D, handleRoutePress]);

  const renderRouteItem = useCallback(({ item }) => (
    <RouteListItem
      item={item}
      isActive={selectedRoute?.id === item.id}
      onPress={() => handleRoutePress(item)}
      D={D}
    />
  ), [selectedRoute, D, handleRoutePress]);

  const showingSearch = query.trim() !== "";
  const isEnabled = !!selectedRoute;

  return (
    <SafeAreaView style={S.safearea}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8F6F2" />

      <View style={[S.container, D.container]}>
        <Text style={[S.title, D.title]}>Choose a Route</Text>
        <Text style={[S.subtitle, D.subtitle]}>
          Explore bus routes in your district
        </Text>

        {/* ── Search ── */}
        <View style={[S.searchBox, D.searchBox]}>
          <Search size={18} color="#888" />
          <TextInput
            placeholder="Search route by place name"
            value={query}
            onChangeText={setQuery}
            style={[S.searchInput, D.searchInput]}
            autoCorrect={false}
            autoCapitalize="none"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={clearQuery}>
              <X size={D.iconClose} color="#7b7b7bff" />
            </TouchableOpacity>
          )}
        </View>

        {/* ── Popular routes (hidden during search) ── */}
        {!showingSearch && (
          <View style={[S.popular, D.popular]}>
            <Text style={[S.sectionTitle, D.sectionTitle]}>Popular Routes</Text>
            <FlashList
              horizontal
              showsHorizontalScrollIndicator={false}
              data={popularChunks}
              keyExtractor={(_, index) => `pair-${index}`}
              contentContainerStyle={D.listContent}
              estimatedItemSize={300}
              renderItem={renderPopularColumn}
            />
          </View>
        )}

        {/* ── Section label ── */}
        <Text style={[S.section, D.section]}>
          {!showingSearch ? "All Routes" : "Search Results"}
        </Text>

        {/* ── Route list ── */}
        <FlashList
          data={filteredRoutes}
          keyExtractor={item => item.id.toString()}
          style={{ flex: 1 }}
          contentContainerStyle={D.listPadding}
          estimatedItemSize={72}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
          // ✅ extraData tells FlashList to re-render when selection changes
          extraData={selectedRoute?.id}
          renderItem={renderRouteItem}
          ListEmptyComponent={
            <Text style={[S.emptyText, D.emptyText]}>No routes found</Text>
          }
        />

        {/* ── CTA ── */}
        <TouchableOpacity
          disabled={!isEnabled}
          // style={[S.cta, D.cta, !selectedRoute && S.ctaDisabled]}
          style={[
            S.cta,
            D.cta,
            { backgroundColor: isEnabled ? "#2e7d32" : "#afb2af" }
          ]}
          onPress={handleContinue}
        >
          <Text style={[S.ctaText, D.ctaText]}>View Buses on this Route</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}