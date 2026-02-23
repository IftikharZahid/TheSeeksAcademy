import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  ActivityIndicator,
  Alert,
  Platform,
  Modal,
  Image,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { db, auth } from '../api/firebaseConfig';
import { doc, getDoc } from 'firebase/firestore';
import { LinearGradient } from 'expo-linear-gradient';
import { scale } from '../utils/responsive';
import { captureRef } from 'react-native-view-shot';
import * as MediaLibrary from 'expo-media-library';
import { useAppSelector } from '../store/hooks';

interface FeeDetail {
  totalFee: number;
  paidAmount: number;
  pendingAmount: number;
  breakdown: {
    tuition: number;
    books: number;
    labs: number;
    exam: number;
  };
  payments: {
    date: string;
    amount: number;
    method: string;
  }[];
}

interface BreakdownItemProps {
  icon: string;
  iconColor: string;
  label: string;
  amount: string;
  isLast?: boolean;
}

const BreakdownItem: React.FC<BreakdownItemProps> = ({ icon, iconColor, label, amount, isLast }) => {
  const { theme, isDark } = useTheme();

  return (
    <View style={[
      styles.breakdownItem,
      !isLast && { borderBottomWidth: 1, borderBottomColor: isDark ? theme.border : '#f3f4f6' }
    ]}>
      <View style={[styles.breakdownIcon, { backgroundColor: `${iconColor}15` }]}>
        <Ionicons name={icon as any} size={scale(16)} color={iconColor} />
      </View>
      <Text style={[styles.breakdownLabel, { color: theme.text }]}>{label}</Text>
      <Text style={[styles.breakdownAmount, { color: theme.text }]}>{amount}</Text>
    </View>
  );
};

export const FeeDetailScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { theme, isDark } = useTheme();
  const [feeData, setFeeData] = useState<FeeDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showFeeSlip, setShowFeeSlip] = useState(false);
  const feeSlipRef = useRef<View>(null);

  // User data from Redux
  const profile = useAppSelector((state) => state.auth.profile);
  const reduxUser = useAppSelector((state) => state.auth.user);

  const userData = {
    studentName: profile?.fullname || reduxUser?.displayName || 'Student',
    className: profile?.class || '10th',
    serialNo: reduxUser?.uid?.slice(-6).toUpperCase() || 'TSA001',
  };

  // Animations
  const headerAnim = useRef(new Animated.Value(0)).current;
  const cardsAnim = useRef(new Animated.Value(0)).current;
  const contentAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    fetchFeeDetails();

    // Staggered animations
    Animated.sequence([
      Animated.timing(headerAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(cardsAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(contentAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const fetchFeeDetails = async () => {
    try {
      const user = auth.currentUser;
      if (user) {
        const feeDoc = await getDoc(doc(db, 'fees', user.uid));
        if (feeDoc.exists()) {
          setFeeData(feeDoc.data() as FeeDetail);
        } else {
          // Default demo data
          setFeeData({
            totalFee: 50000,
            paidAmount: 30000,
            pendingAmount: 20000,
            breakdown: {
              tuition: 35000,
              books: 5000,
              labs: 8000,
              exam: 2000,
            },
            payments: [
              { date: '2024-01-15', amount: 15000, method: 'Bank Transfer' },
              { date: '2024-03-20', amount: 15000, method: 'Cash' },
            ],
          });
        }
      }
    } catch (error) {
      console.error('Error fetching fee details:', error);
    } finally {
      setLoading(false);
    }
  };

  // Get current date formatted
  const getCurrentDate = () => {
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    return `${day} / ${month} / ${year}`;
  };

  const handleSaveToGallery = async () => {
    try {
      setSaving(true);

      // Request permissions
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please grant permission to save images to your gallery.');
        setSaving(false);
        return;
      }

      // Capture the fee slip
      if (feeSlipRef.current) {
        const uri = await captureRef(feeSlipRef, {
          format: 'png',
          quality: 1,
        });

        // Save to gallery
        await MediaLibrary.saveToLibraryAsync(uri);

        Alert.alert('Success! ✓', 'Fee slip saved to your gallery.');
      }
    } catch (error) {
      console.error('Error saving fee slip:', error);
      Alert.alert('Error', 'Failed to save fee slip. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const formatCurrency = (amount: number) => `PKR ${amount.toLocaleString()}`;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const paidPercentage = feeData ? Math.round((feeData.paidAmount / feeData.totalFee) * 100) : 0;

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top', 'bottom', 'left', 'right']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!feeData) return null;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top', 'bottom', 'left', 'right']}>
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
          <Text style={[styles.headerTitle, { color: theme.text }]}>Fee Details</Text>
          <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]}>
            Academic Year 2024-25
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.saveButton, { backgroundColor: theme.primary }]}
          onPress={() => setShowFeeSlip(true)}
        >
          <Ionicons name="download-outline" size={scale(20)} color="#fff" />
        </TouchableOpacity>
      </Animated.View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Wrapper for capturing fee slip */}
        <View ref={feeSlipRef} collapsable={false} style={{ backgroundColor: theme.background }}>
          {/* Main Balance Card */}
          <Animated.View style={[
            styles.balanceCardContainer,
            {
              opacity: cardsAnim,
              transform: [{
                scale: cardsAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.95, 1],
                })
              }],
            }
          ]}>
            <LinearGradient
              colors={isDark ? ['#1e293b', '#334155'] : ['#6366f1', '#8b5cf6']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.balanceCard}
            >
              <View style={styles.balanceHeader}>
                <Text style={styles.balanceLabel}>Total Fee</Text>
                <View style={styles.statusBadge}>
                  <View style={[styles.statusDot, { backgroundColor: paidPercentage >= 100 ? '#4ade80' : '#fbbf24' }]} />
                  <Text style={styles.statusText}>
                    {paidPercentage >= 100 ? 'Paid' : 'Pending'}
                  </Text>
                </View>
              </View>
              <Text style={styles.balanceAmount}>{formatCurrency(feeData.totalFee)}</Text>

              {/* Progress Bar */}
              <View style={styles.progressContainer}>
                <View style={styles.progressBar}>
                  <View style={[styles.progressFill, { width: `${paidPercentage}%` }]} />
                </View>
                <Text style={styles.progressText}>{paidPercentage}% Paid</Text>
              </View>

              {/* Quick Stats */}
              <View style={styles.quickStats}>
                <View style={styles.quickStatItem}>
                  <Ionicons name="checkmark-circle" size={16} color="#4ade80" />
                  <Text style={styles.quickStatLabel}>Paid</Text>
                  <Text style={styles.quickStatValue}>{formatCurrency(feeData.paidAmount)}</Text>
                </View>
                <View style={styles.quickStatDivider} />
                <View style={styles.quickStatItem}>
                  <Ionicons name="alert-circle" size={16} color="#fbbf24" />
                  <Text style={styles.quickStatLabel}>Due</Text>
                  <Text style={styles.quickStatValue}>{formatCurrency(feeData.pendingAmount)}</Text>
                </View>
              </View>
            </LinearGradient>
          </Animated.View>

          {/* Fee Breakdown */}
          <Animated.View style={[
            styles.section,
            {
              opacity: contentAnim,
              transform: [{
                translateY: contentAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [20, 0],
                })
              }],
            }
          ]}>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionIcon, { backgroundColor: '#6366f115' }]}>
                <Ionicons name="list" size={16} color="#6366f1" />
              </View>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Fee Breakdown</Text>
            </View>
            <View style={[styles.breakdownCard, { backgroundColor: isDark ? theme.card : '#fff', borderColor: theme.border }]}>
              <BreakdownItem
                icon="school"
                iconColor="#6366f1"
                label="Tuition Fees"
                amount={formatCurrency(feeData.breakdown.tuition)}
              />
              <BreakdownItem
                icon="book"
                iconColor="#0ea5e9"
                label="Books & Materials"
                amount={formatCurrency(feeData.breakdown.books)}
              />
              <BreakdownItem
                icon="flask"
                iconColor="#10b981"
                label="Lab Fees"
                amount={formatCurrency(feeData.breakdown.labs)}
              />
              <BreakdownItem
                icon="document-text"
                iconColor="#f59e0b"
                label="Examination Fees"
                amount={formatCurrency(feeData.breakdown.exam)}
                isLast
              />
            </View>
          </Animated.View>

          {/* Payment History */}
          <Animated.View style={[
            styles.section,
            {
              opacity: contentAnim,
              transform: [{
                translateY: contentAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [30, 0],
                })
              }],
            }
          ]}>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionIcon, { backgroundColor: '#10b98115' }]}>
                <Ionicons name="receipt" size={16} color="#10b981" />
              </View>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Payment History</Text>
              <Text style={[styles.sectionCount, { color: theme.textSecondary }]}>
                {feeData.payments.length} transactions
              </Text>
            </View>

            {feeData.payments.length > 0 ? (
              <View style={styles.paymentList}>
                {feeData.payments.map((payment, index) => (
                  <View
                    key={index}
                    style={[
                      styles.paymentCard,
                      { backgroundColor: isDark ? theme.card : '#fff', borderColor: theme.border }
                    ]}
                  >
                    <View style={[styles.paymentIconContainer, { backgroundColor: '#10b98115' }]}>
                      <Ionicons name="checkmark" size={14} color="#10b981" />
                    </View>
                    <View style={styles.paymentInfo}>
                      <Text style={[styles.paymentAmount, { color: theme.text }]}>
                        {formatCurrency(payment.amount)}
                      </Text>
                      <Text style={[styles.paymentMethod, { color: theme.textSecondary }]}>
                        {payment.method}
                      </Text>
                    </View>
                    <View style={styles.paymentDateContainer}>
                      <Text style={[styles.paymentDate, { color: theme.textSecondary }]}>
                        {formatDate(payment.date)}
                      </Text>
                      <View style={[styles.successBadge, { backgroundColor: '#10b98115' }]}>
                        <Text style={styles.successText}>Success</Text>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            ) : (
              <View style={[styles.emptyState, { backgroundColor: isDark ? theme.card : '#fff', borderColor: theme.border }]}>
                <Ionicons name="receipt-outline" size={32} color={theme.textSecondary} />
                <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                  No payment history yet
                </Text>
              </View>
            )}
          </Animated.View>

          {/* Pay Now Button */}
          {feeData.pendingAmount > 0 && (
            <TouchableOpacity activeOpacity={0.85}>
              <LinearGradient
                colors={['#10b981', '#059669']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.payButton}
              >
                <Ionicons name="card" size={scale(18)} color="#fff" />
                <Text style={styles.payButtonText}>Pay Now</Text>
              </LinearGradient>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      {/* Fee Slip Preview Modal */}
      <Modal
        visible={showFeeSlip}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowFeeSlip(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Fee Slip Preview</Text>
              <TouchableOpacity onPress={() => setShowFeeSlip(false)}>
                <Ionicons name="close" size={24} color="#1a1a1a" />
              </TouchableOpacity>
            </View>

            {/* Fee Slip Content */}
            <ScrollView showsVerticalScrollIndicator={false}>
              <View ref={feeSlipRef} collapsable={false} style={styles.feeSlipContainer}>
                {/* Top Row - S No., Logo, Date */}
                <View style={styles.feeSlipTopRow}>
                  <Text style={styles.feeSlipSerialLabel}>S No. <Text style={styles.feeSlipSerialValue}>{userData.serialNo}</Text></Text>
                  <Image
                    source={require('../../assets/icon.png')}
                    style={styles.feeSlipLogo}
                    resizeMode="contain"
                  />
                  <Text style={styles.feeSlipDateText}>{getCurrentDate()}</Text>
                </View>

                {/* Address Line */}
                <View style={styles.feeSlipAddressBox}>
                  <View style={styles.feeSlipOrangeLine} />
                  <Text style={styles.feeSlipAddress}>1/D. Mazhar Aloom Road, Fort Abbas Ph: 0348 7000302</Text>
                  <View style={styles.feeSlipOrangeLine} />
                </View>

                {/* Fee Slip Title - Centered */}
                <View style={styles.feeSlipTitleRow}>
                  <View style={styles.feeSlipBadge}>
                    <Text style={styles.feeSlipBadgeText}>Fee Slip</Text>
                  </View>
                </View>

                {/* Student Name and Class */}
                <View style={styles.feeSlipDualRow}>
                  <View style={[styles.feeSlipDualLeft, { flex: 2 }]}>
                    <Text style={styles.feeSlipFieldLabel}>Student Name:</Text>
                    <View style={styles.feeSlipFieldLineShort}>
                      <Text style={styles.feeSlipFieldValue}>{userData.studentName}</Text>
                    </View>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'flex-end', width: 80 }}>
                    <Text style={styles.feeSlipFieldLabel}>Class:</Text>
                    <View style={[styles.feeSlipFieldLineShort, { flex: 1 }]}>
                      <Text style={styles.feeSlipFieldValue}>{userData.className}</Text>
                    </View>
                  </View>
                </View>

                {/* Monthly Fee and Remaining Fee */}
                <View style={styles.feeSlipDualRow}>
                  <View style={styles.feeSlipDualLeft}>
                    <Text style={styles.feeSlipFieldLabel}>Monthly Fee:</Text>
                    <View style={styles.feeSlipFieldLineShort}>
                      <Text style={styles.feeSlipFieldValue}>PKR {feeData.breakdown.tuition.toLocaleString()}</Text>
                    </View>
                  </View>
                  <View style={styles.feeSlipDualRight}>
                    <Text style={styles.feeSlipFieldLabel}>Remaining:</Text>
                    <View style={styles.feeSlipFieldLineShort}>
                      <Text style={styles.feeSlipFieldValue}>PKR {feeData.pendingAmount.toLocaleString()}</Text>
                    </View>
                  </View>
                </View>

                {/* Other Charges */}
                <View style={styles.feeSlipFieldRow}>
                  <Text style={styles.feeSlipFieldLabel}>Other Charges:</Text>
                  <View style={styles.feeSlipFieldLine}>
                    <Text style={styles.feeSlipFieldValue}>PKR {(feeData.breakdown.books + feeData.breakdown.labs + feeData.breakdown.exam).toLocaleString()}</Text>
                  </View>
                </View>

                {/* Note */}
                <View style={styles.feeSlipFieldRow}>
                  <Text style={styles.feeSlipFieldLabel}>Note:</Text>
                  <View style={styles.feeSlipFieldLine}>
                    <Text style={styles.feeSlipFieldValue}></Text>
                  </View>
                </View>

                {/* Received By and Signature */}
                <View style={styles.feeSlipSignatureRow}>
                  <View style={styles.feeSlipReceivedBy}>
                    <Text style={styles.feeSlipFieldLabel}>Received By:</Text>
                    <View style={styles.feeSlipReceivedByLine}>
                      <Text style={styles.feeSlipFieldValue}>Admin</Text>
                    </View>
                  </View>
                  <View style={styles.feeSlipSignatureBox}>
                    <Text style={styles.feeSlipFieldLabel}>Signature:</Text>
                    <Text style={styles.feeSlipSignatureText}>Sajid Javed</Text>
                  </View>
                </View>

                {/* Footer */}
                <View style={styles.feeSlipFooter}>
                  <Text style={styles.feeSlipFooterText}>
                    Note: This document has been generated online and does not require stamp verification.
                  </Text>
                </View>
              </View>
            </ScrollView>

            {/* Download Button */}
            <TouchableOpacity
              style={styles.downloadButtonLarge}
              onPress={handleSaveToGallery}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="download-outline" size={20} color="#fff" />
                  <Text style={styles.downloadButtonText}>Save to Gallery</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  saveButton: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(12),
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  scrollContent: {
    padding: scale(16),
    paddingBottom: scale(24),
  },
  // Balance Card
  balanceCardContainer: {
    marginBottom: 16,
  },
  balanceCard: {
    borderRadius: 16,
    padding: 16,
  },
  balanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  balanceLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.8)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    gap: 4,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#fff',
  },
  balanceAmount: {
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 12,
  },
  progressContainer: {
    marginBottom: 14,
  },
  progressBar: {
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 4,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4ade80',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 10,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'right',
  },
  quickStats: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 10,
    padding: 10,
  },
  quickStatItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  quickStatDivider: {
    width: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginHorizontal: 10,
  },
  quickStatLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.7)',
  },
  quickStatValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
    marginLeft: 'auto',
  },
  // Sections
  section: {
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 8,
  },
  sectionIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    flex: 1,
  },
  sectionCount: {
    fontSize: 11,
  },
  // Breakdown
  breakdownCard: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
  },
  breakdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  breakdownIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  breakdownLabel: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
  },
  breakdownAmount: {
    fontSize: 13,
    fontWeight: '700',
  },
  // Payments
  paymentList: {
    gap: 8,
  },
  paymentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  paymentIconContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  paymentInfo: {
    flex: 1,
  },
  paymentAmount: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 1,
  },
  paymentMethod: {
    fontSize: 11,
  },
  paymentDateContainer: {
    alignItems: 'flex-end',
  },
  paymentDate: {
    fontSize: 11,
    fontWeight: '500',
    marginBottom: 3,
  },
  successBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  successText: {
    fontSize: 9,
    fontWeight: '600',
    color: '#10b981',
  },
  // Empty State
  emptyState: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 8,
  },
  // Pay Button
  payButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    marginTop: 4,
  },
  payButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    width: '100%',
    paddingBottom: 0,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  downloadButtonLarge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10b981',
    marginTop: 0,
    paddingVertical: 12,
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  downloadButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  // Fee Slip Styles
  feeSlipContainer: {
    backgroundColor: '#ffffff',
    padding: 16,
    margin: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e5e5',
  },
  feeSlipTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  feeSlipSerialLabel: {
    fontStyle: 'italic',
    fontSize: 11,
    color: '#1a1a1a',
  },
  feeSlipSerialValue: {
    fontWeight: '600',
  },
  feeSlipLogo: {
    width: 140,
    height: 40,
  },
  feeSlipDateText: {
    fontSize: 11,
    color: '#1a1a1a',
    fontWeight: '600',
  },
  feeSlipAddressBox: {
    alignItems: 'center',
    marginBottom: 10,
  },
  feeSlipOrangeLine: {
    height: 1.5,
    width: '100%',
    backgroundColor: '#f5a623',
  },
  feeSlipAddress: {
    fontSize: 10,
    fontWeight: '600',
    color: '#1a1a1a',
    paddingVertical: 4,
    textAlign: 'center',
  },
  feeSlipTitleRow: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  feeSlipBadge: {
    backgroundColor: '#1e5aa8',
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderRadius: 3,
  },
  feeSlipBadgeText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  feeSlipDateLabel: {
    fontSize: 11,
    color: '#1a1a1a',
    fontWeight: '500',
  },
  feeSlipDateValue: {
    fontWeight: '700',
  },
  feeSlipFieldRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 10,
  },
  feeSlipFieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  feeSlipFieldLine: {
    flex: 1,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
    marginLeft: 6,
    paddingBottom: 1,
  },
  feeSlipFieldValue: {
    fontSize: 11,
    color: '#1a1a1a',
    fontWeight: '500',
  },
  feeSlipDualRow: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  feeSlipDualLeft: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    flex: 1,
  },
  feeSlipDualRight: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    flex: 1,
    marginLeft: 20,
  },
  feeSlipFieldLineShort: {
    flex: 1,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
    marginLeft: 6,
    paddingBottom: 1,
  },
  feeSlipSignatureRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: 12,
    marginBottom: 8,
  },
  feeSlipReceivedBy: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  feeSlipReceivedByLine: {
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
    marginLeft: 6,
    width: 60,
    paddingBottom: 1,
  },
  feeSlipSignatureBox: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  feeSlipSignatureText: {
    marginLeft: 6,
    fontSize: 11,
    color: '#1e5aa8',
    fontWeight: '700',
    fontStyle: 'italic',
    textDecorationLine: 'underline',
    fontFamily: Platform.OS === 'ios' ? 'Snell Roundhand' : 'serif',
  },
  feeSlipFooter: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  feeSlipFooterText: {
    fontSize: 6.5,
    fontStyle: 'italic',
    color: '#c41e3a',
    textAlign: 'center',
    textDecorationLine: 'underline',
  },
});
