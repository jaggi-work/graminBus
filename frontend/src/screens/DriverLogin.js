

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView
} from 'react-native';
// import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
// import Ionicons from "react-native-vector-icons/Ionicons";
import { ChevronLeft, Smartphone } from '../components/AppIcons';
import LinearGradient from 'react-native-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import axios from 'axios';

import { API_URL } from '../config';

export default function DriverLogin({ navigation }) {
  const [mobileNo, setMobileNo] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Function to validate mobile number and send OTP
  const handleSendOtp = async () => {
    // 1. Basic Validation
    if (!mobileNo || mobileNo.trim() === '') {
      Alert.alert('Error', 'Please enter your mobile number.');
      return;
    }

    // 2. Length Validation (assuming 10 digits)
    if (mobileNo.length !== 10) {
      Alert.alert('Invalid Number', 'Please enter a valid 10-digit mobile number.');
      return;
    }

    // 3. API Call
    try {
      setIsLoading(true); // Show loader
      
      const response = await axios.post(`${API_URL}/auth/request-otp`, { 
        mobile: mobileNo 
      });

      console.log("OTP Response:", response.data);

      // 4. Success Handling
      // Assuming you have an 'OtpScreen' to navigate to next
      // If you don't have it yet, you can comment out the navigation line
      navigation.navigate('OtpScreen', { mobile: mobileNo });
      
      Alert.alert('Success', `OTP sent to ${mobileNo}`);

    } catch (error) {
      console.error("Error sending OTP:", error);
      Alert.alert('Error', 'Failed to send OTP. Please check your connection.');
    } finally {
      setIsLoading(false); // Hide loader
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
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
            onPress={() => navigation.navigate('Root')} 
            activeOpacity={0.7}
          >
            {/* <Ionicons name="chevron-back" size={24} color="#334155" /> */}
            <ChevronLeft size={24} color="#334155" />
          </TouchableOpacity>

          {/* Logo Section */}
          <View style={styles.brandingContainer}>
            <Image source={require('../../assets/gramin-bus-logo-main.png')} style={styles.logo} />
            <Text style={styles.brandTitle}>Gramin Bus</Text>
            <Text style={styles.brandSubtitle}>Driver Partner</Text>
          </View>

          {/* Login Card */}
          <View style={styles.loginCard}>
            <Text style={styles.loginHeader}>DRIVER LOGIN</Text>

            {/* Mobile Input */}
            <View style={styles.inputContainer}>
              {/* <Icon name="cellphone" size={22} color="#059669" style={styles.inputIcon} /> */}
              <Smartphone size={22} color="#059669" style={styles.inputIcon} />
              <TextInput
                style={styles.textInput}
                placeholder="Enter Mobile Number"
                placeholderTextColor="#94A3B8"
                value={mobileNo}
                onChangeText={(text) => {
                  // Allow only numbers
                  const numericText = text.replace(/[^0-9]/g, '');
                  setMobileNo(numericText);
                }}
                keyboardType="number-pad"
                maxLength={10}
                autoCapitalize="none"
              />
            </View>

            {/* Send OTP Button */}
            <TouchableOpacity 
              onPress={handleSendOtp} 
              activeOpacity={0.9}
              disabled={isLoading} // Disable while loading
            >
              <LinearGradient
                colors={['#059669', '#047857']}
                start={{ x: 0, y: 0 }} 
                end={{ x: 1, y: 0 }}
                style={[styles.loginButton, isLoading && styles.buttonDisabled]}
              >
                {isLoading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.loginButtonText}>SEND OTP</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC', // Clean light background
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
    marginTop: 40,
  },
  logo: {
    width: 120,
    height: 120,
    resizeMode: 'contain',
    marginBottom: 15,
  },
  brandTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1e293b',
  },
  brandSubtitle: {
    fontSize: 16,
    color: '#64748b',
    marginTop: 5,
    fontWeight: '500',
  },
  loginCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 25,
    elevation: 8,
  },
  loginHeader: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 30,
    textAlign: 'center',
    letterSpacing: 1,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 16,
    paddingHorizontal: 15,
    paddingVertical: 5,
    marginBottom: 25,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  inputIcon: {
    marginRight: 12,
  },
  textInput: {
    flex: 1,
    fontSize: 17,
    color: '#334155',
    paddingVertical: 10,
    height: 50, // Fixed height
  },
  loginButton: {
    borderRadius: 16,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 5,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 1.5,
  },
});