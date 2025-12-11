import React, { useState, useEffect } from 'react';
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
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAppDispatch } from '../../store/hooks';
import { register } from '../../store/slices/authSlice';
import { authAPI } from '../../api/auth';
import CustomDatePicker from '../../components/CustomDatePicker';

export default function RegisterScreen() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { token } = useLocalSearchParams<{ token: string }>();

  const [inviteData, setInviteData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    verifyInviteToken();
  }, [token]);

  const verifyInviteToken = async () => {
    if (!token) {
      setErrorMessage('Invalid invitation link');
      setShowErrorModal(true);
      setTimeout(() => {
        router.replace('/(auth)/login');
      }, 2000);
      return;
    }

    try {
      const data = await authAPI.verifyInvite(token);
      setInviteData(data);
      setName(data.employee?.name || '');
      setLoading(false);
    } catch (error: any) {
      setErrorMessage(error.response?.data?.message || 'This invitation link is invalid or expired');
      setShowErrorModal(true);
      setTimeout(() => {
        router.replace('/(auth)/login');
      }, 2000);
    }
  };

  const handleRegister = async () => {
    // Validation
    if (!name.trim()) {
      setErrorMessage('Please enter your name');
      setShowErrorModal(true);
      return;
    }

    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters');
      setShowErrorModal(true);
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match');
      setShowErrorModal(true);
      return;
    }

    if (!acceptedTerms) {
      setErrorMessage('Please accept the terms and conditions');
      setShowErrorModal(true);
      return;
    }

    try {
      setSubmitting(true);
      await dispatch(register({ token: token as string, password, name })).unwrap();
      setSuccessMessage('Registration complete! You can now log in.');
      setShowSuccessModal(true);
    } catch (error: any) {
      setErrorMessage(error || 'Registration failed. Please try again.');
      setShowErrorModal(true);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <SafeAreaView style={styles.safeArea} edges={['top']}>
          <LinearGradient
            colors={['#F97316', '#EF4444']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.header}
          >
            <View style={styles.headerContent}>
              <Text style={styles.title}>Complete Registration</Text>
            </View>
          </LinearGradient>
        </SafeAreaView>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#F97316" />
          <Text style={styles.loadingText}>Verifying invitation...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <LinearGradient
          colors={['#F97316', '#EF4444']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.header}
        >
          <View style={styles.headerContent}>
            <Text style={styles.title}>Complete Registration</Text>
            <Text style={styles.subtitle}>Create your account to get started</Text>
          </View>
        </LinearGradient>
      </SafeAreaView>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >

          {/* Invitation Details */}
          {inviteData && (
            <View style={styles.inviteCard}>
              <Text style={styles.inviteLabel}>You've been invited to join</Text>
              <Text style={styles.organizationName}>
                {inviteData.organization?.name || 'Organization'}
              </Text>
              <View style={styles.inviteDetails}>
                <View style={styles.inviteRow}>
                  <Text style={styles.inviteKey}>Email:</Text>
                  <Text style={styles.inviteValue}>{inviteData.employee?.email}</Text>
                </View>
                <View style={styles.inviteRow}>
                  <Text style={styles.inviteKey}>Department:</Text>
                  <Text style={styles.inviteValue}>
                    {inviteData.employee?.department?.name || 'N/A'}
                  </Text>
                </View>
                <View style={styles.inviteRow}>
                  <Text style={styles.inviteKey}>Designation:</Text>
                  <Text style={styles.inviteValue}>
                    {inviteData.employee?.designation || 'N/A'}
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* Form */}
          <View style={styles.form}>
            {/* Name Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Full Name</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="person-outline" size={20} color="#9CA3AF" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Enter your full name"
                  placeholderTextColor="#6B7280"
                  value={name}
                  onChangeText={setName}
                  autoCapitalize="words"
                />
              </View>
            </View>

            {/* Password Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Password</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="lock-closed-outline" size={20} color="#9CA3AF" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Create a password (min 6 characters)"
                  placeholderTextColor="#6B7280"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  autoCapitalize="none"
                />
              </View>
            </View>

            {/* Confirm Password Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Confirm Password</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="lock-closed-outline" size={20} color="#9CA3AF" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Re-enter your password"
                  placeholderTextColor="#6B7280"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry
                  autoCapitalize="none"
                />
              </View>
            </View>

            {/* Date of Birth Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Date of Birth (Optional)</Text>
              <TouchableOpacity
                style={styles.inputWrapper}
                onPress={() => setShowDatePicker(true)}
                activeOpacity={0.7}
              >
                <Ionicons name="calendar-outline" size={20} color="#9CA3AF" style={styles.inputIcon} />
                <View style={styles.selectInputTextContainer}>
                  <Text style={dateOfBirth ? styles.selectInputText : styles.selectPlaceholderText}>
                    {dateOfBirth
                      ? dateOfBirth.toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })
                      : 'Select your date of birth'}
                  </Text>
                </View>
              </TouchableOpacity>
            </View>

          {/* Date Picker Modal */}
          <CustomDatePicker
            visible={showDatePicker}
            initialDate={dateOfBirth || new Date(2000, 0, 1)}
            onClose={() => setShowDatePicker(false)}
            onConfirm={(selectedDate) => {
              setDateOfBirth(selectedDate);
            }}
            maximumDate={new Date()}
            minimumDate={new Date(1950, 0, 1)}
          />

            {/* Terms Checkbox */}
            <TouchableOpacity
              style={styles.checkboxContainer}
              onPress={() => setAcceptedTerms(!acceptedTerms)}
              activeOpacity={0.7}
            >
              <View style={[styles.checkbox, acceptedTerms && styles.checkboxChecked]}>
                {acceptedTerms && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
              </View>
              <Text style={styles.checkboxLabel}>
                I accept the <Text style={styles.linkText}>Terms and Conditions</Text>
              </Text>
            </TouchableOpacity>

            {/* Register Button */}
            <TouchableOpacity
              style={[styles.registerButtonContainer, submitting && styles.buttonDisabled]}
              onPress={handleRegister}
              disabled={submitting}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#EF4444', '#F97316']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.registerButton}
              >
                {submitting ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.registerButtonText}>Complete Registration</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>

            {/* Login Link */}
            <View style={styles.loginLinkContainer}>
              <Text style={styles.loginLinkText}>Already have an account? </Text>
              <TouchableOpacity onPress={() => router.replace('/(auth)/login')} activeOpacity={0.7}>
                <Text style={styles.loginLink}>Log in</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Error Modal */}
      <Modal
        visible={showErrorModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowErrorModal(false)}
      >
        <TouchableOpacity
          style={styles.errorModalOverlay}
          activeOpacity={1}
          onPress={() => setShowErrorModal(false)}
        >
          <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
            <View style={styles.errorModalContent}>
              <View style={styles.modalIconContainer}>
                <Ionicons name="alert-circle" size={48} color="#EF4444" />
              </View>
              <Text style={styles.errorModalTitle}>Error</Text>
              <Text style={styles.errorModalMessage}>{errorMessage}</Text>
              <TouchableOpacity
                style={styles.errorModalButton}
                onPress={() => setShowErrorModal(false)}
              >
                <LinearGradient
                  colors={['#EF4444', '#F97316']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.errorModalButtonGradient}
                >
                  <Text style={styles.errorModalButtonText}>OK</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Success Modal */}
      <Modal
        visible={showSuccessModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          setShowSuccessModal(false);
          router.replace('/(auth)/login');
        }}
      >
        <TouchableOpacity
          style={styles.errorModalOverlay}
          activeOpacity={1}
          onPress={() => {
            setShowSuccessModal(false);
            router.replace('/(auth)/login');
          }}
        >
          <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
            <View style={styles.errorModalContent}>
              <View style={styles.modalIconContainer}>
                <Ionicons name="checkmark-circle" size={48} color="#10B981" />
              </View>
              <Text style={styles.errorModalTitle}>Success</Text>
              <Text style={styles.errorModalMessage}>{successMessage}</Text>
              <TouchableOpacity
                style={styles.errorModalButton}
                onPress={() => {
                  setShowSuccessModal(false);
                  router.replace('/(auth)/login');
                }}
              >
                <LinearGradient
                  colors={['#10B981', '#059669']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.errorModalButtonGradient}
                >
                  <Text style={styles.errorModalButtonText}>OK</Text>
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
  safeArea: {
    flex: 0,
  },
  header: {
    width: '100%',
    paddingBottom: 32,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    overflow: 'hidden',
  },
  headerContent: {
    paddingTop: 16,
    paddingBottom: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 32,
    fontFamily: 'Sora_700Bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: 'Sora_400Regular',
    color: '#FFFFFF',
    opacity: 0.9,
    textAlign: 'center',
  },
  keyboardView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000000',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    fontFamily: 'Sora_400Regular',
    color: '#9CA3AF',
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
  },
  inviteCard: {
    marginBottom: 24,
    padding: 16,
    backgroundColor: '#1F1F1F',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2C2C2C',
  },
  inviteLabel: {
    fontSize: 12,
    fontFamily: 'Sora_400Regular',
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  organizationName: {
    fontSize: 20,
    fontFamily: 'Sora_700Bold',
    color: '#3B82F6',
    marginTop: 4,
  },
  inviteDetails: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#2C2C2C',
  },
  inviteRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  inviteKey: {
    fontSize: 14,
    fontFamily: 'Sora_400Regular',
    color: '#9CA3AF',
  },
  inviteValue: {
    fontSize: 14,
    fontFamily: 'Sora_600SemiBold',
    color: '#FFFFFF',
  },
  form: {
    marginBottom: 24,
  },
  inputGroup: {
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
  selectInputTextContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingVertical: 14,
  },
  dateText: {
    fontSize: 16,
    fontFamily: 'Sora_400Regular',
    color: '#FFFFFF',
  },
  selectInputText: {
    fontSize: 16,
    fontFamily: 'Sora_400Regular',
    color: '#FFFFFF',
  },
  datePlaceholder: {
    fontSize: 16,
    fontFamily: 'Sora_400Regular',
    color: '#6B7280',
  },
  selectPlaceholderText: {
    fontSize: 16,
    fontFamily: 'Sora_400Regular',
    color: '#6B7280',
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: '#2C2C2C',
    borderRadius: 4,
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1F1F1F',
  },
  checkboxChecked: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  checkboxLabel: {
    fontSize: 14,
    fontFamily: 'Sora_400Regular',
    color: '#9CA3AF',
    flex: 1,
  },
  linkText: {
    color: '#3B82F6',
    fontFamily: 'Sora_600SemiBold',
  },
  registerButtonContainer: {
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 8,
  },
  registerButton: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  registerButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Sora_600SemiBold',
  },
  loginLinkContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 16,
  },
  loginLinkText: {
    fontSize: 14,
    fontFamily: 'Sora_400Regular',
    color: '#9CA3AF',
  },
  loginLink: {
    fontSize: 14,
    fontFamily: 'Sora_600SemiBold',
    color: '#3B82F6',
  },
  modalIconContainer: {
    marginBottom: 16,
  },
  errorModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  errorModalContent: {
    backgroundColor: '#1F1F1F',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 320,
    alignItems: 'center',
  },
  errorModalTitle: {
    fontSize: 20,
    fontFamily: 'Sora_700Bold',
    color: '#FFFFFF',
    marginBottom: 12,
    textAlign: 'center',
  },
  errorModalMessage: {
    fontSize: 14,
    fontFamily: 'Sora_400Regular',
    color: '#9CA3AF',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  errorModalButton: {
    width: '100%',
    borderRadius: 8,
    overflow: 'hidden',
  },
  errorModalButtonGradient: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorModalButtonText: {
    fontSize: 14,
    fontFamily: 'Sora_600SemiBold',
    color: '#FFFFFF',
  },
});
