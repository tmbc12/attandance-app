import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAppSelector } from '../../store/hooks';
import apiClient from '../../api/client';

export default function ChangePasswordScreen() {
  const router = useRouter();
  const { user } = useAppSelector((state) => state.auth);
  
  const [otp, setOtp] = useState(['', '', '', '']);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [step, setStep] = useState<'otp' | 'password'>('otp');
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(true);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [resendTimer, setResendTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const [error, setError] = useState('');
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [resetToken, setResetToken] = useState<string | null>(null);
  
  const inputRefs = useRef<Array<TextInput | null>>([]);

  useEffect(() => {
    sendOTP();
    startResendTimer();
  }, []);

  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => {
        setResendTimer(resendTimer - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else {
      setCanResend(true);
    }
  }, [resendTimer]);

  const sendOTP = async () => {
    try {
      setIsSending(true);
      setError('');
      await apiClient.post('/api/auth/send-password-reset-otp', {
        email: user?.email,
      });
    } catch (error: any) {
      console.error('Failed to send OTP:', error);
    } finally {
      setIsSending(false);
    }
  };

  const startResendTimer = () => {
    setResendTimer(60);
    setCanResend(false);
  };

  const handleResendOTP = async () => {
    if (!canResend) return;
    await sendOTP();
    startResendTimer();
  };

  const handleOtpChange = (value: string, index: number) => {
    if (value.length > 1) {
      // Handle paste
      const pastedOtp = value.slice(0, 4).split('');
      const newOtp = [...otp];
      pastedOtp.forEach((digit, i) => {
        if (index + i < 4) {
          newOtp[index + i] = digit;
        }
      });
      setOtp(newOtp);
      // Focus on the last input or next empty one
      const nextIndex = Math.min(index + pastedOtp.length, 3);
      inputRefs.current[nextIndex]?.focus();
      return;
    }

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    setError('');

    // Auto-focus next input
    if (value && index < 3) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (key: string, index: number) => {
    if (key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerifyOTP = async () => {
    const otpString = otp.join('');
    
    if (otpString.length !== 4) {
      setError('Please enter the complete 4-digit OTP');
      return;
    }

    try {
      setIsVerifying(true);
      setError('');
      
      const response = await apiClient.post('/api/auth/verify-password-reset-otp', {
        email: user?.email,
        otp: otpString,
      });

      // Store the token from response
      if (response.data.token) {
        setResetToken(response.data.token);
      }

      // OTP verified successfully, move to password step
      setStep('password');
    } catch (error: any) {
      console.error('Failed to verify OTP:', error);
      setError(error.response?.data?.message || 'Invalid OTP. Please try again.');
      setOtp(['', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResetPassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (!resetToken) {
      setError('Token not found. Please verify OTP again.');
      return;
    }

    try {
      setIsResetting(true);
      setError('');
      
      await apiClient.post('/api/auth/reset-password', {
        token: resetToken,
        newPassword,
      });

      // Password reset successfully
      setShowSuccessModal(true);
    } catch (error: any) {
      console.error('Failed to reset password:', error);
      setError(error.response?.data?.message || 'Failed to reset password. Please try again.');
    } finally {
      setIsResetting(false);
    }
  };

  const handleSuccessContinue = () => {
    setShowSuccessModal(false);
    // Navigate to new password screen or handle password change
    // For now, just go back
    router.back();
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Header with Gradient */}
        <LinearGradient
          colors={['#F97316', '#EF4444']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.header}
        >
          <SafeAreaView style={styles.headerSafeArea} edges={['top']}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.title}>Change Password</Text>
            <Text style={styles.subtitle}>
              {step === 'otp' 
                ? 'Enter the OTP sent to your email' 
                : 'Set your new password'}
            </Text>
          </SafeAreaView>
        </LinearGradient>

        {/* OTP Section */}
        {step === 'otp' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Enter OTP</Text>
            
            {isSending ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#3B82F6" />
                <Text style={styles.loadingText}>Sending OTP to {user?.email}...</Text>
              </View>
            ) : (
              <>
                <View style={styles.infoCard}>
                  <View style={styles.emailInfo}>
                    <Ionicons name="mail-outline" size={20} color="#9CA3AF" />
                    <Text style={styles.emailText}>{user?.email}</Text>
                  </View>
                  <Text style={styles.infoText}>
                    We've sent a 4-digit OTP to your email address. Please enter it below.
                  </Text>
                </View>

                {/* OTP Input */}
                <View style={styles.otpContainer}>
                  {otp.map((digit, index) => (
                    <TextInput
                      key={index}
                      ref={(ref: TextInput | null) => { inputRefs.current[index] = ref; }}
                      style={[
                        styles.otpInput,
                        error && styles.otpInputError,
                        digit && styles.otpInputFilled,
                      ]}
                      value={digit}
                      onChangeText={(value) => handleOtpChange(value, index)}
                      onKeyPress={({ nativeEvent }) => handleKeyPress(nativeEvent.key, index)}
                      keyboardType="number-pad"
                      maxLength={1}
                      selectTextOnFocus
                      autoFocus={index === 0}
                    />
                  ))}
                </View>

                {error ? (
                  <View style={styles.errorContainer}>
                    <Ionicons name="alert-circle" size={16} color="#EF4444" />
                    <Text style={styles.errorText}>{error}</Text>
                  </View>
                ) : null}

                {/* Resend OTP */}
                <View style={styles.resendContainer}>
                  <Text style={styles.resendText}>Didn't receive the code?</Text>
                  {canResend ? (
                    <TouchableOpacity onPress={handleResendOTP} disabled={isLoading}>
                      <Text style={styles.resendButton}>Resend OTP</Text>
                    </TouchableOpacity>
                  ) : (
                    <Text style={styles.resendTimer}>Resend in {resendTimer}s</Text>
                  )}
                </View>

                {/* Verify Button */}
                <TouchableOpacity
                  style={[
                    styles.verifyButton,
                    (isVerifying || otp.join('').length !== 4) && styles.verifyButtonDisabled,
                  ]}
                  onPress={handleVerifyOTP}
                  disabled={isVerifying || otp.join('').length !== 4}
                >
                  {isVerifying ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <LinearGradient
                      colors={['#3B82F6', '#2563EB']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.verifyButtonGradient}
                    >
                      <Text style={styles.verifyButtonText}>Verify OTP</Text>
                    </LinearGradient>
                  )}
                </TouchableOpacity>
              </>
            )}
          </View>
        )}

        {/* Password Step */}
        {step === 'password' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Set New Password</Text>
            
            <View style={styles.infoCard}>
              <Text style={styles.infoText}>
                Please enter your new password. Make sure it's at least 6 characters long.
              </Text>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>New Password</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="lock-closed-outline" size={20} color="#9CA3AF" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Enter new password"
                  placeholderTextColor="#6B7280"
                  value={newPassword}
                  onChangeText={(text) => {
                    setNewPassword(text);
                    setError('');
                  }}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeIcon}
                >
                  <Ionicons
                    name={showPassword ? 'eye-outline' : 'eye-off-outline'}
                    size={20}
                    color="#9CA3AF"
                  />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Confirm Password</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="lock-closed-outline" size={20} color="#9CA3AF" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Confirm new password"
                  placeholderTextColor="#6B7280"
                  value={confirmPassword}
                  onChangeText={(text) => {
                    setConfirmPassword(text);
                    setError('');
                  }}
                  secureTextEntry={!showConfirmPassword}
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  style={styles.eyeIcon}
                >
                  <Ionicons
                    name={showConfirmPassword ? 'eye-outline' : 'eye-off-outline'}
                    size={20}
                    color="#9CA3AF"
                  />
                </TouchableOpacity>
              </View>
            </View>

            {error ? (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle" size={16} color="#EF4444" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <TouchableOpacity
              style={[
                styles.resetButton,
                (isResetting || !newPassword || !confirmPassword) && styles.resetButtonDisabled,
              ]}
              onPress={handleResetPassword}
              disabled={isResetting || !newPassword || !confirmPassword}
            >
              {isResetting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <LinearGradient
                  colors={['#3B82F6', '#2563EB']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.resetButtonGradient}
                >
                  <Text style={styles.resetButtonText}>Change Password</Text>
                </LinearGradient>
              )}
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Success Modal */}
      <Modal
        visible={showSuccessModal}
        transparent={true}
        animationType="fade"
        onRequestClose={handleSuccessContinue}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={handleSuccessContinue}
        >
          <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalContent}>
              <View style={styles.successIconContainer}>
                <Ionicons name="checkmark-circle" size={64} color="#4ADE80" />
              </View>
              <Text style={styles.modalTitle}>Password Changed Successfully</Text>
              <Text style={styles.modalMessage}>
                Your password has been changed successfully. Please use your new password for future logins.
              </Text>
              
              <TouchableOpacity
                style={styles.modalButton}
                onPress={handleSuccessContinue}
              >
                <LinearGradient
                  colors={['#3B82F6', '#2563EB']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.modalButtonGradient}
                >
                  <Text style={styles.modalButtonText}>Continue</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    width: '100%',
    paddingBottom: 32,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    overflow: 'hidden',
  },
  headerSafeArea: {
    paddingTop: 16,
    paddingBottom: 24,
    paddingHorizontal: 16,
  },
  backButton: {
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontFamily: 'Sora_700Bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: 'Sora_400Regular',
    color: '#FFFFFF',
    opacity: 0.9,
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontFamily: 'Sora_600SemiBold',
    color: '#FFFFFF',
    marginBottom: 12,
    textAlign: 'center',
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    fontFamily: 'Sora_400Regular',
    color: '#9CA3AF',
  },
  infoCard: {
    backgroundColor: '#1F1F1F',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  emailInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  emailText: {
    fontSize: 14,
    fontFamily: 'Sora_600SemiBold',
    color: '#FFFFFF',
    marginLeft: 8,
  },
  infoText: {
    fontSize: 13,
    fontFamily: 'Sora_400Regular',
    color: '#9CA3AF',
    lineHeight: 18,
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    gap: 12,
  },
  otpInput: {
    flex: 1,
    height: 60,
    backgroundColor: '#1F1F1F',
    borderWidth: 2,
    borderColor: '#2C2C2C',
    borderRadius: 12,
    textAlign: 'center',
    fontSize: 24,
    fontFamily: 'Sora_700Bold',
    color: '#FFFFFF',
  },
  otpInputFilled: {
    borderColor: '#3B82F6',
    backgroundColor: '#1E3A5F',
  },
  otpInputError: {
    borderColor: '#EF4444',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2C1F1F',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 13,
    fontFamily: 'Sora_400Regular',
    color: '#EF4444',
    marginLeft: 8,
    flex: 1,
  },
  resendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    gap: 8,
  },
  resendText: {
    fontSize: 14,
    fontFamily: 'Sora_400Regular',
    color: '#9CA3AF',
  },
  resendButton: {
    fontSize: 14,
    fontFamily: 'Sora_600SemiBold',
    color: '#3B82F6',
  },
  resendTimer: {
    fontSize: 14,
    fontFamily: 'Sora_400Regular',
    color: '#6B7280',
  },
  verifyButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 8,
  },
  verifyButtonDisabled: {
    opacity: 0.5,
  },
  verifyButtonGradient: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  verifyButtonText: {
    fontSize: 16,
    fontFamily: 'Sora_600SemiBold',
    color: '#FFFFFF',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContent: {
    backgroundColor: '#1F1F1F',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 320,
    alignItems: 'center',
  },
  successIconContainer: {
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: 'Sora_700Bold',
    color: '#FFFFFF',
    marginBottom: 12,
    textAlign: 'center',
  },
  modalMessage: {
    fontSize: 14,
    fontFamily: 'Sora_400Regular',
    color: '#9CA3AF',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  modalButton: {
    width: '100%',
    borderRadius: 8,
    overflow: 'hidden',
  },
  modalButtonGradient: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalButtonText: {
    fontSize: 14,
    fontFamily: 'Sora_600SemiBold',
    color: '#FFFFFF',
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontFamily: 'Sora_600SemiBold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1F1F1F',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2C2C2C',
    paddingHorizontal: 16,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Sora_400Regular',
    color: '#FFFFFF',
    paddingVertical: 14,
  },
  eyeIcon: {
    padding: 4,
  },
  resetButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 8,
  },
  resetButtonDisabled: {
    opacity: 0.5,
  },
  resetButtonGradient: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resetButtonText: {
    fontSize: 16,
    fontFamily: 'Sora_600SemiBold',
    color: '#FFFFFF',
  },
});


