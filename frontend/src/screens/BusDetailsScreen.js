
// ─────────────────────────────────────────────────────────────────
// BusDetailsScreen.js — FIXED VERSION
// ─────────────────────────────────────────────────────────────────
import React, {
  useState, useEffect, useMemo, useCallback, useRef, memo
} from "react";
import {
  View, Text, StyleSheet, Image, ScrollView,
  TouchableOpacity, StatusBar,
} from "react-native";
// import Ionicons from "react-native-vector-icons/Ionicons";
import { ChevronLeft, Bus, Clock, Star, ShieldCheck } from '../components/AppIcons';
import { useNavigation } from "@react-navigation/native";
import Animated, {
  useSharedValue, useAnimatedStyle, withTiming,
} from "react-native-reanimated";

import { openDB } from "../db/localDB";
import { getBusTripsFromSQLite } from "../db/queries";
import Screen from '../components/Screen';
import { getCachedTrips, setCachedTrips } from '../cache/tripCache';
import { useResponsive } from "../utils/useResponsive";
import { useLiveBus } from "../hooks/useLiveBus";

const THEME = {
  primary:   "#121212",
  accent:    "#FF6B35",
  surface:   "#F8F9FA",
  textMuted: "#94A3B8",
};

// ─────────────────────────────────────────────────────────────────
// STATIC STYLES
// ─────────────────────────────────────────────────────────────────
const S = StyleSheet.create({
  container:          { flex: 1, backgroundColor: THEME.surface },
  topSection:         { backgroundColor: THEME.primary, zIndex: 100 },
  headerNav:          { flexDirection: "row", justifyContent: "space-between",
                        alignItems: "center" },
  headerTitle:        { color: "#fff", fontWeight: "700" },
  iconCircle:         { justifyContent: "center", alignItems: "center" },
  routeVisualizer:    { flexDirection: "row", alignItems: "center",
                        justifyContent: "space-between" },
  nodeCity:           { color: "#fff", fontWeight: "800" },
  nodeLabel:          { color: "rgba(255,255,255,0.5)" },
  routeLineContainer: { flex: 1, alignItems: "center" },
  dashedLine:         { width: "100%", height: 1, borderWidth: 1,
                        borderColor: "rgba(255,255,255,0.2)", borderStyle: "dashed" },
  bodySurface:        { flex: 1, backgroundColor: '#FBFBFB' },
  scrollBody:         {},
  infoCard:           { backgroundColor: 'white', shadowColor: '#000',
                        shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
  infoRow:            { flexDirection: "row", justifyContent: "space-between",
                        alignItems: "center" },
  busBrand:           { fontWeight: "800", color: '#000' },
  busClass:           { color: THEME.textMuted },
  busThumb:           { resizeMode: "contain" },
  statsRow:           { flexDirection: "row", borderTopWidth: 1,
                        borderTopColor: "#F1F5F9" },
  statItem:           { flexDirection: "row", alignItems: "center" },
  statValue:          { fontWeight: "600", color: '#000' },
  sectionLabel:       { fontWeight: "700", color: THEME.textMuted, letterSpacing: 1 },
  tripGrid:           { flexDirection: "row", flexWrap: "wrap",
                        justifyContent: 'space-between' },
  tripTile:           { width: "45%", backgroundColor: "#fff",
                        flexDirection: "row", alignItems: "center",
                        justifyContent: "center", borderWidth: 1,
                        borderColor: "#F1F5F9", shadowColor: "#000",
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.08, shadowRadius: 6, elevation: 3 },
  tripTileActive:     { backgroundColor: "#FF7E50" },
  tripLabel:          { fontWeight: "700" },
  textWhite:          { color: "#fff" },
  textDark:           { color: "#000" },
  stationRow:         { flexDirection: "row" },
  stationTime:        { fontWeight: "700", color: '#333' },
  stationCenter:      { alignItems: "center" },
  stationDot:         { backgroundColor: "#CBD5E1" },
  stationDotActive:   { backgroundColor: THEME.accent },
  stationLine:        { width: 2, flex: 1, backgroundColor: "#E2E8F0" },
  stationLineActive:  { width: 2, flex: 1, backgroundColor: THEME.accent },
  stationRight:       { flex: 1 },
  stationName:        { fontWeight: "700", color: '#333' },
  stationDesc:        { color: THEME.textMuted },
  stopSkeletonRow:    { backgroundColor: "#E5E7EB" },
  tripSkeletonRow:    { flexDirection: "row" },
  tripSkeleton:       { backgroundColor: "#E5E7EB" },
  emptyText:          { textAlign: "center", color: THEME.textMuted },
  statusPill:         { alignSelf: "flex-start" },
  statusPillText:     { fontWeight: "700" },
  liveMarkerInner:    { backgroundColor: "#FF6B35", padding: 6, borderRadius: 20,
                        shadowColor: "#FF6B35", shadowOpacity: 0.4,
                        shadowRadius: 8, elevation: 6 },
  microMessage:       { color: "#94A3B8" },
});


// ─────────────────────────────────────────────────────────────────
// DYNAMIC STYLES HOOK
// ─────────────────────────────────────────────────────────────────
function useDynamicStyles({ scale, verticalScale, moderateScale, isSmallPhone, isTablet }) {
  return useMemo(() => ({
    topSection:      { padding: scale(20), paddingBottom: verticalScale(40),
                       borderBottomLeftRadius: moderateScale(30),
                       borderBottomRightRadius: moderateScale(30) },
    headerNav:       { marginBottom: verticalScale(30) },
    headerTitle:     { fontSize: moderateScale(18) },
    iconCircle:      { width: scale(40), height: scale(40),
                       borderRadius: scale(20) },
    nodeCity:        { fontSize: moderateScale(20) },
    nodeLabel:       { marginTop: verticalScale(4), fontSize: moderateScale(12) },
    routeLineContainer: { marginHorizontal: scale(15) },
    dashedLine:      { marginTop: verticalScale(10) },
    bodySurface:     { borderTopLeftRadius: moderateScale(30),
                       borderTopRightRadius: moderateScale(30),
                       paddingTop: verticalScale(10) },
    scrollBody:      { paddingHorizontal: scale(20) },
    infoCard:        { borderRadius: moderateScale(24), padding: scale(20),
                       marginBottom: verticalScale(20) },
    busBrand:        { fontSize: moderateScale(20) },
    busClass:        { marginTop: verticalScale(4), fontSize: moderateScale(14) },
    busThumb:        { width: scale(120), height: verticalScale(80) },
    statsRow:        { marginTop: verticalScale(20), paddingTop: verticalScale(20) },
    statItem:        { marginRight: scale(20) },
    statValue:       { marginLeft: scale(6), fontSize: moderateScale(14) },
    sectionLabel:    { fontSize: moderateScale(14), marginBottom: verticalScale(15) },
    tripGrid:        { gap: scale(10) },
    tripTile:        { paddingVertical: verticalScale(12),
                       borderRadius: moderateScale(16),
                       marginBottom: verticalScale(12) },
    tripLabel:       { marginLeft: scale(8), fontSize: moderateScale(14) },
    stationRow:      { minHeight: verticalScale(80) },
    stationLeft:     { width: scale(60) },
    stationTime:     { fontSize: moderateScale(14) },
    stationCenter:   { width: scale(40) },
    stationDot:      { width: scale(12), height: scale(12),
                       borderRadius: scale(6) },
    stationName:     { fontSize: moderateScale(16) },
    stationDesc:     { fontSize: moderateScale(13) },
    stopSkeletonRow: { height: verticalScale(50), borderRadius: moderateScale(12),
                       marginBottom: verticalScale(12) },
    tripSkeletonRow: { gap: scale(10), marginBottom: verticalScale(20) },
    tripSkeleton:    { width: scale(90), height: verticalScale(40),
                       borderRadius: moderateScale(14) },
    emptyText:       { marginTop: verticalScale(20), fontSize: moderateScale(14) },
    statusPill:      { marginTop: 12, paddingHorizontal: 12, paddingVertical: 6,
                       borderRadius: 999 },
    statusPillText:  { fontSize: moderateScale(12) },
    microMessage:    { fontSize: moderateScale(12), marginBottom: 8 },
    liveMarkerLeft:  { left: scale(68) },
    // ✅ Pre-computed icon sizes — never call moderateScale() inline in JSX
    iconSmall:       moderateScale(16),
    iconMedium:      moderateScale(20),
    iconLarge:       moderateScale(22),
    iconBus:         moderateScale(15), // ✅ for the live bus marker
  }), [scale, verticalScale, moderateScale, isSmallPhone, isTablet]);
}


// ─────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────
function deriveBusStatus(liveBus, totalStops) {
  if (!liveBus) return { label: "Bus offline", color: "#9CA3AF" };
  const { segmentIndex, progress, lastUpdated } = liveBus;
  const diffMin = (Date.now() - (lastUpdated || 0)) / 60000;
  if (diffMin > 5)          return { label: "Bus offline",          color: "#9CA3AF" };
  if (segmentIndex === 0 && progress < 0.05)
                             return { label: "Boarding at origin",   color: "#10B981" };
  if (totalStops > 2 && segmentIndex >= totalStops - 2 && progress > 0.9)
                             return { label: "Reached destination",  color: "#6366F1" };
  return                            { label: "On the way",           color: "#FF6B35" };
}


// ─────────────────────────────────────────────────────────────────
// SUB-COMPONENTS
// ─────────────────────────────────────────────────────────────────
const TripSkeleton = memo(({ D }) => (
  <View style={[S.tripSkeletonRow, D.tripSkeletonRow]}>
    {[1, 2, 3].map(i => (
      <View key={i} style={[S.tripSkeleton, D.tripSkeleton]} />
    ))}
  </View>
));

const StopsSkeleton = memo(({ D }) => (
  <>
    {[1, 2, 3, 4, 5].map(i => (
      <View key={i} style={[S.stopSkeletonRow, D.stopSkeletonRow]} />
    ))}
  </>
));

const TripTile = memo(({ trip, index, selected, onPress, D }) => (
  <TouchableOpacity
    activeOpacity={0.7}
    onPress={onPress}
    style={[S.tripTile, D.tripTile, selected && S.tripTileActive]}
  >
    {/* <Ionicons name="bus-outline" size={D.iconSmall} color={selected ? "#FFF" : "#6366F1"} style={{ marginRight: 8 }} /> */}
    <Bus size={D.iconSmall} color={selected ? "#FFF" : "#6366F1"} style={{ marginRight: 8 }} />
    <Text style={[S.tripLabel, D.tripLabel, selected ? S.textWhite : S.textDark]}>
      {`Trip ${index + 1}`}
    </Text>
  </TouchableOpacity>
));

const StopRow = memo(({ item, index, isLast, isPassed, isFirst, D }) => (
  <View style={[S.stationRow, D.stationRow]}>
    <View style={D.stationLeft}>
      <Text style={[S.stationTime, D.stationTime]}>
        {item.departure_time || "--:--"}
      </Text>
    </View>
    <View style={[S.stationCenter, D.stationCenter]}>
      <View style={[
        S.stationDot, D.stationDot,
        (isFirst || isPassed) && S.stationDotActive,
      ]} />
      {!isLast && (
        <View style={isPassed ? S.stationLineActive : S.stationLine} />
      )}
    </View>
    <View style={S.stationRight}>
      <Text style={[S.stationName, D.stationName]}>{item.name}</Text>
      <Text style={[S.stationDesc, D.stationDesc]}>
        {index === 0 ? "Boarding Point" : "Stopover"}
      </Text>
    </View>
  </View>
));


// ─────────────────────────────────────────────────────────────────
// MAIN SCREEN
// ─────────────────────────────────────────────────────────────────
export default function BusDetailsScreen({ route }) {
  const navigation = useNavigation();

  const { busId, bus_name } = route.params;

  const responsive = useResponsive();
  const D = useDynamicStyles(responsive);

  // ─── State — lazy initialisers read cache once on mount ──────────
  const [trips, setTrips]               = useState(() => getCachedTrips(busId) ?? []);
  const [selectedTrip, setSelectedTrip] = useState(() => getCachedTrips(busId)?.[0] ?? null);
  const [loadingTrips, setLoadingTrips] = useState(() => (getCachedTrips(busId)?.length ?? 0) === 0);
  const [isReady, setIsReady]           = useState(() => (getCachedTrips(busId)?.length ?? 0) > 0);

  // ✅ useRef so the fallback timeout always reads the LIVE value
  // not the stale closure value from when the effect first ran
  const isReadyRef = useRef(isReady);
  useEffect(() => { isReadyRef.current = isReady; }, [isReady]);

  useEffect(() => {
    // ─── FOCUS: fires at START of transition ─────────────────────
    // Only do cheap work here — cache reads, setState.
    // Never touch DB here, transition is still animating.
    const onFocus = navigation.addListener('focus', () => {
      const cached = getCachedTrips(busId);
      if (cached?.length) {
        // ✅ Warm cache — show data immediately, no waiting
        setTrips(cached);
        setSelectedTrip(prev => prev ?? cached[0]);
        setLoadingTrips(false);
        setIsReady(true);
      }
      // Cold cache — do nothing here, wait for transitionEnd
    });

    // ─── TRANSITION END: fires when animation fully completes ─────
    // Safe to hit DB now — transition is done, no competition.
    const onTransitionEnd = navigation.addListener('transitionEnd', async () => {
      const stale = getCachedTrips(busId);

      // ✅ Cold cache — fetch from DB now
      if (!stale?.length) {
        try {
          const db = await openDB();
          const fetched = await getBusTripsFromSQLite(db, busId);
          const withParsed = fetched.map(trip => ({
            ...trip,
            _parsedStops: trip._stops_json
              ? JSON.parse(trip._stops_json) : [],
          }));
          setCachedTrips(busId, withParsed);
          setTrips(withParsed);
          setSelectedTrip(withParsed[0] ?? null);
        } catch (e) {
          console.error("Trip fetch error:", e);
        } finally {
          setLoadingTrips(false);
          setIsReady(true);
        }
        return;
      }

      // ✅ Warm cache — stale-while-revalidate
      // Data is already showing. Fetch fresh silently in background.
      // Only update state if something actually changed.
      try {
        const db = await openDB();
        const fetched = await getBusTripsFromSQLite(db, busId);
        const withParsed = fetched.map(trip => ({
          ...trip,
          _parsedStops: trip._stops_json
            ? JSON.parse(trip._stops_json) : [],
        }));

        // Compare by trip count and first trip id — cheap, avoids full JSON.stringify
        const changed =
          withParsed.length !== stale.length ||
          withParsed[0]?.trip_id !== stale[0]?.trip_id;

        if (changed) {
          setCachedTrips(busId, withParsed);
          setTrips(withParsed);
          setSelectedTrip(prev => {
            // Keep current selection if it still exists in fresh data
            const stillExists = withParsed.find(t => t.trip_id === prev?.trip_id);
            return stillExists ?? withParsed[0] ?? null;
          });
        }
      } catch (e) {
        // Silent — stale data is still showing, user unaffected
        console.warn("Background revalidation failed:", e);
      }
    });

    // ✅ Safety net for deep links — transitionEnd may not fire
    // Uses ref so it always reads the current isReady value
    const fallback = setTimeout(() => {
      if (!isReadyRef.current) {
        const cached = getCachedTrips(busId);
        if (cached?.length) {
          setTrips(cached);
          setSelectedTrip(cached[0]);
          setLoadingTrips(false);
          setIsReady(true);
        }
      }
    }, 600);

    return () => {
      onFocus();
      onTransitionEnd();
      clearTimeout(fallback);
    };
  }, [busId, navigation]);


  // ─── Derived values ──────────────────────────────────────────────
  const safeTrip = useMemo(
    () => selectedTrip ?? trips[0] ?? null,
    [selectedTrip, trips]
  );

  const safeStops = useMemo(() => {
    if (!isReady || !safeTrip) return [];
    return safeTrip._parsedStops ?? [];
  }, [safeTrip, isReady]);

  const startStop = safeStops[0]?.name ?? "";
  const endStop   = safeStops[safeStops.length - 1]?.name ?? "";

  // ─── Live bus tracking ───────────────────────────────────────────
  const liveBus = useLiveBus(busId);
  const status  = deriveBusStatus(liveBus, safeStops.length);

  const stopLayouts = useRef([]);
  const busY        = useSharedValue(0);

  useEffect(() => {
    if (!liveBus) return;
    const { segmentIndex: i, progress } = liveBus;
    if (i == null || !stopLayouts.current.length) return;
    const start = stopLayouts.current[i];
    const end   = stopLayouts.current[i + 1];
    if (start == null || end == null) return;
    let targetY = start + (end - start) * progress;
    if (progress < 0.05) targetY = start;
    if (progress > 0.95) targetY = end;
    busY.value = withTiming(targetY, { duration: 700 });
  }, [liveBus]);

  const animatedBusStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: busY.value }],
  }));

  const microMessage = useMemo(() => {
    if (!liveBus) return "";
    if (status.label === "On the way")          return "Tracking bus in real time";
    if (status.label === "Boarding at origin")  return "Bus is preparing to depart";
    if (status.label === "Reached destination") return "Trip completed";
    return "";
  }, [liveBus, status.label]);

  const handleSelectTrip = useCallback((trip) => setSelectedTrip(trip), []);

  return (
    <Screen style={{ backgroundColor: THEME.primary }}>
      <StatusBar barStyle="light-content" backgroundColor="#121212" translucent={false} />

      {/* ── Dark header ── */}
      <View style={[S.topSection, D.topSection]}>
        <View style={[S.headerNav, D.headerNav]}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={[S.iconCircle, D.iconCircle]}
          >
            {/* <Ionicons name="chevron-back" size={D.iconLarge} color="white" /> */}
            <ChevronLeft size={D.iconLarge} color="white" />
          </TouchableOpacity>
          <Text style={[S.headerTitle, D.headerTitle]}>Journey Details</Text>
          <View style={{ width: D.iconCircle.width }} />
        </View>

        <View style={S.routeVisualizer}>
          <View>
            <Text style={[S.nodeCity, D.nodeCity]}>{startStop}</Text>
            <Text style={[S.nodeLabel, D.nodeLabel]}>Origin</Text>
          </View>
          <View style={[S.routeLineContainer, D.routeLineContainer]}>
            {/* <Ionicons name="bus" size={D.iconMedium} color={THEME.accent} /> */}
            <Bus size={D.iconMedium} color={THEME.accent} />
            <View style={[S.dashedLine, D.dashedLine]} />
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={[S.nodeCity, D.nodeCity]}>{endStop}</Text>
            <Text style={[S.nodeLabel, D.nodeLabel]}>Destination</Text>
          </View>
        </View>
      </View>

      {/* ── White body ── */}
      <View style={[S.bodySurface, D.bodySurface]}>
        <ScrollView contentContainerStyle={[S.scrollBody, D.scrollBody]}>

          {/* Bus info card */}
          <View style={[S.infoCard, D.infoCard]}>
            <View style={S.infoRow}>
              <View>
                <Text style={[S.busBrand, D.busBrand]}>{bus_name}</Text>
                <Text style={[S.busClass, D.busClass]}>Luxury Sleeper • Non-AC</Text>
              </View>
              <Image
                source={require("../../assets/gramin-bus-logo-main.png")}
                style={[S.busThumb, D.busThumb]}
              />
            </View>

            <View style={[S.statsRow, D.statsRow]}>
              <View style={[S.statItem, D.statItem]}>
                {/* <Ionicons name="time-outline" size={D.iconSmall} color={THEME.accent} /> */}
                <Clock size={D.iconSmall} color={THEME.accent} />
                <Text style={[S.statValue, D.statValue]}>
                  {safeTrip?.duration || "--"}
                </Text>
              </View>
              <View style={[S.statItem, D.statItem]}>
                {/* <Ionicons name="star" size={D.iconSmall} color="#FFD700" /> */}
                <Star size={D.iconSmall} color="#FFD700" />
                <Text style={[S.statValue, D.statValue]}>4.8</Text>
              </View>
              <View style={[S.statItem, D.statItem]}>
                {/* <Ionicons name="shield-checkmark-outline" size={D.iconSmall} color="#4CAF50" /> */}
                <ShieldCheck size={D.iconSmall} color="#4CAF50" />
                <Text style={[S.statValue, D.statValue]}>Verified</Text>
              </View>
            </View>

            <View style={[S.statusPill, D.statusPill,
              { backgroundColor: status.color + "20" }]}>
              <Text style={[S.statusPillText, D.statusPillText,
                { color: status.color }]}>
                {status.label}
              </Text>
            </View>
          </View>

          {/* Trip selector */}
          {!isReady || (trips.length === 0 && loadingTrips) ? (
            <TripSkeleton D={D} />
          ) : trips.length > 0 ? (
            <View style={[S.tripGrid, D.tripGrid]}>
              {trips.map((trip, index) => (
                <TripTile
                  key={trip.trip_id}
                  trip={trip}
                  index={index}
                  selected={trip.trip_id === selectedTrip?.trip_id}
                  onPress={() => handleSelectTrip(trip)}
                  D={D}
                />
              ))}
            </View>
          ) : (
            <Text style={[S.emptyText, D.emptyText]}>No trips available</Text>
          )}

          {/* Route stations */}
          {!isReady || loadingTrips ? (
            <View style={{ marginTop: 10 }}>
              <Text style={[S.sectionLabel, D.sectionLabel]}>Route Stations</Text>
              <StopsSkeleton D={D} />
            </View>
          ) : safeStops.length > 0 ? (
            <>
              <Text style={[S.sectionLabel, D.sectionLabel]}>Route Stations</Text>

              {microMessage ? (
                <Text style={[S.microMessage, D.microMessage]}>
                  {microMessage}
                </Text>
              ) : null}

              <View style={{ position: "relative" }}>
                {/* ✅ Single map — onLayout wrapper + StopRow together */}
                {/* ✅ REMOVED the dead second map with absoluteFill */}
                {safeStops.map((item, index) => (
                  <View
                    key={index}
                    onLayout={e => {
                      stopLayouts.current[index] = e.nativeEvent.layout.y;
                    }}
                  >
                    <StopRow
                      item={item}
                      index={index}
                      isFirst={index === 0}
                      isLast={index === safeStops.length - 1}
                      isPassed={liveBus != null && index <= liveBus.segmentIndex}
                      D={D}
                    />
                  </View>
                ))}

                {liveBus && (
                  <Animated.View
                    pointerEvents="none"
                    style={[
                      { position: "absolute", zIndex: 999, alignItems: "center" },
                      D.liveMarkerLeft,
                      animatedBusStyle,
                    ]}
                  >
                    <View style={S.liveMarkerInner}>
                      {/* ✅ Using D.iconBus — pre-computed, not inline function call */}
                      {/* <Ionicons name="bus" size={D.iconBus} color="#fff" /> */}
                      <Bus size={D.iconBus} color="#fff" />
                    </View>
                  </Animated.View>
                )}
              </View>
            </>
          ) : null}

        </ScrollView>
      </View>
    </Screen>
  );
}