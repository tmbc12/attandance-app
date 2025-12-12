import React, { useState } from 'react';
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
  Image,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAppDispatch } from '../../store/hooks';
import { registerWithCode } from '../../store/slices/authSlice';
import { authAPI } from '../../api/auth';
import * as ImagePicker from 'expo-image-picker';
import CustomDatePicker from '../../components/CustomDatePicker';

export default function ManualRegisterScreen() {
  const router = useRouter();
  const dispatch = useAppDispatch();

  // Form states
  const [inviteCode, setInviteCode] = useState('');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender] = useState('');
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  // UI states
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showGenderModal, setShowGenderModal] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const genderOptions = ['Male', 'Female', 'Other', 'Prefer not to say'];

  const handleVerifyCode = async () => {
    console.log('📱 handleVerifyCode called with code:', inviteCode);
    
    if (!inviteCode.trim()) {
      setErrorMessage('Please enter the invitation code');
      setShowErrorModal(true);
      return;
    }

    try {
      setLoading(true);
      console.log('📱 Calling authAPI.verifyInviteCode...');
      const data = await authAPI.verifyInviteCode(inviteCode);
      console.log('📱 Received data:', data);
      setEmail(data.employee?.email || '');
      setName(data.employee?.name || '');
      setSuccessMessage('Invitation code verified! Please complete your profile.');
      setShowSuccessModal(true);
    } catch (error: any) {
      console.log('📱 Error in handleVerifyCode:', error);
      setErrorMessage(error.response?.data?.message || 'This invitation code is invalid or expired');
      setShowErrorModal(true);
    } finally {
      setLoading(false);
    }
  };

  const handleImagePicker = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (permissionResult.granted === false) {
      setErrorMessage('Permission to access camera roll is required!');
      setShowErrorModal(true);
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      setProfileImage(result.assets[0].uri);
    }
  };

  const handleRegister = async () => {
    // Validation
    if (!inviteCode.trim()) {
      setErrorMessage('Please enter the invitation code');
      setShowErrorModal(true);
      return;
    }

    if (!name.trim()) {
      setErrorMessage('Please enter your name');
      setShowErrorModal(true);
      return;
    }

    if (!email.trim()) {
      setErrorMessage('Please enter your email');
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

    if (!dateOfBirth) {
      setErrorMessage('Please select your date of birth');
      setShowErrorModal(true);
      return;
    }

    if (!gender) {
      setErrorMessage('Please select your gender');
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
      await dispatch(registerWithCode({
        inviteCode,
        email,
        name,
        password,
        dateOfBirth,
        gender,
        profileImage: profileImage || undefined,
      })).unwrap();
      
      setSuccessMessage('Registration complete! You can now log in.');
      setShowSuccessModal(true);
    } catch (error: any) {
      setErrorMessage(error || 'Registration failed. Please try again.');
      setShowErrorModal(true);
    } finally {
      setSubmitting(false);
    }
  };

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
              <View style={styles.logoTitleContainer}>
                <Text style={styles.title}>Join</Text>
                <Image
                  source={require('../../../assets/teambo-logo.png')}
                  style={styles.logo}
                  resizeMode="contain"
                />
              </View>
              <Text style={styles.subtitle}>Enter your invitation code to get started</Text>
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

          {/* Form */}
          <View style={styles.form}>
            {/* Invitation Code */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Invitation Code *</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="key-outline" size={20} color="#9CA3AF" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Enter your 8-character invitation code"
                  placeholderTextColor="#6B7280"
                  value={inviteCode}
                  onChangeText={setInviteCode}
                  autoCapitalize="characters"
                  maxLength={8}
                />
              </View>
              <TouchableOpacity
                style={styles.verifyButtonContainer}
                onPress={handleVerifyCode}
                disabled={loading}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={['#10B981', '#059669']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.verifyButton}
                >
                  {loading ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Text style={styles.verifyButtonText}>Verify Code</Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>

            {/* Profile Image */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Profile Photo</Text>
              <TouchableOpacity style={styles.imagePicker} onPress={handleImagePicker} activeOpacity={0.7}>
                {profileImage ? (
                  <Image source={{ uri: profileImage }} style={styles.profileImage} />
                ) : (
                  <View style={styles.placeholderImage}>
                    <Ionicons name="camera-outline" size={32} color="#9CA3AF" />
                    <Text style={styles.placeholderLabel}>Add Photo</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>

            {/* Name Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Full Name *</Text>
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

            {/* Email Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email *</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="mail-outline" size={20} color="#9CA3AF" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Enter your email"
                  placeholderTextColor="#6B7280"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
            </View>

            {/* Password Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Password *</Text>
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
              <Text style={styles.label}>Confirm Password *</Text>
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

            {/* Date of Birth */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Date of Birth *</Text>
              <TouchableOpacity
                style={styles.inputWrapper}
                onPress={() => setShowDatePicker(true)}
                activeOpacity={0.7}
              >
                <Ionicons name="calendar-outline" size={20} color="#9CA3AF" style={styles.inputIcon} />
                <View style={styles.selectInputTextContainer}>
                  <Text style={dateOfBirth ? styles.selectInputText : styles.selectPlaceholderText}>
                    {dateOfBirth || 'Select your date of birth'}
                  </Text>
                </View>
              </TouchableOpacity>
            </View>

            {/* Gender */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Gender *</Text>
              <TouchableOpacity
                style={styles.inputWrapper}
                onPress={() => setShowGenderModal(true)}
                activeOpacity={0.7}
              >
                <Ionicons name="person-outline" size={20} color="#9CA3AF" style={styles.inputIcon} />
                <View style={styles.selectInputTextContainer}>
                  <Text style={gender ? styles.selectInputText : styles.selectPlaceholderText}>
                    {gender || 'Select your gender'}
                  </Text>
                </View>
              </TouchableOpacity>
            </View>

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

      {/* Gender Modal */}
      <Modal
        visible={showGenderModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowGenderModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowGenderModal(false)}
        >
          <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Select Gender</Text>
              {genderOptions.map((option) => (
                <TouchableOpacity
                  key={option}
                  style={styles.modalOption}
                  onPress={() => {
                    setGender(option);
                    setShowGenderModal(false);
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.modalOptionText}>{option}</Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => setShowGenderModal(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

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
          if (successMessage.includes('Registration complete')) {
            router.replace('/(auth)/login');
          }
        }}
      >
        <TouchableOpacity
          style={styles.errorModalOverlay}
          activeOpacity={1}
          onPress={() => {
            setShowSuccessModal(false);
            if (successMessage.includes('Registration complete')) {
              router.replace('/(auth)/login');
            }
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
                  if (successMessage.includes('Registration complete')) {
                    router.replace('/(auth)/login');
                  }
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

      {/* Date Picker */}
      <CustomDatePicker
        visible={showDatePicker}
        initialDate={
          dateOfBirth
            ? (() => {
                try {
                  return new Date(dateOfBirth);
                } catch {
                  return new Date(2000, 0, 1);
                }
              })()
            : new Date(2000, 0, 1)
        }
        onClose={() => setShowDatePicker(false)}
        onConfirm={(selectedDate) => {
          const formattedDate = selectedDate.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          });
          setDateOfBirth(formattedDate);
        }}
        maximumDate={new Date()}
        minimumDate={new Date(1950, 0, 1)}
      />
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
  logoTitleContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontFamily: 'Sora_700Bold',
    color: '#FFFFFF',
    marginLeft: 12,
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
  scrollContent: {
    flexGrow: 1,
    padding: 24,
  },
  logo: {
    width: 80,
    height: 40,
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
  inputText: {
    fontSize: 16,
    fontFamily: 'Sora_400Regular',
    color: '#FFFFFF',
  },
  selectInputText: {
    fontSize: 16,
    fontFamily: 'Sora_400Regular',
    color: '#FFFFFF',
  },
  placeholderText: {
    fontSize: 16,
    fontFamily: 'Sora_400Regular',
    color: '#6B7280',
  },
  selectPlaceholderText: {
    fontSize: 16,
    fontFamily: 'Sora_400Regular',
    color: '#6B7280',
  },
  verifyButtonContainer: {
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 8,
  },
  verifyButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  verifyButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'Sora_600SemiBold',
  },
  imagePicker: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#1F1F1F',
    borderWidth: 2,
    borderColor: '#2C2C2C',
    borderStyle: 'dashed',
  },
  profileImage: {
    width: 96,
    height: 96,
    borderRadius: 48,
  },
  placeholderImage: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderLabel: {
    fontSize: 12,
    fontFamily: 'Sora_400Regular',
    color: '#9CA3AF',
    marginTop: 8,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1F1F1F',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 40,
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: 'Sora_700Bold',
    color: '#FFFFFF',
    marginBottom: 20,
    textAlign: 'center',
  },
  modalOption: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2C2C2C',
  },
  modalOptionText: {
    fontSize: 16,
    fontFamily: 'Sora_400Regular',
    color: '#FFFFFF',
  },
  modalCancel: {
    padding: 16,
    marginTop: 12,
    backgroundColor: '#2C2C2C',
    borderRadius: 12,
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 16,
    fontFamily: 'Sora_600SemiBold',
    color: '#FFFFFF',
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
