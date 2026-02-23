import React, { useState, useRef, useEffect } from 'react';
import { 
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Animated,
  ActivityIndicator,
  StatusBar
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';
import { scale } from '../../utils/responsive';

import { auth } from '../../api/firebaseConfig';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import {
  submitComplaint,
  initMyComplaintsListener,
} from '../../store/slices/complaintsSlice';
import type { Complaint } from '../../store/slices/complaintsSlice';

const CATEGORIES = [
  { key: 'Academic', icon: 'school', color: '#6366f1' },
  { key: 'Infrastructure', icon: 'business', color: '#0ea5e9' },
  { key: 'Discipline', icon: 'shield-checkmark', color: '#f59e0b' },
  { key: 'Transport', icon: 'bus', color: '#10b981' },
  { key: 'Other', icon: 'ellipsis-horizontal-circle', color: '#8b5cf6' },
];

export const ComplaintsScreen: React.FC = () => {
  const navigation = useNavigation();
  const { theme, isDark } = useTheme();
  const dispatch = useAppDispatch();

  // Form state
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');

  // Redux state
  const myComplaints = useAppSelector(state => state.complaints.myComplaints);
  const loadingComplaints = useAppSelector(state => state.complaints.loading);
  const isSubmitting = useAppSelector(state => state.complaints.submitting);

  // Animations
  const headerAnim = useRef(new Animated.Value(0)).current;
  const formAnim = useRef(new Animated.Value(0)).current;
  const listAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.stagger(150, [
      Animated.timing(headerAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.timing(formAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.timing(listAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
    ]).start();
  }, []);

  // Initialize real-time listener
  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;

    const unsubscribe = initMyComplaintsListener(dispatch, uid);
    return () => unsubscribe();
  }, [dispatch]);

  const handleSubmit = () => {
    if (!subject.trim()) {
      Alert.alert('Missing Info', 'Please enter a subject for your complaint.');
      return;
    }
    if (!category) {
      Alert.alert('Missing Info', 'Please select a category.');
      return;
    }
    if (!description.trim()) {
      Alert.alert('Missing Info', 'Please describe the issue.');
      return;
    }

    dispatch(submitComplaint({ subject, category, description }))
      .unwrap()
      .then(() => {
        Alert.alert(
          'Submitted ✓',
          'Your complaint has been submitted successfully. We will review it shortly.',
          [{ text: 'OK' }]
        );
        setSubject('');
        setCategory('');
        setDescription('');
      })
      .catch(() => {
        Alert.alert('Error', 'Failed to submit complaint. Please try again.');
      });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Resolved': return '#10b981';
      case 'Pending': return '#f59e0b';
      default: return '#6366f1';
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp?.seconds) return '';
    const d = new Date(timestamp.seconds * 1000);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={theme.background} />
      {/* Floating Header */}
      <Animated.View
        style={[
          styles.floatingHeader,
          {
            opacity: headerAnim,
            transform: [{
              translateY: headerAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [-10, 0],
              })
            }],
          }
        ]}
      >
        <TouchableOpacity
          style={[styles.floatingBackButton, { backgroundColor: theme.card }]}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={scale(22)} color={theme.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Help & Support</Text>
          <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]}>
            Submit a complaint or issue
          </Text>
        </View>
        <View style={[styles.headerBadge, { backgroundColor: '#dc262615' }]}>
          <Ionicons name="shield-checkmark" size={scale(20)} color="#dc2626" />
        </View>
      </Animated.View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Info Banner */}
          <Animated.View style={{
            opacity: formAnim,
            transform: [{
              translateY: formAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [20, 0],
              })
            }],
          }}>
            <LinearGradient
              colors={isDark ? ['#1e293b', '#334155'] : ['#6366f1', '#8b5cf6']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.banner}
            >
              <View style={styles.bannerContent}>
                <View style={styles.bannerIcon}>
                  <Ionicons name="chatbubble-ellipses" size={20} color="#fff" />
                </View>
                <View style={styles.bannerTextContainer}>
                  <Text style={styles.bannerTitle}>We're Here to Help</Text>
                  <Text style={styles.bannerSubtitle}>
                    Your concerns matter. Submit a complaint and we'll address it promptly.
                  </Text>
                </View>
              </View>
            </LinearGradient>
          </Animated.View>

          {/* Form Section */}
          <Animated.View style={{
            opacity: formAnim,
            transform: [{
              translateY: formAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [30, 0],
              })
            }],
          }}>
            {/* Subject Input */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={[styles.sectionIcon, { backgroundColor: '#6366f115' }]}>
                  <Ionicons name="text" size={14} color="#6366f1" />
                </View>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>Subject</Text>
              </View>
              <View style={[styles.inputCard, {
                backgroundColor: isDark ? theme.card : '#fff',
                borderColor: theme.border,
              }]}>
                <TextInput
                  style={[styles.input, { color: theme.text }]}
                  placeholder="Brief title of your issue"
                  placeholderTextColor={theme.textSecondary}
                  value={subject}
                  onChangeText={setSubject}
                  maxLength={80}
                />
              </View>
            </View>

            {/* Category Selection */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={[styles.sectionIcon, { backgroundColor: '#0ea5e915' }]}>
                  <Ionicons name="grid" size={14} color="#0ea5e9" />
                </View>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>Category</Text>
              </View>
              <View style={styles.categoriesGrid}>
                {CATEGORIES.map((cat) => {
                  const isSelected = category === cat.key;
                  return (
                    <TouchableOpacity
                      key={cat.key}
                      style={[
                        styles.categoryChip,
                        {
                          backgroundColor: isSelected
                            ? cat.color
                            : (isDark ? theme.card : '#fff'),
                          borderColor: isSelected ? cat.color : theme.border,
                        }
                      ]}
                      onPress={() => setCategory(cat.key)}
                      activeOpacity={0.7}
                    >
                      <Ionicons
                        name={cat.icon as any}
                        size={scale(14)}
                        color={isSelected ? '#fff' : cat.color}
                      />
                      <Text style={[
                        styles.categoryText,
                        { color: isSelected ? '#fff' : theme.text }
                      ]}>
                        {cat.key}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Description Input */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={[styles.sectionIcon, { backgroundColor: '#10b98115' }]}>
                  <Ionicons name="document-text" size={14} color="#10b981" />
                </View>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>Description</Text>
              </View>
              <View style={[styles.inputCard, {
                backgroundColor: isDark ? theme.card : '#fff',
                borderColor: theme.border,
              }]}>
                <TextInput
                  style={[styles.textArea, { color: theme.text }]}
                  placeholder="Describe the issue in detail..."
                  placeholderTextColor={theme.textSecondary}
                  value={description}
                  onChangeText={setDescription}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              </View>
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              onPress={handleSubmit}
              disabled={isSubmitting}
              activeOpacity={0.85}
              style={styles.submitContainer}
            >
              <LinearGradient
                colors={isSubmitting ? ['#94a3b8', '#94a3b8'] : ['#6366f1', '#8b5cf6']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.submitButton}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons name="send" size={scale(16)} color="#fff" />
                    <Text style={styles.submitButtonText}>Submit Complaint</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>

          {/* Past Complaints Section */}
          <Animated.View style={{
            opacity: listAnim,
            transform: [{
              translateY: listAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [30, 0],
              })
            }],
          }}>
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={[styles.sectionIcon, { backgroundColor: '#f59e0b15' }]}>
                  <Ionicons name="time" size={14} color="#f59e0b" />
                </View>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>Your Complaints</Text>
                <Text style={[styles.sectionCount, { color: theme.textSecondary }]}>
                  {myComplaints.length} total
                </Text>
              </View>

              {loadingComplaints ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color={theme.primary} />
                </View>
              ) : myComplaints.length === 0 ? (
                <View style={[styles.emptyCard, {
                  backgroundColor: isDark ? theme.card : '#fff',
                  borderColor: theme.border,
                }]}>
                  <Ionicons name="chatbubbles-outline" size={scale(28)} color={theme.textSecondary} />
                  <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                    No complaints submitted yet
                  </Text>
                </View>
              ) : (
                <View style={styles.complaintsListContainer}>
                  {myComplaints.map((item: Complaint) => {
                    const catInfo = CATEGORIES.find(c => c.key === item.category);
                    const statusColor = getStatusColor(item.status);
                    return (
                      <View
                        key={item.id}
                        style={[styles.complaintCard, {
                          backgroundColor: isDark ? theme.card : '#fff',
                          borderColor: theme.border,
                        }]}
                      >
                        <View style={styles.complaintHeader}>
                          <View style={[styles.complaintCategoryIcon, { backgroundColor: `${catInfo?.color || '#6366f1'}15` }]}>
                            <Ionicons
                              name={(catInfo?.icon || 'chatbubble') as any}
                              size={scale(14)}
                              color={catInfo?.color || '#6366f1'}
                            />
                          </View>
                          <View style={styles.complaintInfo}>
                            <Text style={[styles.complaintSubject, { color: theme.text }]} numberOfLines={1}>
                              {item.subject}
                            </Text>
                            <Text style={[styles.complaintCategory, { color: theme.textSecondary }]}>
                              {item.category} · {formatDate(item.createdAt)}
                            </Text>
                          </View>
                          <View style={[styles.statusBadge, { backgroundColor: `${statusColor}15` }]}>
                            <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                            <Text style={[styles.statusText, { color: statusColor }]}>
                              {item.status}
                            </Text>
                          </View>
                        </View>
                        <Text
                          style={[styles.complaintDesc, { color: theme.textSecondary }]}
                          numberOfLines={2}
                        >
                          {item.description}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          </Animated.View>

          <View style={{ height: scale(40) }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  // Floating Header
  floatingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scale(16),
    paddingVertical: scale(12),
  },
  floatingBackButton: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(12),
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  headerCenter: {
    flex: 1,
    marginLeft: scale(12),
  },
  headerTitle: {
    fontSize: scale(16),
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: scale(11),
    marginTop: scale(1),
  },
  headerBadge: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(12),
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingHorizontal: scale(16),
    paddingBottom: scale(24),
  },
  // Banner
  banner: {
    borderRadius: scale(14),
    padding: scale(16),
    marginBottom: scale(16),
  },
  bannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bannerIcon: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(12),
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: scale(12),
  },
  bannerTextContainer: {
    flex: 1,
  },
  bannerTitle: {
    fontSize: scale(14),
    fontWeight: '700',
    color: '#fff',
    marginBottom: scale(2),
  },
  bannerSubtitle: {
    fontSize: scale(11),
    color: 'rgba(255,255,255,0.85)',
    lineHeight: scale(16),
  },
  // Sections
  section: {
    marginBottom: scale(16),
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: scale(8),
    gap: scale(8),
  },
  sectionIcon: {
    width: scale(26),
    height: scale(26),
    borderRadius: scale(7),
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: scale(13),
    fontWeight: '700',
    flex: 1,
  },
  sectionCount: {
    fontSize: scale(11),
  },
  // Input Card
  inputCard: {
    borderRadius: scale(12),
    borderWidth: 1,
    overflow: 'hidden',
  },
  input: {
    paddingHorizontal: scale(14),
    paddingVertical: scale(12),
    fontSize: scale(14),
  },
  textArea: {
    paddingHorizontal: scale(14),
    paddingVertical: scale(12),
    fontSize: scale(14),
    minHeight: scale(100),
  },
  // Categories
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: scale(8),
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(6),
    paddingHorizontal: scale(12),
    paddingVertical: scale(8),
    borderRadius: scale(10),
    borderWidth: 1,
  },
  categoryText: {
    fontSize: scale(12),
    fontWeight: '600',
  },
  // Submit
  submitContainer: {
    marginTop: scale(4),
    marginBottom: scale(8),
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: scale(8),
    paddingVertical: scale(14),
    borderRadius: scale(14),
  },
  submitButtonText: {
    color: '#fff',
    fontSize: scale(14),
    fontWeight: '700',
  },
  // Past Complaints
  loadingContainer: {
    paddingVertical: scale(24),
    alignItems: 'center',
  },
  emptyCard: {
    borderRadius: scale(12),
    borderWidth: 1,
    paddingVertical: scale(24),
    alignItems: 'center',
    gap: scale(8),
  },
  emptyText: {
    fontSize: scale(12),
    fontWeight: '500',
  },
  complaintsListContainer: {
    gap: scale(8),
  },
  complaintCard: {
    borderRadius: scale(12),
    borderWidth: 1,
    padding: scale(12),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  complaintHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: scale(6),
  },
  complaintCategoryIcon: {
    width: scale(30),
    height: scale(30),
    borderRadius: scale(8),
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: scale(10),
  },
  complaintInfo: {
    flex: 1,
  },
  complaintSubject: {
    fontSize: scale(13),
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  complaintCategory: {
    fontSize: scale(10),
    marginTop: scale(1),
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(4),
    paddingHorizontal: scale(8),
    paddingVertical: scale(4),
    borderRadius: scale(8),
  },
  statusDot: {
    width: scale(5),
    height: scale(5),
    borderRadius: scale(3),
  },
  statusText: {
    fontSize: scale(10),
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  complaintDesc: {
    fontSize: scale(11),
    lineHeight: scale(16),
    marginLeft: scale(40),
  },
});
