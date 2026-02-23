import React, { useState, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, StatusBar, KeyboardAvoidingView, Platform, ActivityIndicator, Pressable, RefreshControl, Keyboard } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../context/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';
import { captureRef } from 'react-native-view-shot';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';

interface RecordItem {
  Mobile: string;
  Name: string;
  CNIC: string;
  Address: string;
  Country: string;
}

interface ApiResponse {
  success: boolean;
  phone: string;
  records: RecordItem[];
}

const SimTrackerScreen = () => {
  const navigation = useNavigation();
  const { theme, isDark } = useTheme();
  const [input, setInput] = useState('');
  const [records, setRecords] = useState<RecordItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  // Array of refs to capture specific cards
  const cardRefs = useRef<Array<View | null>>([]);

  const fetchDetails = async () => {
    if (!input) {
      setError('Please enter CNIC or phone number');
      return;
    }

    Keyboard.dismiss();
    setLoading(true);
    setError('');
    setRecords([]);

    try {
      const response = await fetch(
        //  `https://legendxdata.site/Api/simdata.php?phone=${input}`
        `https://simdataupdates.com/wp-admin/admin-ajax.php?action=fetch_sim_data&term=${input}`
      );

      const jsonData: ApiResponse = await response.json();

      if (!jsonData.success || !jsonData.records || jsonData.records.length === 0) {
        setError("No records found.");
        return;
      }

      setRecords(jsonData.records);

    } catch (error) {
      console.error('Error fetching data:', error);
      setError('Failed to fetch details. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    if (!input) return; // Only refresh if there's a search input

    setRefreshing(true);
    setError('');

    try {
      const response = await fetch(
        `https://legendxdata.site/Api/simdata.php?phone=${input}`
      );

      const jsonData: ApiResponse = await response.json();

      if (!jsonData.success || !jsonData.records || jsonData.records.length === 0) {
        setError("No records found.");
        setRecords([]);
        return;
      }

      setRecords(jsonData.records);
    } catch (error) {
      console.error('Error refreshing data:', error);
      setError('Failed to refresh. Please try again.');
    } finally {
      setRefreshing(false);
    }
  };

  const captureAndCopy = async (index: number) => {
    try {
      const viewRef = cardRefs.current[index];
      if (!viewRef) return;

      // 1. Capture as Base64 for Clipboard
      const base64 = await captureRef(viewRef, {
        format: 'png',
        quality: 1,
        result: 'base64',
      });

      // 2. Copy to Clipboard
      await Clipboard.setImageAsync(base64);

      Alert.alert('Copied!', 'Snapshot copied to Clipboard.');

    } catch (error) {
      console.error("Snapshot failed", error);
      Alert.alert('Error', 'Failed to copy screenshot.');
    }
  };

  const copyRecordText = async (record: RecordItem, index: number) => {
    try {
      const formattedRecord = `Record ${index + 1}:\nName: ${record.Name}\nPhone: ${record.Mobile}\nCNIC: ${record.CNIC}\nAddress: ${record.Address}\nCountry: ${record.Country}\nMade with ❤ by @GetCrack`;

      await Clipboard.setStringAsync(formattedRecord);
      Alert.alert('Copied!', 'Record details copied to clipboard.');
    } catch (err) {
      Alert.alert('Error', 'Failed to copy record.');
    }
  };

  const copyAllRecords = async () => {
    if (records.length === 0) return;

    try {
      const formattedRecords = records.map((rec, index) => {
        return `Record ${index + 1}:\nName: ${rec.Name}\nPhone: ${rec.Mobile}\nCNIC: ${rec.CNIC}\nAddress: ${rec.Address}\nCountry: ${rec.Country}\nMade with ❤ by @GetCrack`;
      }).join('\n\n-------------------\n\n');

      await Clipboard.setStringAsync(formattedRecords);
      Alert.alert('Success', 'All records copied to clipboard!');
    } catch (err) {
      Alert.alert('Error', 'Failed to copy records.');
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top', 'left', 'right']}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={theme.background} />

      {/* Premium Gradient Header - SettingsScreen Style */}
      <LinearGradient
        colors={['#667eea', '#764ba2']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="chevron-back" size={22} color="#fff" />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Ionicons name="phone-portrait-outline" size={22} color="#fff" style={{ marginRight: 8 }} />
          <Text style={styles.headerTitle}>SIM Tracker</Text>
        </View>

        <View style={styles.headerPlaceholder} />
      </LinearGradient>

      {/* Content */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#667eea']}
              tintColor="#667eea"
            />
          }
        >

          {/* Ultra Compact Search Card */}
          <View style={[styles.searchCard, { backgroundColor: theme.card }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={[styles.inputContainer, { backgroundColor: isDark ? theme.background : '#f8fafc', borderColor: theme.border }]}>
                <TextInput
                  style={[styles.input, { color: theme.text }]}
                  placeholder="Enter CNIC or phone number"
                  placeholderTextColor="#9ca3af"
                  value={input}
                  onChangeText={(text) => {
                    setInput(text);
                    setError('');
                  }}
                  keyboardType="phone-pad"
                  returnKeyType="search"
                  onSubmitEditing={fetchDetails}
                />
              </View>

              <TouchableOpacity
                onPress={fetchDetails}
                disabled={loading}
                activeOpacity={0.8}
                style={{ marginLeft: 8 }}
              >
                <LinearGradient
                  colors={loading ? ['#9ca3af', '#6b7280'] : ['#667eea', '#764ba2']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={[styles.button, loading && styles.buttonDisabled]}
                >
                  <Ionicons name={loading ? "hourglass-outline" : "search"} size={20} color="#fff" />
                </LinearGradient>
              </TouchableOpacity>
            </View>

            {error ? (
              <View style={[styles.errorContainer, { marginTop: 8 }]}>
                <Ionicons name="alert-circle" size={14} color="#dc2626" style={{ marginRight: 6 }} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}
          </View>

          {/* Results Section */}
          {records.length > 0 && (
            <View style={styles.resultsSection}>
              <View style={styles.resultsSectionHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Ionicons name="document-text" size={22} color="#667eea" style={{ marginRight: 10 }} />
                  <Text style={[styles.resultsTitle, { color: theme.text }]}>
                    Found {records.length} Record{records.length > 1 ? 's' : ''}
                  </Text>
                </View>

                {/* Copy All Button */}
                <TouchableOpacity onPress={copyAllRecords} style={styles.copyAllButton}>
                  <Ionicons name="copy-outline" size={16} color="#667eea" style={{ marginRight: 4 }} />
                  <Text style={styles.copyAllText}>Copy All</Text>
                </TouchableOpacity>
              </View>

              {records.map((item, index) => (
                <Pressable
                  key={index}
                  onLongPress={() => copyRecordText(item, index)}
                  delayLongPress={500}
                >
                  <View
                    collapsable={false}
                    ref={(el) => { cardRefs.current[index] = el; }}
                    style={[styles.resultCard, { backgroundColor: theme.card }]}
                  >
                    {/* Card Header */}
                    <LinearGradient
                      colors={['#667eea', '#764ba2']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.cardHeader}
                    >
                      <View style={styles.cardHeaderLeft}>
                        <View style={styles.recordBadge}>
                          <Text style={styles.recordBadgeText}>{index + 1}</Text>
                        </View>
                        <Text style={styles.cardHeaderTitle}>Record Details</Text>
                      </View>
                      <TouchableOpacity
                        style={styles.copyButton}
                        onPress={() => captureAndCopy(index)}
                      >
                        <Ionicons name="camera-outline" size={18} color="#fff" />
                      </TouchableOpacity>
                    </LinearGradient>

                    {/* Card Body */}
                    <View style={styles.cardBody}>
                      <View style={styles.infoRow}>
                        <View style={[styles.infoIconContainer, { backgroundColor: '#dbeafe' }]}>
                          <Ionicons name="person" size={18} color="#3b82f6" />
                        </View>
                        <View style={styles.infoContent}>
                          <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Name</Text>
                          <Text style={[styles.infoValue, { color: theme.text }]}>{item.Name}</Text>
                        </View>
                      </View>

                      <View style={[styles.divider, { backgroundColor: theme.border }]} />

                      <View style={styles.infoRow}>
                        <View style={[styles.infoIconContainer, { backgroundColor: '#dcfce7' }]}>
                          <Ionicons name="call" size={18} color="#10b981" />
                        </View>
                        <View style={styles.infoContent}>
                          <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Phone</Text>
                          <Text style={[styles.infoValue, { color: theme.text }]}>{item.Mobile}</Text>
                        </View>
                      </View>

                      <View style={[styles.divider, { backgroundColor: theme.border }]} />

                      <View style={styles.infoRow}>
                        <View style={[styles.infoIconContainer, { backgroundColor: '#fef3c7' }]}>
                          <Ionicons name="card" size={18} color="#f59e0b" />
                        </View>
                        <View style={styles.infoContent}>
                          <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>CNIC</Text>
                          <Text style={[styles.infoValue, { color: theme.text }]}>{item.CNIC}</Text>
                        </View>
                      </View>

                      <View style={[styles.divider, { backgroundColor: theme.border }]} />

                      <View style={styles.infoRow}>
                        <View style={[styles.infoIconContainer, { backgroundColor: '#fce7f3' }]}>
                          <Ionicons name="location" size={18} color="#ec4899" />
                        </View>
                        <View style={styles.infoContent}>
                          <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Address</Text>
                          <Text style={[styles.infoValue, { color: theme.text }]}>{item.Address}</Text>
                        </View>
                      </View>

                      <View style={[styles.divider, { backgroundColor: theme.border }]} />

                      <View style={styles.infoRow}>
                        <View style={[styles.infoIconContainer, { backgroundColor: '#e0e7ff' }]}>
                          <Ionicons name="globe" size={18} color="#6366f1" />
                        </View>
                        <View style={styles.infoContent}>
                          <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Country</Text>
                          <Text style={[styles.infoValue, { color: theme.text }]}>{item.Country}</Text>
                        </View>
                      </View>
                    </View>
                  </View>
                </Pressable>
              ))}
            </View>
          )}

          {/* Loading State */}
          {loading && (
            <View style={styles.loadingContainer}>
              <View style={[styles.loadingCard, { backgroundColor: theme.card }]}>
                <ActivityIndicator size="large" color="#667eea" />
                <Text style={[styles.loadingText, { color: theme.text }]}>Searching...</Text>
                <Text style={[styles.loadingSubtext, { color: theme.textSecondary }]}>
                  Please wait while we fetch the records
                </Text>
              </View>
            </View>
          )}

          {/* Empty State */}
          {records.length === 0 && !loading && !error && (
            <View style={styles.emptyState}>
              <Ionicons name="search-outline" size={56} color="#667eea" style={{ marginBottom: 16 }} />
              <Text style={[styles.emptyTitle, { color: theme.text }]}>No Records Yet</Text>
              <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
                Enter a CNIC or phone number above to search for SIM records
              </Text>
            </View>
          )}

        </ScrollView>
      </KeyboardAvoidingView>
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
    paddingTop: 8,
    paddingBottom: 12,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 0.3,
  },
  headerPlaceholder: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  searchCard: {
    borderRadius: 20,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 8,
    marginTop: -15,
  },
  inputContainer: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    justifyContent: 'center'
  },
  input: {
    fontSize: 14,
    fontWeight: '500',
    height: '100%',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    padding: 8,
    borderRadius: 8,
  },
  errorText: {
    color: '#dc2626',
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    height: 44,
    width: 44,
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  resultsSection: {
    marginTop: 24,
  },
  resultsSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  resultsTitle: {
    fontSize: 20,
    fontWeight: '800',
  },
  copyAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  copyAllText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#667eea',
  },
  resultCard: {
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 18,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  recordBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  recordBadgeText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
  cardHeaderTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  copyButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardBody: {
    padding: 18,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  infoIconContainer: {
    width: 42,
    height: 42,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoValue: {
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 20,
  },
  divider: {
    height: 1,
    marginLeft: 56,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingCard: {
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 8,
    width: '85%',
  },
  loadingText: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 16,
    marginBottom: 4,
  },
  loadingSubtext: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 40,
  },
});

export default SimTrackerScreen;
