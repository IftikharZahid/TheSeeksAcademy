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
  RefreshControl,
  StatusBar,
} from 'react-native';
import { ScreenContainer } from '../../components/layout/ScreenContainer';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { db, auth } from '../../api/firebaseConfig';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { LinearGradient } from 'expo-linear-gradient';
import { scale, verticalScale } from '../../utils/responsive';
import { captureRef } from 'react-native-view-shot';
import * as MediaLibrary from 'expo-media-library';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import { fetchAdminFeeRecords } from '../../store/slices/adminSlice';
import { setFeeDetails } from '../../store/slices/feeSlice';

interface FeeDetail {
  totalFee: number;
  paidAmount: number;
  pendingAmount: number;
  months?: string[];
  payments: {
    date: string;
    amount: number;
    method: string;
    month?: string;
    totalFee?: number;
    pending?: number;
  }[];
}

export const FeeDetailScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { theme, isDark } = useTheme();
  const feeData = useAppSelector((state) => state.fee.details) as unknown as FeeDetail | null;
  const [loading, setLoading] = useState(!feeData);
  const [saving, setSaving] = useState(false);
  const [showFeeSlip, setShowFeeSlip] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<any | null>(null);
  const feeSlipRef = useRef<View>(null);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await fetchFeeDetails();
    setRefreshing(false);
  }, []);

  const getMonthNameFromDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    } catch {
      return 'Selected Month';
    }
  };

  const formatDateString = (dateString: string) => {
    try {
      const date = new Date(dateString);
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      return `${day} / ${month} / ${year}`;
    } catch {
      return dateString;
    }
  };

  const closeFeeSlipModal = () => {
    setShowFeeSlip(false);
    setSelectedPayment(null);
  };

  const formatFullDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return dateString;
    }
  };

  // User data from Redux
  const dispatch = useAppDispatch();
  const profile = useAppSelector((state) => state.auth.profile);
  const reduxUser = useAppSelector((state) => state.auth.user);
  const feeRecords = useAppSelector((state) => state.admin.feeRecords);

  const userData = {
    studentName: profile?.fullname || reduxUser?.displayName || 'Student',
    fatherName: profile?.fathername || '',
    className: profile?.class || '10th',
    serialNo: profile?.rollno || reduxUser?.uid?.slice(-6).toUpperCase() || 'TSA001',
  };

  // Animations
  const headerAnim = useRef(new Animated.Value(0)).current;
  const cardsAnim = useRef(new Animated.Value(0)).current;
  const contentAnim = useRef(new Animated.Value(0)).current;


  useEffect(() => {
    if (!feeData) {
      fetchFeeDetails();
    }

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
      if (!user) return;

      // Attempt to load from admin slice first if we have the student matched
      if (feeRecords.length === 0) {
        await dispatch(fetchAdminFeeRecords()).unwrap();
      }

      let studentDocId = null;

      // 1. Resolve student doc ID from 'students' collection via user email (case-insensitive & academy format robust)
      if (user.email) {
        const emailLower = user.email.toLowerCase();
        const emailParts = emailLower.split('@');
        const emailMixed = emailParts.length === 2
          ? `${emailParts[0].toUpperCase()}@TheSeeksAcademy.edu.pk`
          : emailLower;

        let sq = await getDocs(query(collection(db, 'students'), where('email', '==', emailLower)));
        if (sq.empty && emailMixed !== emailLower) {
          sq = await getDocs(query(collection(db, 'students'), where('email', '==', emailMixed)));
        }

        if (!sq.empty) {
          studentDocId = sq.docs[0].id;
        }
      }

      // 2. Fallback to profile?.rollno if not found by email query
      if (!studentDocId) {
        studentDocId = profile?.rollno || '';
      }

      let feeDocExists = false;
      if (studentDocId) {
        const feeDoc = await getDoc(doc(db, 'fees', studentDocId));
        if (feeDoc.exists()) {
          const data = feeDoc.data();
          
          let parsedPayments = [];
          let rawPayments = [];

          // 1. Merge online payments
          if (data.payments && Array.isArray(data.payments)) {
            const parsed = data.payments.map((p: any) => ({
              date: p.date,
              amount: p.amount,
              method: p.method || 'Online Payment',
              month: p.month || p.months,
              totalFee: p.totalFee || p.total || (p.amount + (p.pending ?? p.remaining ?? 0)),
              pending: p.pending ?? p.remaining ?? 0,
              id: p.id || p.date
            }));
            rawPayments.push(...parsed);
          }

          // 2. Merge admin dashboard records (from FeePage history)
          if (data.history && Array.isArray(data.history)) {
            const parsed = data.history.map((h: any) => ({
              date: h.date,
              amount: h.amountPaid,
              method: h.method || 'Admin Update',
              month: h.month || h.months,
              totalFee: h.totalFee || h.total || (h.amountPaid + (h.pendingAmount ?? h.pending ?? h.remaining ?? 0)),
              pending: h.pendingAmount ?? h.pending ?? h.remaining ?? 0,
              id: h.id || h.date
            }));
            rawPayments.push(...parsed);
          }

          // 3. Fallback to base fields if no payments and no history exist
          if (rawPayments.length === 0 && data.paidAmount > 0) {
            const monthsStr = data.month || data.months || '';
            let parsedMonths: string[] = [];
            if (Array.isArray(monthsStr)) {
              parsedMonths = monthsStr;
            } else if (typeof monthsStr === 'string') {
              parsedMonths = monthsStr.split(',').map((m: string) => m.trim()).filter(Boolean);
            }
            const numMonths = parsedMonths.length || 1;
            const monthlyAmount = Math.round(data.paidAmount / numMonths);
            
            rawPayments = parsedMonths.length > 0 ? parsedMonths.map((m: string, idx: number) => {
              const paymentDate = new Date(data.datePaid || new Date());
              paymentDate.setMonth(paymentDate.getMonth() - idx);
              return {
                date: paymentDate.toISOString().split('T')[0],
                amount: monthlyAmount,
                method: 'Legacy Update',
                month: m,
                totalFee: monthlyAmount,
                pending: 0,
                id: `legacy-${idx}`
              };
            }) : [{
              date: data.datePaid || new Date().toISOString().split('T')[0],
              amount: data.paidAmount,
              method: 'Legacy Update',
              month: Array.isArray(monthsStr) ? monthsStr.join(', ') : monthsStr,
              totalFee: data.totalFee,
              pending: data.pendingAmount,
              id: 'legacy-single'
            }];
          }

          // 4. De-duplicate transaction items (in case a record exists in both fields)
          const seen = new Set();
          const uniqueRawPayments = [];
          for (const p of rawPayments) {
            const monthVal = p.month ? (Array.isArray(p.month) ? p.month.join(',') : p.month) : '';
            const key = `${p.date}-${p.amount}-${monthVal}`;
            if (!seen.has(key)) {
              seen.add(key);
              uniqueRawPayments.push(p);
            }
          }
          rawPayments = uniqueRawPayments;

          // Apply multi-month splitting to show previous months as separate transaction cards
          parsedPayments = rawPayments.flatMap((payment: any) => {
            const monthsStr = payment.month || payment.months || '';
            if (!monthsStr) return [payment];

            let parsedMonths: string[] = [];
            if (Array.isArray(monthsStr)) {
              parsedMonths = monthsStr;
            } else if (typeof monthsStr === 'string') {
              parsedMonths = monthsStr.split(',').map((m: string) => m.trim()).filter(Boolean);
            } else {
              return [payment];
            }

            if (parsedMonths.length <= 1) {
              return [{
                ...payment,
                month: parsedMonths[0] || (typeof monthsStr === 'string' ? monthsStr : Array.isArray(monthsStr) ? monthsStr.join(', ') : '')
              }];
            }

            const numMonths = parsedMonths.length;
            const splitAmount = Math.round(payment.amount / numMonths);
            const splitTotal = Math.round((payment.totalFee || payment.amount) / numMonths);
            const splitPending = Math.round((payment.pending ?? 0) / numMonths);

            return parsedMonths.map((m: string, idx: number) => {
              let paymentDate = new Date(payment.date);
              if (isNaN(paymentDate.getTime())) {
                paymentDate = new Date();
              }
              // Subtract month index to stagger history records back in time
              paymentDate.setMonth(paymentDate.getMonth() - idx);
              return {
                ...payment,
                date: paymentDate.toISOString().split('T')[0],
                amount: splitAmount,
                totalFee: splitTotal,
                pending: splitPending,
                month: m
              };
            });
          });

          const monthsStr = data.month || data.months || '';
          let registeredMonths: string[] = [];
          if (Array.isArray(monthsStr)) {
            registeredMonths = monthsStr;
          } else if (typeof monthsStr === 'string') {
            registeredMonths = monthsStr.split(',').map((m: string) => m.trim()).filter(Boolean);
          }

          // Generate a complete ledger for ALL registered months
          let ledgerPayments = [];
          const computedTotalFee = typeof data.totalFee === 'number' ? data.totalFee : 0;
          const computedPaidAmount = typeof data.paidAmount === 'number' ? data.paidAmount : 0;
          const computedPendingAmount = typeof data.pendingAmount === 'number' 
            ? data.pendingAmount 
            : (computedTotalFee - computedPaidAmount > 0 ? computedTotalFee - computedPaidAmount : 0);

          if (registeredMonths.length > 0) {
            const numMonths = registeredMonths.length;
            const monthlyTotalFee = Math.round(computedTotalFee / numMonths);

            ledgerPayments = registeredMonths.map((m: string, idx: number) => {
              let paidForMonth = 0;
              let totalForMonth = monthlyTotalFee;
              let hasBreakdown = false;

              if (data.monthlyFees && typeof data.monthlyFees === 'object') {
                const matchedKey = Object.keys(data.monthlyFees).find(
                  k => k.toLowerCase().trim() === m.toLowerCase().trim()
                );
                if (matchedKey) {
                  const entry = data.monthlyFees[matchedKey];
                  paidForMonth = typeof entry.paid === 'number' ? entry.paid : 0;
                  totalForMonth = typeof entry.total === 'number' ? entry.total : monthlyTotalFee;
                  hasBreakdown = true;
                }
              }

              if (!hasBreakdown) {
                // Find all actual payments made explicitly for this month
                const monthPayments = parsedPayments.filter((p: any) => 
                  p.month && p.month.toLowerCase().trim() === m.toLowerCase().trim()
                );
                paidForMonth = monthPayments.reduce((acc: number, p: any) => acc + p.amount, 0);
                totalForMonth = monthlyTotalFee;
              }

              const pendingForMonth = totalForMonth - paidForMonth > 0 ? totalForMonth - paidForMonth : 0;
              
              // Find the latest actual transaction for date & method display
              const monthPayments = parsedPayments.filter((p: any) => 
                p.month && p.month.toLowerCase().trim() === m.toLowerCase().trim()
              );
              const latestPayment = monthPayments[0];

              return {
                month: m,
                date: latestPayment ? latestPayment.date : (data.lastUpdated || data.datePaid || new Date().toISOString().split('T')[0]),
                amount: paidForMonth,
                totalFee: totalForMonth,
                pending: pendingForMonth,
                method: paidForMonth > 0 
                  ? (latestPayment ? latestPayment.method : 'Admin Update') 
                  : 'Pending',
                id: latestPayment ? latestPayment.id : `ledger-${m}-${idx}`
              };
            });
          } else {
            // Fall back to parsedPayments directly if no months list is present
            ledgerPayments = parsedPayments;
          }

          // Sort ledger payments newest first by date/status
          ledgerPayments.sort((a: any, b: any) => {
            const aVal = a.amount > 0 ? 1 : 0;
            const bVal = b.amount > 0 ? 1 : 0;
            if (aVal !== bVal) return bVal - aVal;
            return new Date(b.date).getTime() - new Date(a.date).getTime();
          });

          dispatch(setFeeDetails({
            ...data,
            totalFee: computedTotalFee,
            paidAmount: computedPaidAmount,
            pendingAmount: computedPendingAmount,
            payments: ledgerPayments,
          } as FeeDetail));
          feeDocExists = true;
        }
      }

      if (!feeDocExists) {
        // Fallback to checking the system fee list by user name or roll number
        const myName = profile?.fullname || reduxUser?.displayName;

        const systemMatchedFee = feeRecords.find(f =>
          (studentDocId && f.studentId === studentDocId) ||
          (profile?.rollno && f.rollno === profile.rollno) ||
          (myName && f.studentName === myName)
        );

        if (systemMatchedFee) {
          const parsedMonths = (systemMatchedFee as any).months || (systemMatchedFee.month ? (systemMatchedFee as any).month.split(',').map((m: string) => m.trim()).filter(Boolean) : []);
          const numMonths = parsedMonths.length || 1;
          const monthlyTotalFee = Math.round(systemMatchedFee.totalFee / numMonths);
          
          let remainingPaidPool = systemMatchedFee.paidAmount;

          const generatedPayments = parsedMonths.map((m: string, idx: number) => {
            const paymentDate = new Date();
            paymentDate.setMonth(paymentDate.getMonth() - idx);
            const dateStr = paymentDate.toISOString().split('T')[0];

            const totalForMonth = monthlyTotalFee;
            const paidForMonth = remainingPaidPool >= totalForMonth 
              ? totalForMonth 
              : (remainingPaidPool > 0 ? remainingPaidPool : 0);
            
            remainingPaidPool -= paidForMonth;
            const pendingForMonth = totalForMonth - paidForMonth > 0 ? totalForMonth - paidForMonth : 0;

            return {
              date: dateStr,
              amount: paidForMonth,
              method: paidForMonth > 0 ? 'System Record' : 'Pending',
              month: m,
              totalFee: totalForMonth,
              pending: pendingForMonth,
              id: `system-ledger-${m}-${idx}`
            };
          });

          // Sort system ledger payments: paid first, then unpaid
          generatedPayments.sort((a: any, b: any) => {
            const aVal = a.amount > 0 ? 1 : 0;
            const bVal = b.amount > 0 ? 1 : 0;
            if (aVal !== bVal) return bVal - aVal;
            return new Date(b.date).getTime() - new Date(a.date).getTime();
          });

          dispatch(setFeeDetails({
            totalFee: systemMatchedFee.totalFee,
            paidAmount: systemMatchedFee.paidAmount,
            pendingAmount: systemMatchedFee.pendingAmount,
            months: parsedMonths,
            payments: generatedPayments,
          }));
        } else {
          // Ultimate fallback if no fee record assigned yet by admin
          dispatch(setFeeDetails({
            totalFee: 0,
            paidAmount: 0,
            pendingAmount: 0,
            payments: [],
          }));
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

  const renderSkeleton = () => {
    const skelBg = isDark ? '#1e293b' : '#f1f5f9';
    return (
      <ScreenContainer headerTitle="Fee Ledger">

        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Balance Card Skeleton */}
          <View style={{ marginHorizontal: scale(16), marginTop: scale(16), height: scale(180), borderRadius: scale(16), backgroundColor: skelBg }} />

          {/* Ledger Section Header Skeleton */}
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: scale(16), marginTop: scale(24), marginBottom: scale(12) }}>
            <View style={{ width: scale(24), height: scale(24), borderRadius: scale(6), backgroundColor: skelBg }} />
            <View style={{ width: '35%', height: scale(16), borderRadius: scale(4), backgroundColor: skelBg, marginLeft: scale(8) }} />
            <View style={{ flex: 1 }} />
            <View style={{ width: '15%', height: scale(14), borderRadius: scale(4), backgroundColor: skelBg }} />
          </View>

          {/* Payment List Skeletons */}
          {[1, 2, 3].map((item) => (
            <View key={item} style={{ marginHorizontal: scale(16), marginBottom: scale(12), padding: scale(14), borderRadius: scale(12), backgroundColor: skelBg, flexDirection: 'row' }}>
              <View style={{ flex: 1.2 }}>
                <View style={{ width: '70%', height: scale(14), borderRadius: scale(4), backgroundColor: theme.background, marginBottom: scale(8) }} />
                <View style={{ width: '90%', height: scale(10), borderRadius: scale(4), backgroundColor: theme.background, marginBottom: scale(12) }} />
                <View style={{ width: '50%', height: scale(20), borderRadius: scale(6), backgroundColor: theme.background }} />
              </View>
              <View style={{ flex: 1, borderLeftWidth: 1, borderLeftColor: theme.background, paddingLeft: scale(12) }}>
                <View style={{ width: '80%', height: scale(12), borderRadius: scale(4), backgroundColor: theme.background, marginBottom: scale(8) }} />
                <View style={{ width: '70%', height: scale(12), borderRadius: scale(4), backgroundColor: theme.background, marginBottom: scale(8) }} />
                <View style={{ width: '60%', height: scale(12), borderRadius: scale(4), backgroundColor: theme.background }} />
              </View>
              <View style={{ width: scale(40), alignItems: 'flex-end', justifyContent: 'center' }}>
                <View style={{ width: scale(32), height: scale(32), borderRadius: scale(8), backgroundColor: theme.background }} />
              </View>
            </View>
          ))}
        </ScrollView>
      </ScreenContainer>
    );
  };

  if (loading) {
    return renderSkeleton();
  }
  
  if (!feeData) {
    return (
      <ScreenContainer headerTitle="Fee Ledger">
        <View style={[styles.loadingContainer, { paddingHorizontal: scale(24) }]}>
          <Ionicons name="cloud-offline-outline" size={scale(60)} color={theme.textSecondary} style={{ marginBottom: scale(16) }} />
          <Text style={{ color: theme.text, fontSize: scale(18), fontWeight: 'bold', marginBottom: scale(8), textAlign: 'center' }}>No Data Available</Text>
          <Text style={{ color: theme.textSecondary, textAlign: 'center', marginBottom: scale(24) }}>Connect to the internet to load your fee records.</Text>
          <TouchableOpacity onPress={onRefresh} style={{ backgroundColor: theme.primary, paddingHorizontal: scale(24), paddingVertical: scale(12), borderRadius: scale(8) }}>
            <Text style={{ color: '#fff', fontWeight: 'bold' }}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer 
      headerTitle="Fee Ledger"
      headerSubtitle={`SESSION ${profile?.session || '2024-25'}`}
      rightAction={
        <View style={[
          styles.headerStatusPill,
          {
            backgroundColor: feeData.pendingAmount > 0 
              ? (isDark ? 'rgba(245, 158, 11, 0.12)' : '#fffbeb')
              : (isDark ? 'rgba(16, 185, 129, 0.12)' : '#ecfdf5'),
            borderColor: feeData.pendingAmount > 0
              ? (isDark ? 'rgba(245, 158, 11, 0.25)' : '#fde68a')
              : (isDark ? 'rgba(16, 185, 129, 0.25)' : '#a7f3d0'),
            borderWidth: 1,
            paddingHorizontal: scale(8),
            paddingVertical: scale(4),
            borderRadius: scale(12),
            flexDirection: 'row',
            alignItems: 'center',
            gap: scale(4),
          }
        ]}>
          <View style={[
            styles.headerStatusDot,
            { backgroundColor: feeData.pendingAmount > 0 ? '#fbbf24' : '#10b981', width: scale(6), height: scale(6), borderRadius: scale(3) }
          ]} />
          <Text style={[
            styles.headerStatusText,
            { 
              color: feeData.pendingAmount > 0 ? (isDark ? '#fbbf24' : '#d97706') : (isDark ? '#34d399' : '#059669'),
              fontSize: scale(10),
              fontWeight: '700'
            }
          ]}>
            {feeData.pendingAmount > 0 ? `DUE` : 'PAID'}
          </Text>
        </View>
      }
    >

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.primary}
          />
        }
      >
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
            colors={isDark ? ['#1e293b', '#0f172a'] : ['#4f46e5', '#6366f1']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.balanceCard}
          >
            <View style={styles.balanceHeader}>
              <View>
                <Text style={styles.balanceLabel}>Tuition FEE</Text>
                <Text style={styles.balanceAmount}>{formatCurrency(feeData.totalFee)}</Text>
              </View>
              <TouchableOpacity
                style={styles.cardDownloadBtn}
                onPress={() => {
                  setSelectedPayment(null);
                  setShowFeeSlip(true);
                }}
                activeOpacity={0.8}
              >
                <Ionicons name="document-text-outline" size={15} color="#ffffff" />
                <Text style={styles.cardDownloadText}>Fee Slip</Text>
              </TouchableOpacity>
            </View>

            {/* Progress Bar */}
            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${paidPercentage}%` }]} />
              </View>
              <View style={styles.progressLabelRow}>
                <Text style={styles.progressTextLeft}>{formatCurrency(feeData.paidAmount)} Paid</Text>
                <Text style={styles.progressTextRight}>{paidPercentage}%</Text>
              </View>
            </View>

            {/* Quick Stats Grid */}
            <View style={styles.quickStats}>
              <View style={styles.quickStatItem}>
                <View style={[styles.statDotBadge, { backgroundColor: 'rgba(74, 222, 128, 0.2)' }]}>
                  <Ionicons name="checkmark" size={12} color="#4ade80" />
                </View>
                <View style={styles.statTexts}>
                  <Text style={styles.quickStatLabel}>PAID</Text>
                  <Text style={styles.quickStatValue}>{formatCurrency(feeData.paidAmount)}</Text>
                </View>
              </View>
              <View style={styles.quickStatDivider} />
              <View style={styles.quickStatItem}>
                <View style={[styles.statDotBadge, { backgroundColor: 'rgba(251, 191, 36, 0.2)' }]}>
                  <Ionicons name="hourglass-outline" size={12} color="#fbbf24" />
                </View>
                <View style={styles.statTexts}>
                  <Text style={styles.quickStatLabel}>DUE</Text>
                  <Text style={styles.quickStatValue}>{formatCurrency(feeData.pendingAmount)}</Text>
                </View>
              </View>
            </View>
          </LinearGradient>
        </Animated.View>

        {/* Payment Ledger Section */}
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
            <View style={[styles.sectionIcon, { backgroundColor: theme.primary + '15' }]}>
              <Ionicons name="receipt" size={15} color={theme.primary} />
            </View>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Payment History</Text>
            <Text style={[styles.sectionCount, { color: theme.textSecondary }]}>
              {feeData.payments.length} Months
            </Text>
          </View>

          {feeData.payments.length > 0 ? (
            <View style={styles.paymentList}>
              {feeData.payments.map((payment, index) => (
                <View
                  key={index}
                  style={[
                    styles.compactCard,
                    { backgroundColor: theme.card, borderColor: theme.border }
                  ]}
                >
                  {/* Left Section: Month Info */}
                  <View style={styles.compactLeft}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: scale(5), marginBottom: scale(3) }}>
                      <Ionicons name="calendar-outline" size={13} color={theme.primary} />
                      <Text style={[styles.compactMonthTitle, { color: theme.text }]} numberOfLines={1}>
                        {payment.month || getMonthNameFromDate(payment.date)}
                      </Text>
                    </View>
                    <Text style={[styles.compactDateSub, { color: theme.textSecondary }]}>
                      {payment.amount > 0 ? `Paid on ${formatFullDate(payment.date)}` : 'No payment received'}
                    </Text>
                    <View style={[
                      styles.compactMethodBadge,
                      {
                        backgroundColor: payment.amount > 0 
                          ? (isDark ? 'rgba(139, 92, 246, 0.15)' : '#f5f3ff')
                          : (isDark ? 'rgba(239, 68, 68, 0.12)' : '#fef2f2'),
                      }
                    ]}>
                      <Text style={[
                        styles.compactMethodText,
                        {
                          color: payment.amount > 0 
                            ? theme.primary 
                            : '#ef4444'
                        }
                      ]}>
                        {payment.method}
                      </Text>
                    </View>
                  </View>

                  {/* Middle Section: Fee Details Grid */}
                  <View style={[styles.compactMiddle, { borderLeftColor: theme.border, borderLeftWidth: 1, borderRightColor: theme.border, borderRightWidth: 1 }]}>
                    <View style={styles.compactRow}>
                      <Text style={[styles.compactGridLabel, { color: theme.textSecondary }]}>Tuition Fee:</Text>
                      <Text style={[styles.compactGridValue, { color: theme.text, fontWeight: '600' }]}>
                        PKR {(payment.totalFee || (payment.amount + (payment.pending ?? 0))).toLocaleString()}
                      </Text>
                    </View>
                    <View style={styles.compactRow}>
                      <Text style={[styles.compactGridLabel, { color: theme.textSecondary }]}>Paid:</Text>
                      <Text style={[styles.compactGridValue, { color: '#10b981', fontWeight: '700' }]}>
                        PKR {payment.amount.toLocaleString()}
                      </Text>
                    </View>
                    <View style={styles.compactRow}>
                      <Text style={[styles.compactGridLabel, { color: theme.textSecondary }]}>Due:</Text>
                      <Text style={[
                        styles.compactGridValue,
                        {
                          color: (payment.pending ?? 0) > 0 
                            ? (payment.amount > 0 ? '#f59e0b' : '#ef4444') 
                            : '#10b981',
                          fontWeight: '700'
                        }
                      ]}>
                        PKR {(payment.pending ?? 0).toLocaleString()}
                      </Text>
                    </View>
                  </View>

                  {/* Right Section: Print Action */}
                  <View style={styles.compactRight}>
                    <TouchableOpacity
                      style={[
                        styles.compactPrintBtn,
                        {
                          backgroundColor: theme.primary + '12',
                          borderColor: theme.primary + '25',
                        }
                      ]}
                      onPress={() => {
                        setSelectedPayment(payment);
                        setShowFeeSlip(true);
                      }}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="print-outline" size={13} color={theme.primary} />
                      <Text style={[styles.compactPrintText, { color: theme.primary }]}>Slip</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <View style={[styles.emptyState, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <Ionicons name="receipt-outline" size={32} color={theme.textSecondary} />
              <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                No payment history yet
              </Text>
            </View>
          )}
        </Animated.View>
      </ScrollView>

      {/* Pay Now Button (Fixed at Bottom) */}
      {feeData.pendingAmount > 0 && (
        <View style={{ paddingHorizontal: scale(16), paddingBottom: scale(16), paddingTop: scale(8) }}>
          <TouchableOpacity activeOpacity={0.85}>
            <LinearGradient
              colors={['#10b981', '#059669']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.payButton, { marginTop: 0 }]}
            >
              <Ionicons name="card" size={16} color="#fff" />
              <Text style={styles.payButtonText}>Pay Outstanding Balance</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      )}

      {/* Fee Slip Preview Modal */}
      <Modal
        visible={showFeeSlip}
        animationType="slide"
        transparent={true}
        onRequestClose={closeFeeSlipModal}
        statusBarTranslucent
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.card, borderColor: theme.border }]}>
            {/* Modal Header */}
            <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>
                {selectedPayment ? 'Monthly Fee Slip' : 'Fee Slip Preview'}
              </Text>
              <TouchableOpacity onPress={closeFeeSlipModal}>
                <Ionicons name="close" size={24} color="#ffffff" />
              </TouchableOpacity>
            </View>

            {/* Fee Slip Content */}
            <ScrollView showsVerticalScrollIndicator={false}>
              <View ref={feeSlipRef} collapsable={false} style={styles.feeSlipContainer}>
                {/* Top Row - S No., Logo, Date */}
                <View style={styles.feeSlipTopRow}>
                  <Text style={styles.feeSlipSerialLabel}>S No. <Text style={styles.feeSlipSerialValue}>{userData.serialNo}</Text></Text>
                  <Image
                    source={require('../../../assets/HomeScreenLogo.png')}
                    style={styles.feeSlipLogo}
                    resizeMode="contain"
                  />
                  <Text style={styles.feeSlipDateText}>
                    {selectedPayment ? formatDateString(selectedPayment.date) : getCurrentDate()}
                  </Text>
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
                    <Text style={styles.feeSlipBadgeText}>
                      {selectedPayment ? 'Monthly Receipt' : 'Fee Slip'}
                    </Text>
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
                  <View style={{ flexDirection: 'row', alignItems: 'flex-end', width: scale(130) }}>
                    <Text style={styles.feeSlipFieldLabel}>Class:</Text>
                    <View style={[styles.feeSlipFieldLineShort, { flex: 1 }]}>
                      <Text style={styles.feeSlipFieldValue}>{userData.className}</Text>
                    </View>
                  </View>
                </View>

                {/* Father Name */}
                <View style={styles.feeSlipFieldRow}>
                  <Text style={styles.feeSlipFieldLabel}>Father Name:</Text>
                  <View style={styles.feeSlipFieldLine}>
                    <Text style={styles.feeSlipFieldValue}>{userData.fatherName}</Text>
                  </View>
                </View>

                {/* Paid Month */}
                <View style={styles.feeSlipFieldRow}>
                  <Text style={styles.feeSlipFieldLabel}>Paid Month:</Text>
                  <View style={styles.feeSlipFieldLine}>
                    <Text style={styles.feeSlipFieldValue}>
                      {selectedPayment 
                        ? getMonthNameFromDate(selectedPayment.date)
                        : (feeData.months && feeData.months.length > 0 
                            ? feeData.months.join(', ') 
                            : 'Not specified')}
                    </Text>
                  </View>
                </View>

                {/* Professional Fee Summary Columns */}
                <View style={styles.feeSlipTripleRow}>
                  <View style={styles.feeSlipTripleCol}>
                    <Text style={styles.feeSlipFieldLabel}>Tuition Fee:</Text>
                    <View style={styles.feeSlipFieldLineShort}>
                      <Text style={styles.feeSlipFieldValue}>
                        PKR {(selectedPayment ? selectedPayment.totalFee : feeData.totalFee).toLocaleString()}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.feeSlipTripleColMiddle}>
                    <Text style={styles.feeSlipFieldLabel}>Paid:</Text>
                    <View style={styles.feeSlipFieldLineShort}>
                      <Text style={styles.feeSlipFieldValue}>
                        PKR {(selectedPayment ? selectedPayment.amount : feeData.paidAmount).toLocaleString()}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.feeSlipTripleColRight}>
                    <Text style={styles.feeSlipFieldLabel}>Remaining:</Text>
                    <View style={styles.feeSlipFieldLineShort}>
                      <Text style={styles.feeSlipFieldValue}>
                        PKR {(selectedPayment ? selectedPayment.pending : feeData.pendingAmount).toLocaleString()}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Note */}
                <View style={styles.feeSlipFieldRow}>
                  <Text style={styles.feeSlipFieldLabel}>Note:</Text>
                  <View style={styles.feeSlipFieldLine}>
                    <Text style={styles.feeSlipFieldValue}>
                      {selectedPayment ? `Payment via ${selectedPayment.method}` : ''}
                    </Text>
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
    </ScreenContainer>
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
    borderBottomWidth: 1,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  floatingBackButton: {
    width: scale(36),
    height: scale(36),
    borderRadius: scale(10),
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    flex: 1,
    marginLeft: scale(10),
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIcon: {
    marginRight: scale(6),
  },
  headerTitle: {
    fontSize: scale(15),
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  headerSubtitle: {
    fontSize: scale(9.5),
    marginTop: scale(2),
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  headerStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scale(8),
    paddingVertical: scale(5),
    borderRadius: scale(12),
    gap: scale(4),
  },
  headerStatusDot: {
    width: scale(6),
    height: scale(6),
    borderRadius: scale(3),
  },
  headerStatusText: {
    fontSize: scale(9.5),
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  saveButton: {
    width: scale(36),
    height: scale(36),
    borderRadius: scale(10),
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    padding: scale(16),
    paddingBottom: scale(24),
  },
  // Balance Card
  balanceCardContainer: {
    marginBottom: scale(16),
  },
  balanceCard: {
    borderRadius: scale(16),
    padding: scale(16),
  },
  balanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: scale(12),
  },
  balanceLabel: {
    fontSize: scale(10.5),
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.75)',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  cardDownloadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: scale(10),
    paddingVertical: scale(5),
    borderRadius: scale(10),
    gap: scale(4),
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  cardDownloadText: {
    fontSize: scale(10.5),
    fontWeight: '700',
    color: '#fff',
  },
  balanceAmount: {
    fontSize: scale(26),
    fontWeight: '800',
    color: '#fff',
    marginTop: scale(2),
  },
  progressContainer: {
    marginBottom: scale(12),
  },
  progressBar: {
    height: scale(6),
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: scale(3),
    overflow: 'hidden',
    marginBottom: scale(6),
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4ade80',
    borderRadius: scale(3),
  },
  progressLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressTextLeft: {
    fontSize: scale(10.5),
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.85)',
  },
  progressTextRight: {
    fontSize: scale(10.5),
    fontWeight: '700',
    color: '#fff',
  },
  quickStats: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: scale(12),
    padding: scale(10),
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  quickStatItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
  },
  statDotBadge: {
    width: scale(24),
    height: scale(24),
    borderRadius: scale(12),
    justifyContent: 'center',
    alignItems: 'center',
  },
  statTexts: {
    flex: 1,
  },
  quickStatDivider: {
    width: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    marginHorizontal: scale(10),
  },
  quickStatLabel: {
    fontSize: scale(8.5),
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.6)',
    letterSpacing: 0.3,
  },
  quickStatValue: {
    fontSize: scale(11.5),
    fontWeight: '800',
    color: '#fff',
    marginTop: scale(1),
  },
  // Sections
  section: {
    marginBottom: scale(16),
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: scale(10),
    gap: scale(8),
  },
  sectionIcon: {
    width: scale(28),
    height: scale(28),
    borderRadius: scale(8),
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: scale(13),
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    flex: 1,
  },
  sectionCount: {
    fontSize: scale(10.5),
    fontWeight: '600',
  },
  // Payments
  paymentList: {
    gap: scale(8),
  },
  // Empty State
  emptyState: {
    borderRadius: scale(16),
    borderWidth: 1,
    padding: scale(24),
    alignItems: 'center',
    borderStyle: 'dashed',
  },
  emptyText: {
    fontSize: scale(12),
    fontWeight: '600',
    marginTop: scale(8),
  },
  // Pay Button
  payButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: verticalScale(12),
    borderRadius: scale(12),
    gap: scale(8),
    marginTop: scale(4),
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  payButtonText: {
    fontSize: scale(13),
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.2,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  modalContent: {
    borderTopLeftRadius: scale(24),
    borderTopRightRadius: scale(24),
    maxHeight: '90%',
    width: '100%',
    paddingBottom: 0,
    overflow: 'hidden',
    borderWidth: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: scale(16),
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: scale(16),
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  downloadButtonLarge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10b981',
    marginTop: 0,
    paddingVertical: verticalScale(12),
    gap: scale(8),
    marginHorizontal: scale(16),
    marginBottom: scale(16),
    borderRadius: scale(12),
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  downloadButtonText: {
    fontSize: scale(14),
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.2,
  },
  // Fee Slip Styles
  feeSlipContainer: {
    backgroundColor: '#ffffff',
    padding: scale(16),
    margin: scale(12),
    borderRadius: scale(12),
    borderWidth: 1,
    borderColor: '#e2e8f0',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 2,
  },
  feeSlipTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: scale(8),
  },
  feeSlipSerialLabel: {
    fontStyle: 'italic',
    fontSize: scale(11),
    color: '#1e293b',
  },
  feeSlipSerialValue: {
    fontWeight: '700',
  },
  feeSlipLogo: {
    width: scale(50),
    height: scale(50),
  },
  feeSlipDateText: {
    fontSize: scale(11),
    color: '#1e293b',
    fontWeight: '700',
  },
  feeSlipAddressBox: {
    alignItems: 'center',
    marginBottom: scale(10),
  },
  feeSlipOrangeLine: {
    height: 1.5,
    width: '100%',
    backgroundColor: '#fbbf24',
  },
  feeSlipAddress: {
    fontSize: scale(9.5),
    fontWeight: '700',
    color: '#1e293b',
    paddingVertical: scale(4),
    textAlign: 'center',
  },
  feeSlipTitleRow: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: scale(12),
  },
  feeSlipBadge: {
    backgroundColor: '#1e3a8a',
    paddingHorizontal: scale(14),
    paddingVertical: scale(4),
    borderRadius: scale(4),
  },
  feeSlipBadgeText: {
    color: '#ffffff',
    fontSize: scale(12),
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  feeSlipDateLabel: {
    fontSize: scale(11),
    color: '#1e293b',
    fontWeight: '500',
  },
  feeSlipDateValue: {
    fontWeight: '700',
  },
  feeSlipFieldRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: scale(10),
  },
  feeSlipFieldLabel: {
    fontSize: scale(11),
    fontWeight: '800',
    color: '#1e293b',
  },
  feeSlipFieldLine: {
    flex: 1,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
    marginLeft: scale(6),
    paddingBottom: 1,
  },
  feeSlipFieldValue: {
    fontSize: scale(11),
    color: '#1e293b',
    fontWeight: '600',
  },
  feeSlipDualRow: {
    flexDirection: 'row',
    marginBottom: scale(10),
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
    marginLeft: scale(20),
  },
  feeSlipTripleRow: {
    flexDirection: 'row',
    marginBottom: scale(10),
  },
  feeSlipTripleCol: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    flex: 1.1,
  },
  feeSlipTripleColMiddle: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    flex: 1,
    marginLeft: scale(10),
  },
  feeSlipTripleColRight: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    flex: 1.3,
    marginLeft: scale(10),
  },
  feeSlipFieldLineShort: {
    flex: 1,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
    marginLeft: scale(6),
    paddingBottom: 1,
  },
  feeSlipSignatureRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: scale(14),
    marginBottom: scale(8),
  },
  feeSlipReceivedBy: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  feeSlipReceivedByLine: {
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
    marginLeft: scale(6),
    width: scale(60),
    paddingBottom: 1,
  },
  feeSlipSignatureBox: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  feeSlipSignatureText: {
    marginLeft: scale(6),
    fontSize: scale(11),
    color: '#1e3a8a',
    fontWeight: '800',
    fontStyle: 'italic',
    textDecorationLine: 'underline',
    fontFamily: Platform.OS === 'ios' ? 'Snell Roundhand' : 'serif',
  },
  feeSlipFooter: {
    marginTop: scale(12),
    paddingTop: scale(8),
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  feeSlipFooterText: {
    fontSize: scale(7),
    fontStyle: 'italic',
    color: '#dc2626',
    textAlign: 'center',
    textDecorationLine: 'underline',
  },
  compactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: scale(10),
    paddingHorizontal: scale(12),
    borderRadius: scale(12),
    borderWidth: 1,
    marginBottom: scale(8),
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 2,
  },
  compactLeft: {
    flex: 1.3,
    justifyContent: 'center',
  },
  compactMonthTitle: {
    fontSize: scale(12.5),
    fontWeight: '700',
  },
  compactDateSub: {
    fontSize: scale(9.5),
    marginBottom: scale(4),
  },
  compactMethodBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: scale(6),
    paddingVertical: scale(2),
    borderRadius: scale(4),
  },
  compactMethodText: {
    fontSize: scale(8.5),
    fontWeight: '700',
  },
  compactMiddle: {
    flex: 1.5,
    paddingHorizontal: scale(10),
    justifyContent: 'center',
    gap: scale(2),
  },
  compactRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  compactGridLabel: {
    fontSize: scale(9.5),
    fontWeight: '600',
  },
  compactGridValue: {
    fontSize: scale(10.5),
  },
  compactRight: {
    flex: 0.8,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  compactPrintBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: scale(4),
    paddingVertical: scale(5),
    paddingHorizontal: scale(8),
    borderRadius: scale(8),
    borderWidth: 1,
  },
  compactPrintText: {
    fontSize: scale(10),
    fontWeight: '700',
  },
});
