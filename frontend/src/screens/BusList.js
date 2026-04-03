
// ─────────────────────────────────────────────────────────────────
// BusList.js  — FIXED VERSION
// ─────────────────────────────────────────────────────────────────
import React, {
  useMemo, useState, useRef, useCallback, useEffect, memo
} from 'react';
import {
  View, Text, StyleSheet, Image, TouchableOpacity,
  TextInput, UIManager, Platform,
} from 'react-native';
// import Ionicons from "react-native-vector-icons/Ionicons";
// import Icon from 'react-native-vector-icons/MaterialIcons';
import { ChevronLeft, ChevronRight, Search, X } from '../components/AppIcons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import LinearGradient from "react-native-linear-gradient";
import { FlashList } from '@shopify/flash-list';
import Animated, {
  useSharedValue, useAnimatedStyle, withSpring,
  interpolate, Extrapolation,
} from "react-native-reanimated";

import { getBusTripsFromSQLite } from "../db/queries";
import { setCachedTrips, getCachedTrips } from '../cache/tripCache';
import { openDB } from "../db/localDB";
import { getBusesByRoute } from "../db/queries";
import { useResponsive } from "../utils/useResponsive";
import { getCachedBuses, setCachedBuses } from '../cache/busCache';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  if (!global.nativeFabricUIManager) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
  }
}

// ─────────────────────────────────────────────────────────────────
// BusCard — identical structure to your working original.
// Only addition: onPressIn for prefetch + pre-parsed stops.
// ─────────────────────────────────────────────────────────────────
const BusCard = memo(({
  item, expanded, onPress, onViewDetails,
  styles, responsive, expandedHeight, prefetchTrips,
}) => {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withSpring(expanded ? 1 : 0, {
      damping: 18, stiffness: 160, mass: 0.6,
    });
  }, [expanded]);

  const animatedStyle = useAnimatedStyle(() => ({
    height: interpolate(progress.value, [0, 1], [0, expandedHeight], Extrapolation.CLAMP),
    opacity: interpolate(progress.value, [0, 0.4, 1], [0, 0.7, 1], Extrapolation.CLAMP),
    overflow: 'hidden',
  }));

  const chevronStyle = useAnimatedStyle(() => ({
    transform: [{
      rotate: `${interpolate(progress.value, [0, 1], [0, 90], Extrapolation.CLAMP)}deg`,
    }],
  }));

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      onPressIn={() => prefetchTrips(item.bus_id)}
      style={styles.cardContainer}
    >
      <View style={styles.cardTopSection}>
        <Image
          source={require('../../assets/gramin-bus-logo-main.png')}
          style={[styles.busImage, {
            width: responsive.busImgWidth,
            height: responsive.busImgHeight,
          }]}
        />
        <View style={styles.busInfo}>
          <View style={styles.headerRow}>
            <Text
              style={[styles.busName, { fontSize: responsive.busNameSize }]}
              numberOfLines={1}
            >
              {item.bus_name}
            </Text>
            <Animated.View style={chevronStyle}>
              {/* <Ionicons name="chevron-forward" size={responsive.iconSmall} color="#999" /> */}
              <ChevronRight size={responsive.iconSmall} color="#999" />
            </Animated.View>
          </View>
          <Text
            style={[styles.routeText, { fontSize: responsive.routeTextSize }]}
            numberOfLines={1}
          >
            {item.from_location} → {item.to_location}
          </Text>
          <Text
            style={[styles.viaText, { fontSize: responsive.viaTextSize }]}
            numberOfLines={1}
          >
            via {item.via}
          </Text>
        </View>
      </View>

      <Animated.View style={[styles.expandedContentContainer, animatedStyle]}>
        <View style={styles.dashedLine} />
        {expanded && (
          <TouchableOpacity
            style={styles.detailsButton}
            // ✅ onPressIn — fires 150ms earlier than onPress
            // transition starts instantly on finger down
            onPressIn={() => onViewDetails()}
            activeOpacity={0.8}
          >
            <Text style={styles.detailsButtonText}>View Bus Details</Text>
          </TouchableOpacity>
        )}
      </Animated.View>
    </TouchableOpacity>
  );
});


// ─────────────────────────────────────────────────────────────────
// MAIN SCREEN
// ─────────────────────────────────────────────────────────────────
export default function BusList({ route }) {
  const { routeId, routeFrom, routeTo } = route.params;
  const navigation = useNavigation();

  const [activeBusId, setActiveBusId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [busList, setBusList] = useState([]);

  const {
    scale, verticalScale, moderateScale,
    width: screenWidth, height: screenHeight,
    isSmallPhone, isTablet, isLargePhone, clamp,
  } = useResponsive();

  // Identical to your working original
  const responsive = useMemo(() => ({
    busImgWidth: clamp(scale(70), 60, isTablet ? 100 : 80),
    busImgHeight: clamp(verticalScale(50), 45, isTablet ? 80 : 60),
    logoWidth: scale(70),
    logoHeight: verticalScale(50),
    busNameSize: moderateScale(18, 0.5),
    routeTextSize: moderateScale(14, 0.5),
    viaTextSize: moderateScale(12, 0.5),
    mainTitleSize: moderateScale(22, 0.5),
    subtitleSize: moderateScale(13, 0.5),
    listHeaderSize: moderateScale(16, 0.5),
    detailsButtonTextSize: moderateScale(13, 0.5),
    searchInputSize: moderateScale(15, 0.5),
    iconSmall: moderateScale(18, 0.5),
    iconMedium: moderateScale(24, 0.5),
    borderRadius: moderateScale(16, 0.5),
    searchBorderRadius: moderateScale(10, 0.5),
    buttonBorderRadius: moderateScale(10, 0.5),
    headerHeight: verticalScale(56),
    searchMinHeight: verticalScale(48),
    cardPadding: scale(16),
    buttonPaddingHorizontal: scale(18),
    buttonPaddingVertical: verticalScale(8),
    paddingHorizontal: scale(16),
    isSmallPhone, isTablet, isLargePhone,
  }), [screenWidth, screenHeight, isSmallPhone, isTablet, isLargePhone,
    scale, verticalScale, moderateScale, clamp]);

  const expandedHeight = useMemo(() => verticalScale(70), [verticalScale]);
  const estimatedItemSize = useMemo(() => verticalScale(150), [verticalScale]);

  // Identical structure to your working original
  const styles = useMemo(() => StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: '#F8F6F2' },
    header: {
      height: responsive.headerHeight,
      flexDirection: 'row', alignItems: 'center',
      paddingHorizontal: responsive.paddingHorizontal,
      backgroundColor: '#F8F6F2', justifyContent: 'space-between',
    },
    backButton: {
      width: scale(40), height: scale(40),
      justifyContent: 'center', alignItems: 'flex-start',
    },
    logo: {
      width: responsive.logoWidth, height: responsive.logoHeight,
      resizeMode: 'contain',
    },
    titleSection: {
      paddingHorizontal: scale(20), marginTop: verticalScale(10),
    },
    mainTitle: {
      fontSize: responsive.mainTitleSize, fontWeight: '700', color: '#1A1A1A',
    },
    subtitle: {
      fontSize: responsive.subtitleSize, color: '#666',
      marginTop: verticalScale(4),
    },
    listHeader: {
      fontWeight: '600', color: '#333',
      marginVertical: verticalScale(10),
      fontSize: responsive.listHeaderSize,
      marginHorizontal: scale(20),
    },
    searchWrapper: {
      paddingHorizontal: scale(20), paddingVertical: verticalScale(10),
    },
    searchContainer: {
      flexDirection: 'row', alignItems: 'center',
      backgroundColor: '#ffffff',
      borderRadius: responsive.searchBorderRadius,
      paddingHorizontal: scale(15),
      minHeight: responsive.searchMinHeight,
      elevation: 3, shadowColor: '#000', shadowOpacity: 0.05,
      shadowRadius: 5, shadowOffset: { width: 0, height: 2 },
    },
    searchInput: {
      flex: 1, fontSize: responsive.searchInputSize,
      color: '#333', marginLeft: scale(10),
      paddingVertical: verticalScale(8),
    },
    cardContainer: {
      backgroundColor: '#FFFFFF',
      borderRadius: responsive.borderRadius,
      marginHorizontal: scale(20),
      marginBottom: verticalScale(14),
      paddingTop: responsive.cardPadding,
      paddingHorizontal: responsive.cardPadding,
      paddingBottom: 0,
      borderWidth: 0.6, borderColor: '#E6E6E6',
      elevation: 1, maxWidth: 560, alignSelf: 'center',
      width: isTablet ? '85%' : '90%',
      overflow: 'hidden',
    },
    cardTopSection: {
      flexDirection: 'row', marginBottom: verticalScale(8),
    },
    busImage: {
      borderRadius: moderateScale(12, 0.5),
      backgroundColor: '#EEE', resizeMode: 'contain',
    },
    busInfo: {
      flex: 1, marginLeft: scale(12), justifyContent: 'center',
    },
    headerRow: {
      flexDirection: 'row', justifyContent: 'space-between',
      alignItems: 'center', marginBottom: verticalScale(4),
    },
    busName: {
      fontWeight: '700', color: '#333',
      flex: 1, marginRight: scale(8),
    },
    routeText: {
      fontWeight: '600', color: '#444', marginBottom: verticalScale(2),
    },
    viaText: { color: '#888' },
    expandedContentContainer: { width: '100%' },
    dashedLine: {
      height: 1, borderWidth: 1, borderColor: '#EEE',
      borderStyle: 'dashed', marginBottom: verticalScale(10),
    },
    detailsButton: {
      backgroundColor: '#2e7d32',
      borderRadius: responsive.buttonBorderRadius,
      paddingVertical: responsive.buttonPaddingVertical,
      paddingHorizontal: responsive.buttonPaddingHorizontal,
      alignSelf: 'flex-end', marginBottom: verticalScale(10),
    },
    detailsButtonText: {
      color: '#FFF', fontWeight: '600',
      fontSize: responsive.detailsButtonTextSize,
    },
    listPadding: { paddingBottom: verticalScale(100) },
    stickyHeader: { backgroundColor: '#F8F6F2', zIndex: 10 },
    stickyFade: {
      position: 'absolute', top: -20, left: 0, right: 0, height: 20,
    },
    emptyText: {
      textAlign: 'center', marginTop: verticalScale(40),
      color: '#999', fontSize: responsive.subtitleSize,
    },
  }), [responsive, isTablet, scale, verticalScale, moderateScale]);

  // ─── Upgrade 1: pre-parse JSON stops so BusDetailsScreen
  // never calls JSON.parse during a transition ────────────────────
  const prefetchTrips = useCallback(async (busId) => {
    if (getCachedTrips(busId)) return;
    try {
      const db = await openDB();
      const fetched = await getBusTripsFromSQLite(db, busId);
      const withParsed = fetched.map(trip => ({
        ...trip,
        _parsedStops: trip._stops_json
          ? JSON.parse(trip._stops_json) : [],
      }));
      setCachedTrips(busId, withParsed);
    } catch (e) {
      console.error('Prefetch failed:', e);
    }
  }, []);

  // ─── Load bus list — identical to your working original ─────────
  useEffect(() => {
    let cancelled = false;
    let timer = null;

    const loadInitial = async () => {
      const cached = getCachedBuses(routeId);
      if (cached && !cancelled) setBusList(cached);

      timer = setTimeout(async () => {
        if (cancelled) return;
        try {
          const db = await openDB();
          const buses = await getBusesByRoute(db, routeId);
          if (!cancelled) {
            setBusList(buses);
            setCachedBuses(routeId, buses);
          }
        } catch (e) {
          console.error('Bus list load failed:', e);
        }
      }, 0);
    };

    loadInitial();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [routeId]);

  const filteredBusList = useMemo(() => {
    if (!searchQuery.trim()) return busList;
    const q = searchQuery.toLowerCase();
    return busList.filter(b => b.bus_name.toLowerCase().includes(q));
  }, [busList, searchQuery]);

  const listRef = useRef(null);
  const scrollY = useRef(0);

  // ─── Upgrade 2: guard so scroll only fires if user had scrolled ──
  useFocusEffect(
    useCallback(() => {
      // ✅ Wait until transition back is fully complete before scrolling
      const unsub = navigation.addListener('transitionEnd', (e) => {
        if (e.data.closing && scrollY.current > 0) {
          listRef.current?.scrollToOffset({
            offset: scrollY.current, animated: false,
          });
        }
      });
      return unsub;
    }, [navigation])
  );

  const toggleBus = useCallback((busId) => {
    setActiveBusId(prev => prev !== busId ? busId : null);
  }, []);

  // ─── Upgrade 3: navigate first, collapse card after ─────────────
  const openBusDetails = useCallback((bus) => {
    navigation.push('BusDetailsScreen', {
      busId: bus.bus_id,
      bus_name: bus.bus_name,
      routeFrom,
      routeTo,
    });
  }, [navigation, routeFrom, routeTo]);

  // useEffect(() => {
  //   const unsub = navigation.addListener('transitionEnd', (e) => {
  //     // Only fire when navigating away (not when coming back)
  //     if (!e.data.closing) {
  //       setActiveBusId(null);
  //     }
  //   });
  //   return unsub;
  // }, [navigation]);

  const clearSearch = useCallback(() => setSearchQuery(''), []);

  const renderBus = useCallback(({ item }) => (
    <BusCard
      item={item}
      styles={styles}
      responsive={responsive}
      expandedHeight={expandedHeight}
      expanded={activeBusId === item.bus_id}
      onPress={() => toggleBus(item.bus_id)}
      onViewDetails={() => openBusDetails(item)}
      prefetchTrips={prefetchTrips}
    />
  ), [activeBusId, styles, responsive, expandedHeight,
    toggleBus, openBusDetails, prefetchTrips]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>

      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          {/* <Ionicons name="chevron-back" size={responsive.iconMedium} color="#333" /> */}
          <ChevronLeft size={responsive.iconMedium} color="#333" />
        </TouchableOpacity>
        {/* <Image
          source={require('../../assets/gramin-bus-logo-main.png')}
          style={styles.logo}
        /> */}
        <View style={styles.titleSection}>
          <Text style={styles.mainTitle} numberOfLines={1}>
            {routeFrom} → {routeTo}
          </Text>
          <Text style={styles.subtitle}>Buses operating on this route</Text>
        </View>

        <View style={{ width: scale(40) }} />
      </View>



      {busList.length > 0 && (
        <View style={styles.searchWrapper}>
          <View style={styles.searchContainer}>
            {/* <Ionicons name="search-outline" size={scale(20)} color="#888" /> */}
            <Search size={scale(20)} color="#888" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by bus name"
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor="#888"
              autoCorrect={false}
              autoCapitalize="none"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                onPress={clearSearch}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                {/* <Icon name="close" size={scale(20)} color="#7b7b7b" /> */}
                <X size={scale(20)} color="#7b7b7b" />
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      {busList.length > 0 && (
        <Text style={styles.listHeader}>Bus name</Text>
      )}

      <FlashList
        ref={listRef}
        data={filteredBusList}
        keyExtractor={item => item.bus_id.toString()}
        contentContainerStyle={styles.listPadding}
        estimatedItemSize={estimatedItemSize}
        extraData={activeBusId}
        initialNumToRender={14}
        windowSize={7}
        scrollEventThrottle={16}
        maxToRenderPerBatch={14}
        removeClippedSubviews={Platform.OS === 'android'}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        onScroll={e => { scrollY.current = e.nativeEvent.contentOffset.y; }}
        renderItem={renderBus}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No buses found</Text>
        }
        ListHeaderComponent={
          busList.length > 0 ? (
            <View style={styles.stickyHeader}>
              <LinearGradient
                colors={['rgba(248,246,242,0)', 'rgba(248,246,242,1)']}
                style={styles.stickyFade}
              />
            </View>
          ) : null
        }
      />

    </SafeAreaView>
  );
}
