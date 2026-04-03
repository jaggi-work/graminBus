
import React, { useState, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    StatusBar,
    Alert,
    Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import Geolocation from '@react-native-community/geolocation';
// import Icon from 'react-native-vector-icons/MaterialIcons'; // Added for icons
import { LogOut, Bus, Clock, StopCircle, PlayCircle, XCircle } from '../components/AppIcons';
import axios from "axios";

import { API_URL } from '../config';
const BUS_ID = 6;

export default function DriverLogin({ route }) {
    const navigation = useNavigation();
    const {driverName} = route.params;
    // State
    const [isTripActive, setIsTripActive] = useState(false);
    const trackingRef = useRef(null);

    // --------------------------------
    //   Core Logic (Kept as is, cleaned up)
    // --------------------------------

    const startTracking = () => {
        if (trackingRef.current) return;

        trackingRef.current = setInterval(async () => {
            try {
                Geolocation.getCurrentPosition(
                    async pos => {
                        const res = await axios.post(
                            `${API_URL}/driver/location`,
                            {
                                bus_id: BUS_ID,
                                latitude: pos.coords.latitude,
                                longitude: pos.coords.longitude,
                            }
                        );

                        // Auto-end trip handling
                        if (res.data?.autoEnded) {
                            stopTracking();
                            setIsTripActive(false);
                            Alert.alert(
                                "Trip Completed",
                                "Trip automatically ended at final stop"
                            );
                        }
                    },
                    err => console.log("GPS error", err),
                    { enableHighAccuracy: true, timeout: 15000 }
                );
            } catch (err) {
                console.log("Location send failed", err.message);
            }
        }, 5000); // Send location every 5 seconds
    };

    const stopTracking = () => {
        if (trackingRef.current) {
            clearInterval(trackingRef.current);
            trackingRef.current = null;
        }
    };

    const handleStartTrip = async () => {
        try {
            Geolocation.getCurrentPosition(async pos => {
                const res = await axios.post(
                    `${API_URL}/driver/start-trip`,
                    {
                        busId: BUS_ID,
                        latitude: pos.coords.latitude,
                        longitude: pos.coords.longitude,
                    } 
                );

                if (!res.data.success) {
                    Alert.alert("Cannot start trip", res.data.message);
                    return;
                }

                setIsTripActive(true);
                startTracking();
                Alert.alert("Success", "Trip started! Tracking is active.");
            });
        } catch (err) {
            Alert.alert("Error", "Unable to start trip. Check GPS connection.");
        }
    };

    const handleEndTrip = async () => {
        try {
            await axios.post(`${API_URL}/driver/end-trip`, {
                busId: BUS_ID,
            });

            stopTracking();
            setIsTripActive(false);
            Alert.alert("Trip Ended", "Good job! See you next trip.");
        } catch {
            Alert.alert("Error", "Could not end trip. Please try again.");
        }
    };

    // const handleCancelTrip = () => {
    //     // Logic for the Cancel button you added
    //     Alert.alert(
    //         "Cancel Trip",
    //         "Are you sure you want to cancel this assignment?",
    //         [
    //             { text: "No", style: "cancel" },
    //             {
    //                 text: "Yes, Cancel",
    //                 style: 'destructive',
    //                 onPress: async () => {
    //                     // Assuming you have a cancel endpoint, otherwise just local reset
    //                     // await axios.post(`${API_URL}/driver/cancel-trip`, { busId: BUS_ID });
                        
    //                     stopTracking();
    //                     setIsTripActive(false);
    //                     Alert.alert("Cancelled", "The trip has been cancelled.");
    //                 }
    //             }
    //         ]
    //     );
    // };

    // --------------------------------
    //   Main Handler
    // --------------------------------

    const handleMainAction = () => {
        if (isTripActive) {
            // END TRIP
            Alert.alert(
                "End Trip",
                "Are you sure you want to end the current trip?",
                [
                    { text: "Cancel", style: "cancel" },
                    { text: "End Trip", onPress: handleEndTrip }
                ]
            );
        } else {
            // START TRIP
            Alert.alert(
                "Start Trip",
                "Route: Balarampur to Purulia\n\nReady to start?",
                [
                    { text: "Cancel", style: "cancel" },
                    { text: "Start Now", onPress: handleStartTrip }
                ]
            );
        }
    };

    // --------------------------------
    //   UI Variables
    // --------------------------------
    const routeName = "Balarampur to Purulia";
    const buttonText = isTripActive ? 'END TRIP' : 'START TRIP';
    // Green for start, Red/Orange for end
    const buttonColors = isTripActive
        ? ['#F97316', '#EA580C'] // Orange Gradient
        : ['#10B981', '#059669']; // Green Gradient

    const statusCardBg = isTripActive ? '#ECFDF5' : '#F8FAFC'; // Light Green vs Light Gray
    const statusBorder = isTripActive ? '#10B981' : '#CBD5E1';
    const statusTextColor = isTripActive ? '#065F46' : '#64748B';

    return (
        <SafeAreaView style={styles.safeArea} edges={['top']}>
            <StatusBar barStyle="dark-content" backgroundColor="#F1F5F9" />

            {/* Header */}
            <View style={styles.header}>
                <View>
                    <Text style={styles.brandText}>Gramin Bus</Text>
                    <Text style={styles.subText}>Driver Partner</Text>
                </View>
                <TouchableOpacity style={styles.profileBtn} onPress={() => navigation.navigate('DriverLogin')}>
                    {/* <Icon name="logout" size={24} color="#333" /> */}
                    <LogOut size={24} color="#333" />
                </TouchableOpacity>
            </View>

            <View style={styles.contentContainer}>


                {/* Main Status Card */}
                <View style={[styles.statusCard, { backgroundColor: statusCardBg, borderColor: statusBorder }]}>
                                    <Text style={styles.driverName}>Welcome, {driverName}</Text>

                    <View style={styles.statusHeader}>
                        <View style={[styles.iconWrapper, { backgroundColor: isTripActive ? '#D1FAE5' : '#E2E8F0' }]}>
                            {/* <Icon name={isTripActive ? "directions-bus" : "bus-alert"} size={32} color={isTripActive ? "#059669" : "#64748B"} /> */}
                            <Bus size={32} color={isTripActive ? "#059669" : "#64748B"} />
                        </View>
                        {isTripActive && (
                            <View style={styles.liveDotContainer}>
                                <View style={styles.liveDot} />
                                <Text style={styles.liveText}>LIVE</Text>
                            </View>
                        )}
                    </View>

                    <Text style={styles.statusLabel}>
                        {isTripActive ? "Current Trip:" : "Next Assignment:"}
                    </Text>
                    <Text style={[styles.routeName, { color: isTripActive ? "#047857" : "#334155" }]}>
                        {routeName}
                    </Text>

                    {/* Additional Info */}
                    <View style={styles.infoRow}>
                        {/* <Icon name="schedule" size={16} color="#94A3B8" /> */}
                        <Clock size={16} color="#94A3B8" />
                        <Text style={styles.infoText}>
                            {isTripActive ? "Tracking Active" : "Waiting to start"}
                        </Text>
                    </View>
                </View>

                {/* Spacer to push buttons down */}
                <View style={{ flex: 1 }} />

                {/* Action Buttons */}
                <View style={styles.buttonContainer}>

                    {/* Main Action Button */}
                    <TouchableOpacity
                        style={styles.mainButton}
                        onPress={handleMainAction}
                        activeOpacity={0.9}
                    >
                        <LinearGradient
                            colors={buttonColors}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.gradientStyle}
                        >
                            {/* <Icon name={isTripActive ? "stop-circle" : "play-circle-filled"} size={24} color="#fff" /> */}
                            {isTripActive
                                ? <StopCircle size={24} color="#fff" />
                                : <PlayCircle size={24} color="#fff" />
                            }
                            <Text style={styles.buttonText}>{buttonText}</Text>
                        </LinearGradient>
                    </TouchableOpacity>

                    {/* Cancel Button (Only visible if not active, or always visible?) */}
                    {/* Assuming Cancel is needed if trip hasn't started or to abort active trip */}
                    {/* <TouchableOpacity
                        style={styles.cancelButton}
                        onPress={handleCancelTrip}
                        activeOpacity={0.7}
                    >
                        <Icon name="cancel" size={20} color="#EF4444" />
                        <Text style={styles.cancelButtonText}>CANCEL TRIP</Text>
                    </TouchableOpacity> */}

                </View>

            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#F1F5F9',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingTop: 10,
        paddingBottom: 20,
    },
    brandText: {
        fontSize: 24,
        fontWeight: '800',
        color: '#1E293B',
    },
    subText: {
        fontSize: 14,
        color: '#64748B',
    },
    profileBtn: {
        backgroundColor: '#fff',
        padding: 8,
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
        elevation: 3,
    },
    contentContainer: {
        flex: 1,
        paddingHorizontal: 20,
        paddingVertical: 10,
    },
    
    // Status Card
    statusCard: {
        borderRadius: 24,
        padding: 25,
        borderWidth: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.05,
        shadowRadius: 15,
        elevation: 5,
        marginTop: 10,
    },
    statusHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    iconWrapper: {
        width: 60,
        height: 60,
        borderRadius: 30,
        justifyContent: 'center',
        alignItems: 'center',
    },
    liveDotContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#D1FAE5'
    },
    liveDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#10B981',
        marginRight: 6,
    },
    liveText: {
        fontSize: 10,
        fontWeight: 'bold',
        color: '#10B981',
        letterSpacing: 1,
    },
    statusLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#94A3B8',
        marginBottom: 5,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    routeName: {
        fontSize: 26,
        fontWeight: 'bold',
        color: '#1E293B',
        marginBottom: 20,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.03)',
        paddingVertical: 10,
        paddingHorizontal: 15,
        borderRadius: 12,
        alignSelf: 'flex-start',
    },
    infoText: {
        fontSize: 13,
        color: '#64748B',
        marginLeft: 8,
        fontWeight: '500',
    },

    // Buttons
    buttonContainer: {
        width: '100%',
        paddingBottom: 30,
        marginTop: 20,
    },
    mainButton: {
        width: '100%',
        height: 70,
        borderRadius: 20,
        overflow: 'hidden',
        marginBottom: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.15,
        shadowRadius: 10,
        elevation: 6,
    },
    gradientStyle: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
    },
    buttonText: {
        color: '#fff',
        fontSize: 20,
        fontWeight: 'bold',
        letterSpacing: 1.5,
        marginLeft: 10,
    },
    cancelButton: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 15,
        backgroundColor: '#fff',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#FEE2E2',
    },
    cancelButtonText: {
        color: '#EF4444',
        fontSize: 16,
        fontWeight: 'bold',
        marginLeft: 8,
    },
    driverName: {
        fontSize: 22,
        fontWeight: '700',
        color: '#1E293B',
        marginBottom: 20,
    },
});