import React, { useState, useRef, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    ActivityIndicator,
    Alert
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
// import Ionicons from "react-native-vector-icons/Ionicons";
import { ChevronLeft } from '../components/AppIcons';
import axios from 'axios';

import { API_URL } from '../config';

export default function OtpScreen({ route, navigation }) {
    // 1. Get mobile number from previous screen
    const { mobile } = route.params || { mobile: '' };

    const [otp, setOtp] = useState(['', '', '', '']); // Array to hold 4 digits
    const [isLoading, setIsLoading] = useState(false);
    const [timer, setTimer] = useState(30); // 30 second countdown
    const [canResend, setCanResend] = useState(false);

    // Refs for the 4 input boxes to handle focus switching
    const inputRefs = [
        useRef(null),
        useRef(null),
        useRef(null),
        useRef(null)
    ];

    // Countdown Timer Logic
    useEffect(() => {
        const interval = setInterval(() => {
            if (timer > 0) {
                setTimer(timer - 1);
            } else {
                setCanResend(true);
                clearInterval(interval);
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [timer]);

    // Handle typing in the boxes
    const handleOtpChange = (index, value) => {
        // Allow only numbers
        if (!/^\d*$/.test(value)) return;

        const newOtp = [...otp];
        newOtp[index] = value;
        setOtp(newOtp);

        // Auto-focus next input if value is entered
        if (value !== '' && index < 3) {
            inputRefs[index + 1].current?.focus();
        }
    };

    // Handle Backspace key
    const handleKeyPress = (index, key) => {
        if (key === 'Backspace' && otp[index] === '' && index > 0) {
            // inputRefs[index - 1].current?.focus();
            if (otp[index] === '' && index > 0) {
            const newOtp = [...otp];
            newOtp[index - 1] = ''; // Clear the previous box
            setOtp(newOtp);
            inputRefs[index - 1].current?.focus();
        }
        }
    };

    // Verify OTP API Call
    const handleVerifyOtp = async () => {
        const otpValue = otp.join('');

        // Validation: Check if all 4 boxes are filled
        if (otpValue.length !== 4) {
            Alert.alert('Invalid OTP', 'Please enter the complete 4-digit code.');
            return;
        }

        try {
            setIsLoading(true);

            const response = await axios.post(`${API_URL}/auth/verify-otp`, {
                mobile: mobile,
                otp: otpValue
            });

            console.log("Verify Response:", response.data);

            // On Success: Navigate to Driver Home
            Alert.alert('Success', 'Login Successful!');
            navigation.replace('DriverHome',{driverName: response.data.driver_name}); // Use replace so user can't go back to OTP screen

        } catch (error) {
            console.error("OTP Verification Error:", error);
            Alert.alert('Verification Failed', 'Invalid OTP or session expired.');
        } finally {
            setIsLoading(false);
        }
    };

    // Resend OTP Function
    const handleResend = async () => {
        try {
            setIsLoading(true);
            await axios.post(`${API_URL}/auth/request-otp`, { mobile: mobile });

            Alert.alert('Sent', 'A new OTP has been sent to your mobile.');

            // Reset Timer
            setTimer(30);
            setCanResend(false);
            setOtp(['', '', '', '']);
            inputRefs[0].current?.focus();

        } catch (error) {
            Alert.alert('Error', 'Could not resend OTP. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={{ flex: 1 }}
            >
                <ScrollView
                    contentContainerStyle={styles.scrollContainer}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
                    {/* Back Button */}
                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={() => navigation.goBack()}
                        activeOpacity={0.7}
                    >
                        {/* <Ionicons name="chevron-back" size={24} color="#334155" /> */}
                        <ChevronLeft size={24} color="#334155" />
                    </TouchableOpacity>

                    {/* Branding */}
                    <View style={styles.brandingContainer}>
                        <Text style={styles.brandTitle}>Verify OTP</Text>
                        <Text style={styles.brandSubtitle}>
                            Enter the 4-digit code sent to{'\n'}<Text style={styles.highlightText}>+91 {mobile}</Text>
                        </Text>
                    </View>

                    {/* OTP Input Boxes */}
                    <View style={styles.otpContainer}>
                        {otp.map((digit, index) => (
                            <TextInput
                                key={index}
                                ref={inputRefs[index]}
                                style={[
                                    styles.otpBox,
                                    digit && styles.tpBoxFilled // Add style if box has value
                                ]}
                                keyboardType="number-pad"
                                maxLength={1}
                                value={digit}
                                onChangeText={(value) => handleOtpChange(index, value)}
                                onKeyPress={({ nativeEvent: { key } }) => handleKeyPress(index, key)}
                                textAlign="center"
                                selectionColor="#059669"
                            />
                        ))}
                    </View>

                    {/* Verify Button */}
                    <TouchableOpacity
                        onPress={handleVerifyOtp}
                        activeOpacity={0.9}
                        disabled={isLoading}
                    >
                        <LinearGradient
                            colors={['#059669', '#047857']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={[styles.verifyButton, isLoading && styles.buttonDisabled]}
                        >
                            {isLoading ? (
                                <ActivityIndicator color="#fff" size="small" />
                            ) : (
                                <Text style={styles.verifyButtonText}>VERIFY & LOGIN</Text>
                            )}
                        </LinearGradient>
                    </TouchableOpacity>

                    {/* Resend OTP Section */}
                    <View style={styles.resendContainer}>
                        <Text style={styles.resendText}>Didn't receive code? </Text>

                        {canResend ? (
                            <TouchableOpacity onPress={handleResend}>
                                <Text style={styles.resendLink}>Resend Now</Text>
                            </TouchableOpacity>
                        ) : (
                            <Text style={styles.timerText}>Resend in {timer}s</Text>
                        )}
                    </View>

                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#F8FAFC',
    },
    scrollContainer: {
        flexGrow: 1,
        paddingHorizontal: 20,
        justifyContent: 'center',
        paddingBottom: 40
    },
    backButton: {
        position: 'absolute',
        top: 15,
        left: 15,
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: '#fff',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
        elevation: 2,
        zIndex: 10
    },
    brandingContainer: {
        alignItems: 'center',
        marginBottom: 40,
        marginTop: 60,
    },
    brandTitle: {
        fontSize: 28,
        fontWeight: '800',
        color: '#1e293b',
        marginBottom: 10,
    },
    brandSubtitle: {
        fontSize: 16,
        color: '#64748b',
        textAlign: 'center',
        lineHeight: 24,
    },
    highlightText: {
        color: '#059669',
        fontWeight: 'bold',
        fontSize: 16
    },

    // OTP Boxes Styling
    otpContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 40,
        marginHorizontal: 10,
    },
    otpBox: {
        width: 65,
        height: 65,
        backgroundColor: '#fff',
        borderRadius: 12,
        borderWidth: 2,
        borderColor: '#E2E8F0',
        fontSize: 28,
        fontWeight: 'bold',
        color: '#1e293b',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    otpBoxFilled: {
        borderColor: '#059669', // Green border when filled
        backgroundColor: '#ECFDF5', // Light green bg when filled
    },

    // Buttons
    verifyButton: {
        borderRadius: 16,
        height: 56,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#059669',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 10,
        elevation: 5,
        marginHorizontal: 20,
        marginBottom: 20
    },
    buttonDisabled: {
        opacity: 0.7,
    },
    verifyButtonText: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: 'bold',
        letterSpacing: 1.5,
    },

    // Resend Section
    resendContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
    },
    resendText: {
        fontSize: 14,
        color: '#64748b',
    },
    resendLink: {
        fontSize: 14,
        color: '#059669',
        fontWeight: 'bold',
        textDecorationLine: 'underline',
    },
    timerText: {
        fontSize: 14,
        color: '#94A3B8',
        fontWeight: '500',
    },
});