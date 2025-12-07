import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { db, auth } from '../api/firebaseConfig';
import { doc, getDoc } from 'firebase/firestore';
import { LinearGradient } from 'expo-linear-gradient';

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

export const FeeDetailScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { theme } = useTheme();
  const [feeData, setFeeData] = useState<FeeDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFeeDetails();
  }, []);

  const fetchFeeDetails = async () => {
    try {
      const user = auth.currentUser;
      if (user) {
        const feeDoc = await getDoc(doc(db, 'fees', user.uid));
        if (feeDoc.exists()) {
          setFeeData(feeDoc.data() as FeeDetail);
        } else {
          // Default demo data if no fee record exists
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

  const formatCurrency = (amount: number) => {
    return `PKR ${amount.toLocaleString()}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
        <View style={[styles.header, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Fee Details</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
          <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!feeData) return null;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Fee Details</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Fixed Summary Cards */}
      <View style={styles.summaryRow}>
          <LinearGradient
            colors={['#6366f1', '#4f46e5']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.summaryCard}
          >
            <Ionicons name="cash-outline" size={24} color="white" style={styles.summaryIcon} />
            <Text style={styles.summaryLabel} numberOfLines={1}>Total Fee</Text>
            <Text style={styles.summaryValue} numberOfLines={1} adjustsFontSizeToFit>{formatCurrency(feeData.totalFee)}</Text>
          </LinearGradient>

          <LinearGradient
            colors={['#16a34a', '#15803d']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.summaryCard}
          >
            <Ionicons name="checkmark-circle-outline" size={24} color="white" style={styles.summaryIcon} />
            <Text style={styles.summaryLabel} numberOfLines={1}>Paid</Text>
            <Text style={styles.summaryValue} numberOfLines={1} adjustsFontSizeToFit>{formatCurrency(feeData.paidAmount)}</Text>
          </LinearGradient>

          <LinearGradient
            colors={['#dc2626', '#b91c1c']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.summaryCard}
          >
            <Ionicons name="alert-circle-outline" size={24} color="white" style={styles.summaryIcon} />
            <Text style={styles.summaryLabel} numberOfLines={1}>Pending</Text>
            <Text style={styles.summaryValue} numberOfLines={1} adjustsFontSizeToFit>{formatCurrency(feeData.pendingAmount)}</Text>
          </LinearGradient>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>


        {/* Fee Breakdown */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Fee Breakdown</Text>
          <View style={[styles.breakdownCard, { backgroundColor: theme.card }]}>
            <View style={styles.breakdownRow}>
              <Text style={[styles.breakdownLabel, { color: theme.text }]}>Tuition Fees</Text>
              <Text style={[styles.breakdownValue, { color: theme.text }]}>{formatCurrency(feeData.breakdown.tuition)}</Text>
            </View>
            <View style={[styles.breakdownRow, styles.breakdownRowBorder, { borderTopColor: theme.border }]}>
              <Text style={[styles.breakdownLabel, { color: theme.text }]}>Books & Materials</Text>
              <Text style={[styles.breakdownValue, { color: theme.text }]}>{formatCurrency(feeData.breakdown.books)}</Text>
            </View>
            <View style={[styles.breakdownRow, styles.breakdownRowBorder, { borderTopColor: theme.border }]}>
              <Text style={[styles.breakdownLabel, { color: theme.text }]}>Lab Fees</Text>
              <Text style={[styles.breakdownValue, { color: theme.text }]}>{formatCurrency(feeData.breakdown.labs)}</Text>
            </View>
            <View style={[styles.breakdownRow, styles.breakdownRowBorder, { borderTopColor: theme.border }]}>
              <Text style={[styles.breakdownLabel, { color: theme.text }]}>Examination Fees</Text>
              <Text style={[styles.breakdownValue, { color: theme.text }]}>{formatCurrency(feeData.breakdown.exam)}</Text>
            </View>
          </View>
        </View>

        {/* Payment History */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Payment History</Text>
          {feeData.payments.length > 0 ? (
            feeData.payments.map((payment, index) => (
              <View key={index} style={[styles.paymentCard, { backgroundColor: theme.card }]}>
                <View style={styles.paymentHeader}>
                  <View style={[styles.paymentIcon, { backgroundColor: '#16a34a15' }]}>
                    <Ionicons name="checkmark-circle" size={24} color="#16a34a" />
                  </View>
                  <View style={styles.paymentInfo}>
                    <Text style={[styles.paymentAmount, { color: theme.text }]}>{formatCurrency(payment.amount)}</Text>
                    <Text style={[styles.paymentMethod, { color: theme.textSecondary }]}>{payment.method}</Text>
                  </View>
                  <Text style={[styles.paymentDate, { color: theme.textSecondary }]}>{formatDate(payment.date)}</Text>
                </View>
              </View>
            ))
          ) : (
            <View style={[styles.emptyState, { backgroundColor: theme.card }]}>
              <Ionicons name="receipt-outline" size={48} color={theme.textSecondary} />
              <Text style={[styles.emptyText, { color: theme.textSecondary }]}>No payment history</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    paddingTop: 10,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
  },
  summaryCard: {
    flex: 1,
    padding: 12,
    borderRadius: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  summaryIcon: {
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.9)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '800',
    color: 'white',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  breakdownCard: {
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  breakdownRowBorder: {
    borderTopWidth: 1,
  },
  breakdownLabel: {
    fontSize: 15,
    fontWeight: '500',
  },
  breakdownValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  paymentCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  paymentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  paymentIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  paymentInfo: {
    flex: 1,
  },
  paymentAmount: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  paymentMethod: {
    fontSize: 13,
    fontWeight: '500',
  },
  paymentDate: {
    fontSize: 12,
    fontWeight: '600',
  },
  emptyState: {
    borderRadius: 12,
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    fontWeight: '500',
    marginTop: 12,
  },
});
