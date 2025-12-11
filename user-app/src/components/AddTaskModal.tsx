import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAppDispatch } from '../store/hooks';
import { createTask } from '../store/slices/tasksSlice';
import { showToast } from '../utils/toast';

interface AddTaskModalProps {
  visible: boolean;
  onClose: () => void;
}

export const AddTaskModal: React.FC<AddTaskModalProps> = ({ visible, onClose }) => {
  const dispatch = useAppDispatch();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('low');
  const [tags, setTags] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const handleSave = async () => {
    if (!title.trim()) {
      showToast.warning('Missing Title', 'Please enter a task title');
      return;
    }

    setIsSubmitting(true);
    try {
      const tagArray = tags.split(',').map(t => t.trim()).filter(t => t);

      await dispatch(createTask({
        title: title.trim(),
        description: description.trim() || undefined,
        priority,
        tags: tagArray,
      })).unwrap();

      // Reset form
      setTitle('');
      setDescription('');
      setPriority('low');
      setTags('');
      setFocusedField(null);

      showToast.success('Task Created', 'Your task has been added');
      onClose();
    } catch (error: any) {
      showToast.error('Failed to Create Task', error || 'Please try again');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getPriorityDotColor = (p: string) => {
    switch (p) {
      case 'urgent': return '#EF4444'; // Red
      case 'high': return '#F97316'; // Orange
      case 'medium': return '#3B82F6'; // Blue
      case 'low': return '#000000'; // Black
      default: return '#000000';
    }
  };

  const handleClose = () => {
    setFocusedField(null);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.overlay}>
          <View style={styles.modal}>
            {/* Hamburger Icon */}
            <View style={styles.hamburgerContainer}>
              <View style={styles.hamburger}>
                <View style={styles.hamburgerLine} />
                <View style={styles.hamburgerLine} />
                <View style={styles.hamburgerLine} />
              </View>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
              {/* Header */}
              <View style={styles.header}>
                <Text style={styles.modalTitle}>Add New task</Text>
                <TouchableOpacity onPress={handleClose} style={styles.closeButtonContainer}>
                  <LinearGradient
                    colors={['#EF4444', '#F97316']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.closeButton}
                  >
                    <Ionicons name="close" size={20} color="#FFFFFF" />
                  </LinearGradient>
                </TouchableOpacity>
              </View>

              {/* Title Input */}
              <Text style={styles.label}>Title*</Text>
              <View style={[
                styles.inputContainer,
                focusedField === 'title' && styles.inputContainerFocused
              ]}>
                {focusedField === 'title' && (
                  <LinearGradient
                    colors={['#F97316', '#FBBF24']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.inputBorder}
                  />
                )}
                <TextInput
                  style={styles.input}
                  value={title}
                  onChangeText={setTitle}
                  placeholder="Attendance app"
                  placeholderTextColor="#9CA3AF"
                  maxLength={100}
                  onFocus={() => setFocusedField('title')}
                  onBlur={() => setFocusedField(null)}
                />
              </View>

              {/* Description Input */}
              <Text style={styles.label}>Description</Text>
              <View style={[
                styles.inputContainer,
                styles.textAreaContainer,
                focusedField === 'description' && styles.inputContainerFocused
              ]}>
                {focusedField === 'description' && (
                  <LinearGradient
                    colors={['#F97316', '#FBBF24']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.inputBorder}
                  />
                )}
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={description}
                  onChangeText={setDescription}
                  placeholder="Mark your attendance here from now on"
                  placeholderTextColor="#9CA3AF"
                  multiline
                  numberOfLines={3}
                  maxLength={300}
                  onFocus={() => setFocusedField('description')}
                  onBlur={() => setFocusedField(null)}
                />
              </View>

              {/* Priority Selector */}
              <Text style={styles.label}>Priority</Text>
              <View style={styles.priorityRow}>
                {(['low', 'medium', 'high', 'urgent'] as const).map(p => (
                  <TouchableOpacity
                    key={p}
                    onPress={() => setPriority(p)}
                    style={styles.priorityButtonContainer}
                  >
                    <View style={[
                      styles.priorityButton,
                      priority === p && styles.priorityButtonActive
                    ]}>
                      {priority === p && (
                        <LinearGradient
                          colors={['#F97316', '#FBBF24']}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 0 }}
                          style={styles.priorityButtonBorder}
                        />
                      )}
                      <View style={[styles.priorityDot, { backgroundColor: getPriorityDotColor(p) }]} />
                      <Text style={styles.priorityButtonText}>
                        {p.charAt(0).toUpperCase() + p.slice(1)}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Tags Input */}
              {/* <Text style={styles.label}>Tags (comma separated)</Text>
              <View style={[
                styles.inputContainer,
                focusedField === 'tags' && styles.inputContainerFocused
              ]}>
                {focusedField === 'tags' && (
                  <LinearGradient
                    colors={['#F97316', '#FBBF24']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.inputBorder}
                  />
                )}
                <TextInput
                  style={styles.input}
                  value={tags}
                  onChangeText={setTags}
                  placeholder="naar"
                  placeholderTextColor="#9CA3AF"
                  maxLength={100}
                  onFocus={() => setFocusedField('tags')}
                  onBlur={() => setFocusedField(null)}
                />
              </View> */}

              {/* Action Buttons */}
              <View style={styles.buttonRow}>
                <TouchableOpacity
                  style={styles.cancelButtonContainer}
                  onPress={handleClose}
                  disabled={isSubmitting}
                >
                  <View style={styles.cancelButton}>
                    <LinearGradient
                      colors={['#F97316', '#FBBF24']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.cancelButtonBorder}
                    />
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </View>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleSave}
                  disabled={isSubmitting}
                  style={styles.createButtonContainer}
                >
                  <LinearGradient
                    colors={['#EF4444', '#F97316']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={[styles.createButton, isSubmitting && styles.createButtonDisabled]}
                  >
                    <Text style={styles.createButtonText}>
                      {isSubmitting ? 'Creating...' : 'Create Task'}
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  keyboardView: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modal: {
    backgroundColor: '#000000',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 12,
    paddingHorizontal: 20,
    paddingBottom: 20,
    maxHeight: '90%',
  },
  hamburgerContainer: {
    alignItems: 'center',
    paddingVertical: 8,
    marginBottom: 8,
  },
  hamburger: {
    width: 40,
    alignItems: 'center',
  },
  hamburgerLine: {
    width: 32,
    height: 3,
    backgroundColor: '#2F2F2F',
    marginVertical: 2,
    borderRadius: 2,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 24,
    fontFamily: 'Sora_700Bold',
    color: '#FFFFFF',
  },
  closeButtonContainer: {
    borderRadius: 8,
    overflow: 'hidden',
  },
  closeButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  label: {
    fontSize: 14,
    fontFamily: 'Sora_600SemiBold',
    color: '#FFFFFF',
    marginBottom: 8,
    marginTop: 16,
  },
  inputContainer: {
    position: 'relative',
    borderRadius: 8,
    backgroundColor: '#1F1F1F',
    borderWidth: 1,
    borderColor: '#1F1F1F',
  },
  inputContainerFocused: {
    borderWidth: 1,
    borderColor: 'transparent',
  },
  inputBorder: {
    position: 'absolute',
    top: -1,
    left: -1,
    right: -1,
    bottom: -1,
    borderRadius: 8,
    zIndex: -1,
  },
  input: {
    padding: 12,
    fontSize: 16,
    fontFamily: 'Sora_400Regular',
    color: '#FFFFFF',
    backgroundColor: 'transparent',
  },
  textAreaContainer: {
    minHeight: 80,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  priorityRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 4,
  },
  priorityButtonContainer: {
    flex: 1,
  },
  priorityButton: {
    position: 'relative',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: '#1F1F1F',
    borderWidth: 1,
    borderColor: '#1F1F1F',
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  priorityButtonActive: {
    borderWidth: 1,
    borderColor: 'transparent',
  },
  priorityButtonBorder: {
    position: 'absolute',
    top: -1,
    left: -1,
    right: -1,
    bottom: -1,
    borderRadius: 8,
  },
  priorityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  priorityButtonText: {
    fontSize: 12,
    fontFamily: 'Sora_600SemiBold',
    color: '#FFFFFF',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
    marginBottom: 8,
  },
  cancelButtonContainer: {
    flex: 1,
  },
  cancelButton: {
    position: 'relative',
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: '#1F1F1F',
    borderWidth: 1,
    borderColor: 'transparent',
    alignItems: 'center',
    overflow: 'hidden',
  },
  cancelButtonBorder: {
    position: 'absolute',
    top: -1,
    left: -1,
    right: -1,
    bottom: -1,
    borderRadius: 8,
  },
  cancelButtonText: {
    fontSize: 16,
    fontFamily: 'Sora_600SemiBold',
    color: '#FFFFFF',
  },
  createButtonContainer: {
    flex: 1,
    borderRadius: 8,
    overflow: 'hidden',
  },
  createButton: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  createButtonDisabled: {
    opacity: 0.6,
  },
  createButtonText: {
    fontSize: 16,
    fontFamily: 'Sora_600SemiBold',
    color: '#FFFFFF',
  },
});
