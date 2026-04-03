
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Keyboard, Modal, UIManager, LayoutAnimation, Platform, ScrollView, Dimensions } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
// import FontAwesome from 'react-native-vector-icons/FontAwesome';
// import Icon from 'react-native-vector-icons/MaterialIcons';
// import Ionicons from 'react-native-vector-icons/Ionicons';
import { Menu, Sun, X, ArrowUpDown, Bus, ChevronRight, IdCard } from '../components/AppIcons';
// import BusIcon from "../../assets/icons/bus.svg";

import { LinearGradient } from 'react-native-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { openDB } from '../db/localDB';
import { getStoppagesFromSQLite } from '../db/queries';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { useResponsive } from '../utils/useResponsive'; 
import { getRoutesFromSQLite } from '../db/queries';
import { setCachedRoutes } from '../cache/routeCache';

// Enable LayoutAnimation for Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    if (!global.nativeFabricUIManager) {
        UIManager.setLayoutAnimationEnabledExperimental(true);
    }
}

// 🧠 FUZZY MATCH LOGIC (Levenshtein Distance)
const getLevenshteinDistance = (a, b) => {
    const matrix = [];
    let i, j;

    for (i = 0; i <= b.length; i++) {
        matrix[i] = [i];
    }
    for (j = 0; j <= a.length; j++) {
        matrix[0][j] = j;
    }

    for (i = 1; i <= b.length; i++) {
        for (j = 1; j <= a.length; j++) {
            if (b.charAt(i - 1) === a.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1,
                    Math.min(
                        matrix[i][j - 1] + 1,
                        matrix[i - 1][j] + 1
                    )
                );
            }
        }
    }

    return matrix[b.length][a.length];
};

export default function HomeContent() {
    const navigation = useNavigation();

    const {
        scale,
        moderateScale,
        verticalScale,
        fontSize,
        spacing,
        clamp,
        sizeClass,
        width: screenWidth,
        height: screenHeight,
        isSmallPhone,
        isTablet,
        wp,
        hp,
    } = useResponsive();

    // ---------------------------------------------------
    // 🎨 RESPONSIVE - Fixed layout (no scrolling)
    // ---------------------------------------------------
    const responsive = useMemo(() => {
        const isVeryShortScreen = screenHeight < 700;

        return {
            // Header
            headerPaddingH: spacing(14, 12, 18),
            headerPaddingV: isVeryShortScreen ? verticalScale(8) : verticalScale(10),
            headerTitleSize: fontSize(20, 18, 22),
            headerSubtitle: fontSize(11, 10, 12),
            headerMarginTop: isVeryShortScreen ? verticalScale(6) : verticalScale(8),

            // Brand Section
            brandFontSize: isVeryShortScreen ? fontSize(28, 26, 32) : fontSize(32, 28, 36),
            brandSubtext: fontSize(13, 12, 14),
            brandMarginTop: isVeryShortScreen ? verticalScale(12) : verticalScale(16),
            brandMarginBottom: isVeryShortScreen ? verticalScale(10) : verticalScale(14),

            // Card
            cardPadding: spacing(16, 14, 20),
            cardPaddingVertical: isVeryShortScreen ? spacing(14, 12, 18) : spacing(16, 18, 22),
            cardBorderRadius: moderateScale(7),
            cardMarginHorizontal: spacing(14, 12, 18),

            // Input fields
            inputFontSize: fontSize(17, 16, 18),
            inputHeight: isVeryShortScreen ? verticalScale(45) : verticalScale(55),

            // Icons
            iconSize: moderateScale(24),
            swapIconSize: moderateScale(24),

            // Typography
            sectionTitle: fontSize(18, 17, 20),
            tripRouteSize: fontSize(15, 14, 16),
            tripMeta: fontSize(13, 12, 14),
            ctaText: fontSize(16, 15, 17),
            suggestionItemSize: fontSize(16, 15, 17),
            badgeTextSize: fontSize(13, 12, 14),

            // Spacing
            recentMarginTop: isVeryShortScreen ? verticalScale(16) : verticalScale(24),

            // Button
            ctaPaddingVertical: isVeryShortScreen ? verticalScale(14) : verticalScale(16),
            ctaPaddingHorizontal: spacing(28, 24, 36),
            ctaBorderRadius: moderateScale(7),
            ctaMarginTop: isVeryShortScreen ? verticalScale(12) : verticalScale(16),

            // Menu
            menuWidth: wp(75),
            menuTitleSize: fontSize(22, 20, 26),
            menuItemSize: fontSize(16, 15, 18),

            // Journey visualization
            journeyColumnWidth: moderateScale(32),

            // Recent trips
            tripCardHeight: isVeryShortScreen ? verticalScale(62) : verticalScale(70),
            tripIconSize: moderateScale(40),

            isVeryShortScreen,
        };
    }, [sizeClass, screenWidth, screenHeight]);

    const styles = useMemo(() => StyleSheet.create({
        safeArea: {
            flex: 1,
            backgroundColor: '#F8FAFC',
        },
        container: {
            flex: 1,
        },

        // ========== HEADER ==========
        topHeader: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginHorizontal: responsive.cardMarginHorizontal,
            backgroundColor: '#FFFFFF',
            borderBottomWidth: 1,
            borderBottomColor: '#F1F5F9',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.03,
            shadowRadius: 3,
            elevation: 2,
            borderRadius: responsive.cardBorderRadius,
            paddingHorizontal: responsive.headerPaddingH,
            paddingVertical: responsive.headerPaddingV,
            marginTop: responsive.headerMarginTop,
        },
        navButton: {
            width: moderateScale(40),
            height: moderateScale(40),
            borderRadius: moderateScale(8),
            justifyContent: 'center',
            alignItems: 'center',
        },
        headerCenter: {
            alignItems: 'center',
        },
        headerTitle: {
            fontSize: responsive.headerTitleSize,
            fontWeight: '800',
            color: '#0F172A',
            letterSpacing: -0.3,
        },
        headerHighlight: {
            color: '#10B981',
        },
        headerSubtitle: {
            fontSize: responsive.headerSubtitle,
            color: '#64748B',
            marginTop: 2,
            fontWeight: '500',
        },

        // ========== BRANDING ==========
        brandingContainer: {
            paddingHorizontal: responsive.cardMarginHorizontal,
            marginTop: responsive.brandMarginTop,
            marginBottom: responsive.brandMarginBottom,
        },
        brandText: {
            fontSize: responsive.brandFontSize,
            fontWeight: '800',
            color: '#1E293B',
            letterSpacing: -0.5,
            lineHeight: responsive.brandFontSize * 1.15,
        },
        brandHighlight: {
            color: '#10B981',
        },
        brandSubtext: {
            fontSize: responsive.brandSubtext,
            color: '#64748B',
            marginTop: verticalScale(6),
            fontWeight: '500',
            letterSpacing: 0.2,
        },

        // ========== MAIN CARD ==========
        searchLayout: {
            paddingHorizontal: 0,
        },
        card: {
            backgroundColor: '#FFFFFF',
            borderRadius: responsive.cardBorderRadius,
            padding: responsive.cardPadding,
            paddingVertical: responsive.cardPaddingVertical,
            borderWidth: 1,
            borderColor: '#E2E8F0',
            shadowColor: '#64748B',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.06,
            shadowRadius: 12,
            elevation: 3,
            marginHorizontal: responsive.cardMarginHorizontal,
        },
        unifiedContainer: {
            flexDirection: 'row',
            alignItems: 'stretch',
        },

        // ========== PROFESSIONAL JOURNEY COLUMN ==========
        journeyColumn: {
            width: responsive.journeyColumnWidth,
            alignItems: 'center',
            justifyContent: 'flex-start',
            paddingTop: verticalScale(14),
            paddingBottom: verticalScale(10),
        },
        // Origin dot with outer ring (more professional)
        startDotContainer: {
            width: moderateScale(18),
            height: moderateScale(18),
            borderRadius: moderateScale(9),
            backgroundColor: '#ECFDF5', // Light green background
            justifyContent: 'center',
            alignItems: 'center',
            marginBottom: verticalScale(4),
            shadowColor: '#10B981',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.15,
            shadowRadius: 4,
            elevation: 2,
        },
        startDot: {
            width: moderateScale(10),
            height: moderateScale(10),
            borderRadius: moderateScale(5),
            backgroundColor: '#10B981',
        },
        // Gradient line container
        journeyLineContainer: {
            flex: 1,
            width: 2.5,
            marginVertical: verticalScale(3),
            borderRadius: 2,
            overflow: 'hidden',
        },
        journeyLine: {
            width: 2.5,
            flex: 1,
        },
        // Destination marker (amber/orange)
        destinationContainer: {
            width: moderateScale(18),
            height: moderateScale(18),
            borderRadius: moderateScale(9),
            backgroundColor: '#FEF3C7', // Light amber background
            justifyContent: 'center',
            alignItems: 'center',
            marginTop: verticalScale(4),
            shadowColor: '#F59E0B',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.15,
            shadowRadius: 4,
            elevation: 2,
        },
        destinationDot: {
            width: moderateScale(10),
            height: moderateScale(10),
            borderRadius: moderateScale(5),
            backgroundColor: '#F59E0B', // Amber dot
        },

        inputsColumn: {
            flex: 1,
            marginLeft: spacing(12, 10, 16),
            marginRight: spacing(8, 6, 12),
            justifyContent: 'space-around',
        },
        unifiedInputRow: {
            flexDirection: 'row',
            alignItems: 'center',
            height: responsive.inputHeight,
        },
        unifiedTextInput: {
            flex: 1,
            fontSize: responsive.inputFontSize,
            fontWeight: '600',
            color: '#0F172A',
            padding: 0,
            margin: 0,
            textAlignVertical: 'center',
        },
        closeButton: {
            padding: spacing(4, 2, 6),
            marginLeft: spacing(8, 6, 10),
        },
        horizontalDivider: {
            height: 1,
            backgroundColor: '#E2E8F0',
            marginVertical: verticalScale(2),
        },
        rightSwapButton: {
            justifyContent: 'center',
            alignItems: 'center',
            width: moderateScale(48),
            paddingLeft: spacing(4, 2, 6),
        },
        swapIconCircle: {
            width: moderateScale(44),
            height: moderateScale(44),
            borderRadius: moderateScale(22),
            backgroundColor: '#F8FAFC',
            justifyContent: 'center',
            alignItems: 'center',
            borderWidth: 1,
            borderColor: '#E2E8F0',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.04,
            shadowRadius: 4,
            elevation: 1,
        },

        // ========== FLOATING SUGGESTIONS ==========
        floatingSuggestions: {
            position: 'absolute',
            backgroundColor: '#FFFFFF',
            borderRadius: responsive.cardBorderRadius,
            borderWidth: 1,
            borderColor: '#E2E8F0',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.15,
            shadowRadius: 20,
            elevation: 10,
            zIndex: 9999,
            overflow: 'hidden',
        },

        suggestionItem: {
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: spacing(16, 14, 20),
            paddingVertical: verticalScale(14),
            borderBottomWidth: 1,
            borderBottomColor: '#F1F5F9',
            backgroundColor: '#FFFFFF',
        },

        blueBadge: {
            backgroundColor: '#1a5f91',
            paddingVertical: verticalScale(6),
            borderRadius: moderateScale(6),
            marginRight: spacing(14, 12, 16),
            minWidth: moderateScale(45),
            alignItems: 'center',
        },

        badgeText: {
            color: '#FFFFFF',
            fontWeight: '700',
            fontSize: responsive.badgeTextSize,
            letterSpacing: 0.5,
        },

        suggestionName: {
            fontSize: responsive.suggestionItemSize,
            color: '#1E293B',
            fontWeight: '600',
            flex: 1,
        },

        // ========== CTA BUTTON ==========
        ctaContainer: {
            borderRadius: responsive.ctaBorderRadius,
            overflow: 'hidden',
            shadowColor: '#10B981',
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.2,
            shadowRadius: 12,
            elevation: 6,
            marginTop: responsive.ctaMarginTop,
        },
        ctaDisabled: {
            shadowOpacity: 0,
            elevation: 0,
        },
        ctaGradient: {
            paddingVertical: responsive.ctaPaddingVertical,
            paddingHorizontal: responsive.ctaPaddingHorizontal,
            justifyContent: 'center',
            alignItems: 'center',
        },
        ctaContent: {
            flexDirection: 'row',
            alignItems: 'center',
        },
        ctaText: {
            color: '#fff',
            fontSize: responsive.ctaText,
            fontWeight: '700',
            letterSpacing: 1,
            marginLeft: spacing(10, 8, 12)
        },

        // ========== MODAL MENU ==========
        modalOverlay: {
            flex: 1,
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
            justifyContent: 'flex-start'
        },
        menuContainer: {
            backgroundColor: '#fff',
            width: responsive.menuWidth,
            height: '100%',
            borderTopRightRadius: moderateScale(30),
            borderBottomRightRadius: moderateScale(30),
            shadowColor: '#000',
            shadowOpacity: 0.2,
            shadowOffset: { width: 5, height: 0 },
            elevation: 10,
            paddingTop: verticalScale(50),
            paddingHorizontal: responsive.headerPaddingH,
        },
        menuHeader: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: verticalScale(30),
            paddingBottom: verticalScale(15),
            borderBottomWidth: 1,
            borderBottomColor: '#F1F5F9'
        },
        menuTitle: {
            fontSize: responsive.menuTitleSize,
            fontWeight: 'bold',
            color: '#1E293B'
        },
        menuButton: {
            flexDirection: 'row',
            alignItems: 'center',
            paddingVertical: verticalScale(16),
        },
        iconBox: {
            width: moderateScale(40),
            height: moderateScale(40),
            borderRadius: moderateScale(10),
            backgroundColor: '#ECFDF5',
            justifyContent: 'center',
            alignItems: 'center',
            marginRight: spacing(16, 14, 18)
        },
        menuButtonText: {
            flex: 1,
            fontSize: responsive.menuItemSize,
            color: '#334155',
            fontWeight: '600'
        },

        // ========== RECENT TRIPS ==========
        recentSection: {
            marginTop: responsive.recentMarginTop,
        },
        recentSectionTitle: {
            fontSize: responsive.sectionTitle,
            fontWeight: '700',
            color: '#1E293B',
            marginBottom: verticalScale(12),
            letterSpacing: 0.3,
            marginLeft: responsive.cardMarginHorizontal,
        },
        tripListContainer: {
            backgroundColor: '#FFFFFF',
            borderRadius: responsive.cardBorderRadius,
            paddingVertical: verticalScale(4),
            shadowColor: '#64748B',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.06,
            shadowRadius: 12,
            elevation: 3,
            borderWidth: 1,
            borderColor: '#E2E8F0',
            marginHorizontal: responsive.cardMarginHorizontal,
        },
        tripCard: {
            flexDirection: 'row',
            alignItems: 'center',
            height: responsive.tripCardHeight,
            paddingHorizontal: spacing(14, 12, 18),
            borderBottomWidth: 1,
            borderBottomColor: '#F8FAFC',
        },
        tripCardLast: {
            borderBottomWidth: 0,
        },
        tripIconBox: {
            width: responsive.tripIconSize,
            height: responsive.tripIconSize,
            backgroundColor: '#10B981',
            borderRadius: moderateScale(7),
            justifyContent: 'center',
            alignItems: 'center',
            marginRight: spacing(14, 12, 16),
        },
        tripInfo: {
            flex: 1,
            justifyContent: 'center',
        },
        tripRoute: {
            fontSize: responsive.tripRouteSize,
            fontWeight: '600',
            color: '#0F172A',
            marginBottom: verticalScale(2),
        },
        tripDetails: {
            fontSize: responsive.tripMeta,
            color: '#64748B',
            fontWeight: '500',
        },
        routeArrow: {
            fontSize: responsive.tripRouteSize,
            color: '#94A3B8',
        },
    }), [responsive, sizeClass, screenWidth, screenHeight]);

    const [fromStop, setFromStop] = useState(null);
    const [toStop, setToStop] = useState(null);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [searchType, setSearchType] = useState(null);
    const [searchText, setSearchText] = useState("");
    const [allStops, setAllStops] = useState([]);
    const [recentSearches, setRecentSearches] = useState([]);
    const [keyboardHeight, setKeyboardHeight] = useState(0);

    const [suggestionPosition, setSuggestionPosition] = useState(null);

    const fromInputRef = useRef(null);
    const toInputRef = useRef(null);
    const fromBoxRef = useRef(null);
    const toBoxRef = useRef(null);
    const containerRef = useRef(null);

    const DYNAMIC_MAX_HEIGHT = verticalScale(280);

    useFocusEffect(
        useCallback(() => {
            let mounted = true;

            (async () => {
                try {
                    const db = await openDB();
                    const data = await getStoppagesFromSQLite(db);

                    if (mounted) {
                        const optimizedData = data.map(stop => ({
                            ...stop,
                            searchKey: stop.name ? stop.name.toLowerCase() : ""
                        }));

                        setAllStops(optimizedData);
                    }
                } catch (e) {
                    console.error("Failed to load stops", e);
                }
            })();
            return () => { mounted = false };
        }, [])
    );

    const filteredStops = useMemo(() => {
        const q = searchText.toLowerCase().trim();
        if (!q || q.length < 1) return [];

        const startsWith = [];
        const contains = [];
        const fuzzyMatches = [];

        const stopToExclude = searchType === "from" ? toStop?.stop_id : fromStop?.stop_id;

        for (const stop of allStops) {
            if (!stop.searchKey) continue;
            if (stop.stop_id === stopToExclude) continue;

            const lowerName = stop.searchKey;

            if (lowerName.startsWith(q)) {
                startsWith.push(stop);
                if (startsWith.length >= 10) break;
                continue;
            }

            if (q.length >= 2 && lowerName.includes(q)) {
                contains.push(stop);
                continue;
            }

            if (q.length >= 3) {
                const distance = getLevenshteinDistance(q, lowerName);
                if (distance <= 2) {
                    fuzzyMatches.push(stop);
                }
            }
        }

        return [...startsWith, ...contains, ...fuzzyMatches].slice(0, 20);

    }, [searchText, allStops, fromStop, toStop, searchType]);

    const handleFindBuses = () => {
        if (!fromStop || !toStop) return;

        navigation.navigate("GetBuses", {
            fromStopId: fromStop.stop_id,
            toStopId: toStop.stop_id
        });
        setTimeout(() => {
            saveSearchToHistory(fromStop, toStop);
        }, 100);
    };

    const handleSelect = (stop) => {
        setSuggestionPosition(null);

        if (searchType === "from") {
            setFromStop(stop);
        } else {
            setToStop(stop);
        }

        setTimeout(() => {
            if (searchType === "from" && !toStop) {
                toInputRef.current?.focus();
            } else if (searchType === "to" && !fromStop) {
                fromInputRef.current?.focus();
            } else {
                setSearchType(null);
                Keyboard.dismiss();
            }
        }, 10);
    };

    const updateSuggestionPosition = (type) => {
        const inputRef = type === "from" ? fromBoxRef : toBoxRef;
        const currentKeyboardHeight = keyboardHeight || 0;

        requestAnimationFrame(() => {
            if (!inputRef.current || !containerRef.current) return;

            containerRef.current.measureInWindow((cx, cy, cWidth, cHeight) => {
                inputRef.current.measureInWindow((ix, iy, iWidth, iHeight) => {
                    const relativeTop = (iy - cy) + iHeight + 4;
                    const inputBottomAbsolute = iy + iHeight;
                    const windowHeight = Dimensions.get('window').height;
                    const spaceBelow = windowHeight - inputBottomAbsolute - currentKeyboardHeight;
                    const maxHeight = Math.max(100, Math.min(DYNAMIC_MAX_HEIGHT, spaceBelow - 10));

                    setSuggestionPosition({
                        top: relativeTop,
                        left: ix - cx,
                        width: iWidth,
                        maxHeight: maxHeight
                    });
                });
            });
        });
    };

    const handleFocus = (type) => {
        setSearchText("");
        setSearchType(type);
        requestAnimationFrame(() => updateSuggestionPosition(type));
    };

    useEffect(() => {
        const keyboardWillShow = Keyboard.addListener(
            Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
            (e) => {
                setKeyboardHeight(e.endCoordinates.height);
                if (searchType) {
                    updateSuggestionPosition(searchType);
                }
            }
        );

        const keyboardWillHide = Keyboard.addListener(
            Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
            () => {
                setKeyboardHeight(0);
            }
        );

        return () => {
            keyboardWillShow.remove();
            keyboardWillHide.remove();
        };
    }, [searchType, screenHeight]);

    useEffect(() => {
        loadHistory();
    }, []);

    const loadHistory = async () => {
        try {
            const history = await AsyncStorage.getItem('search_history');
            if (history) setRecentSearches(JSON.parse(history));
        } catch (e) {
            console.error("Failed to load history");
        }
    };

    const saveSearchToHistory = async (fromItem, toItem) => {
        const newSearch = {
            id: Date.now().toString(),
            from: fromItem,
            to: toItem,
        };

        const filtered = recentSearches.filter(
            item => !(item.from.name === fromItem.name && item.to.name === toItem.name)
        );

        const updatedHistory = [newSearch, ...filtered].slice(0, 4);

        setRecentSearches(updatedHistory);
        await AsyncStorage.setItem('search_history', JSON.stringify(updatedHistory));
    };

    const RecentTripCard = ({ item, onPress, isLast }) => (
        <TouchableOpacity
            style={[styles.tripCard, isLast && styles.tripCardLast]}
            activeOpacity={0.7}
            onPress={onPress}
        >
            <View style={styles.tripIconBox}>
                <Bus size={moderateScale(26)} color="#ffffff" />
            </View>

            <View style={styles.tripInfo}>
                <Text style={styles.tripRoute} numberOfLines={1}>
                    {item.from.name} <Text style={styles.routeArrow}>→</Text> {item.to.name}
                </Text>
                <Text style={styles.tripDetails}>
                    12 km  |  25 mins  |  ₹ 15
                </Text>
            </View>

            <ChevronRight size={moderateScale(22)} color="#CBD5E1" />
        </TouchableOpacity>
    );

    // routes for next screen  ---------------------------------------------------

    // Prefetch routes into memory cache whenever screen is focused
    useFocusEffect(
        useCallback(() => {
            let cancelled = false;
            const prefetch = async () => {
                const data = await getRoutesFromSQLite();
                if (!cancelled) setCachedRoutes(data);
            };
            prefetch();
            return () => { cancelled = true; };
        }, [])
    );

    // routes for next screen  ---------------------------------------------------


    return (
        <SafeAreaView
            edges={['top']}
            style={styles.safeArea}
        >
            <View style={styles.container} ref={containerRef} collapsable={false}>
                <Modal animationType="slide" transparent visible={isMenuOpen} onRequestClose={() => setIsMenuOpen(false)}>
                    <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setIsMenuOpen(false)}>
                        <View style={styles.menuContainer} onStartShouldSetResponder={() => true}>
                            <View style={styles.menuHeader}>
                                <Text style={styles.menuTitle}>Menu</Text>
                                <TouchableOpacity onPress={() => setIsMenuOpen(false)}>
                                    <X size={moderateScale(24)} color="#333" />
                                </TouchableOpacity>
                            </View>
                            <TouchableOpacity style={styles.menuButton} onPress={() => { setIsMenuOpen(false); navigation.navigate('DriverLogin'); }}>
                                <View style={styles.iconBox}>
                                    <IdCard size={moderateScale(22)} color="#10B981" />
                                </View>
                                <Text style={styles.menuButtonText}>Driver Console</Text>
                                <ChevronRight size={moderateScale(20)} color="#ccc" />
                            </TouchableOpacity>
                        </View>
                    </TouchableOpacity>
                </Modal>

                {searchType && suggestionPosition && filteredStops.length > 0 && (
                    <View style={[styles.floatingSuggestions, {
                        top: suggestionPosition.top,
                        left: suggestionPosition.left,
                        width: suggestionPosition.width,
                        maxHeight: suggestionPosition.maxHeight
                    }]}>
                        <ScrollView nestedScrollEnabled keyboardShouldPersistTaps="always">
                            {filteredStops.map(stop => (
                                <TouchableOpacity
                                    key={stop.stop_id}
                                    style={styles.suggestionItem}
                                    onPress={() => handleSelect(stop)}
                                >
                                    <View style={styles.blueBadge}>
                                        <Text style={styles.badgeText}>
                                            {stop.code || stop.name.slice(0, 3).toUpperCase()}
                                        </Text>
                                    </View>
                                    <Text style={styles.suggestionName}>{stop.name}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                )}

                {searchType && (
                    <TouchableOpacity
                        style={[StyleSheet.absoluteFill, { zIndex: 9998 }]}
                        activeOpacity={1}
                        onPress={() => {
                            setSuggestionPosition(null);
                            setSearchType(null);
                            Keyboard.dismiss();
                        }}
                    />
                )}

                <View style={styles.topHeader}>
                    <TouchableOpacity onPress={() => setIsMenuOpen(true)} style={styles.navButton}>
                        {/* <FontAwesome name="bars" size={moderateScale(20)} color="#1E293B" /> */}
                        <Menu size={moderateScale(20)} color="#1E293B" />
                    </TouchableOpacity>

                    <View style={styles.headerCenter}>
                        <Text style={styles.headerTitle}>
                            Gramin <Text style={styles.headerHighlight}>Bus</Text>
                        </Text>
                        <Text style={styles.headerSubtitle}>Travel safe, travel smart.</Text>
                    </View>

                    <View style={styles.navButton}>
                        {/* <Ionicons name="sunny-outline" size={moderateScale(26)} color="#1E293B" /> */}
                            {/* <Sun size={moderateScale(26)} color="#1E293B" /> */}
                    </View>
                </View>

                <View style={styles.brandingContainer}>
                    <Text style={styles.brandText}>
                        Plan. <Text style={styles.brandHighlight}>Ride.</Text> Arrive.
                    </Text>
                    <Text style={styles.brandSubtext}>Track public transport in real time.</Text>
                </View>

                <View style={styles.searchLayout}>
                    <View style={styles.card}>
                        <View style={styles.unifiedContainer}>
                            {/* ========== UPGRADED PROFESSIONAL JOURNEY COLUMN ========== */}
                            <View style={styles.journeyColumn}>
                                {/* Origin Point - Green dot with ring */}
                                <View style={styles.startDotContainer}>
                                    <View style={styles.startDot} />
                                </View>

                                {/* Connecting Line - Gradient */}
                                <LinearGradient
                                    colors={['#10B981', '#CBD5E1']}
                                    style={styles.journeyLineContainer}
                                >
                                    <View style={styles.journeyLine} />
                                </LinearGradient>

                                {/* Destination Point - Amber dot with ring */}
                                <View style={styles.destinationContainer}>
                                    <View style={styles.destinationDot} />
                                </View>
                            </View>

                            <View style={styles.inputsColumn}>
                                <TouchableOpacity
                                    style={styles.unifiedInputRow}
                                    onPress={() => fromInputRef.current?.focus()}
                                    activeOpacity={1}
                                    ref={fromBoxRef}
                                >
                                    <TextInput
                                        ref={fromInputRef}
                                        disableFullscreenUI={true}
                                        style={styles.unifiedTextInput}
                                        placeholder="Starting point..."
                                        placeholderTextColor="#94A3B8"
                                        value={searchType === "from" ? searchText : (fromStop?.name || "")}
                                        onChangeText={setSearchText}
                                        onFocus={() => handleFocus("from")}
                                        returnKeyType="search"
                                    />
                                    {fromStop && searchType !== "from" && (
                                        <TouchableOpacity
                                            style={styles.closeButton}
                                            onPress={() => {
                                                setFromStop(null);
                                                fromInputRef.current?.focus();
                                            }}
                                        >
                                            {/* <Icon name="close" size={moderateScale(20)} color="#94A3B8" /> */}
                                            <X size={moderateScale(20)} color="#94A3B8" />
                                        </TouchableOpacity>
                                    )}
                                </TouchableOpacity>

                                <View style={styles.horizontalDivider} />

                                <TouchableOpacity
                                    style={styles.unifiedInputRow}
                                    onPress={() => toInputRef.current?.focus()}
                                    activeOpacity={1}
                                    ref={toBoxRef}
                                >
                                    <TextInput
                                        ref={toInputRef}
                                        disableFullscreenUI={true}
                                        style={styles.unifiedTextInput}
                                        placeholder="Destination..."
                                        placeholderTextColor="#94A3B8"
                                        value={searchType === "to" ? searchText : (toStop?.name || "")}
                                        onChangeText={setSearchText}
                                        onFocus={() => handleFocus("to")}
                                        returnKeyType="search"
                                    />
                                    {toStop && searchType !== "to" && (
                                        <TouchableOpacity
                                            style={styles.closeButton}
                                            onPress={() => {
                                                setToStop(null);
                                                toInputRef.current?.focus();
                                            }}
                                        >
                                            {/* <Icon name="close" size={moderateScale(20)} color="#94A3B8" /> */}
                                            <X size={moderateScale(20)} color="#94A3B8" />
                                        </TouchableOpacity>
                                    )}
                                </TouchableOpacity>
                            </View>

                            <TouchableOpacity
                                style={styles.rightSwapButton}
                                activeOpacity={0.6}
                                onPress={() => {
                                    const temp = fromStop;
                                    setFromStop(toStop);
                                    setToStop(temp);

                                    try {
                                        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                                    } catch (e) {
                                        // ignore
                                    }
                                }}
                            >
                                <View style={styles.swapIconCircle}>
                                    {/* <Icon name="swap-vert" size={responsive.swapIconSize} color="#10B981" /> */}
                                    <ArrowUpDown size={responsive.swapIconSize} color="#10B981" />
                                </View>
                            </TouchableOpacity>
                        </View>

                        <TouchableOpacity
                            onPress={handleFindBuses}
                            disabled={!fromStop || !toStop}
                            style={[styles.ctaContainer, (!fromStop || !toStop) && styles.ctaDisabled]}
                            activeOpacity={0.9}
                        >
                            <LinearGradient
                                colors={(!fromStop || !toStop) ? ['#CBD5E1', '#94A3B8'] : ['#059669', '#047857']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={styles.ctaGradient}
                            >
                                <View style={styles.ctaContent}>
                                    <Bus size={moderateScale(22)} color="#fff" />
                                    <Text style={styles.ctaText}>FIND BUSES</Text>
                                </View>
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>
                </View>

                {recentSearches.length > 0 && (
                    <View style={styles.recentSection}>
                        <Text style={styles.recentSectionTitle}>Recent Trips</Text>

                        <View style={styles.tripListContainer}>
                            {recentSearches.slice(0, responsive.isVeryShortScreen ? 3 : 4).map((item, index, array) => (
                                <RecentTripCard
                                    key={item.id}
                                    item={item}
                                    isLast={index === array.length - 1}
                                    onPress={() => {
                                        Keyboard.dismiss();
                                        setSearchType(null);
                                        setSearchText("");
                                        setFromStop(item.from);
                                        setToStop(item.to);
                                        setSuggestionPosition(null);
                                    }}
                                />
                            ))}
                        </View>
                    </View>
                )}
            </View>
        </SafeAreaView>
    );
}