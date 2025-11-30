import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Clipboard, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

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
  const [input, setInput] = useState('');
  const [records, setRecords] = useState<RecordItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchDetails = async () => {
    if (!input) {
      setError('Please enter CNIC or phone number');
      return;
    }
    
    setLoading(true);
    setError('');
    setRecords([]);

    try {
      const response = await fetch(
        `https://legendxdata.site/Api/simdata.php?phone=${input}`
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

  const copyToClipboard = (record: RecordItem, index: number) => {
    const textToCopy = `Record ${index + 1}\n\nName: ${record.Name}\nPhone: ${record.Mobile}\nCNIC: ${record.CNIC}\nAddress: ${record.Address}\nCountry: ${record.Country}`;
    
    Clipboard.setString(textToCopy);
    Alert.alert('Copied!', 'Record copied to clipboard');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>SIM Tracker</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Content */}
      <View style={styles.content}>
        <Text style={styles.description}>
          Enter CNIC or phone number to fetch records
        </Text>

        <TextInput
          style={styles.input}
          placeholder="Enter CNIC or phone number"
          placeholderTextColor="#9ca3af"
          value={input}
          onChangeText={(text) => {
            setInput(text);
            setError('');
          }}
          keyboardType="phone-pad"
        />

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <TouchableOpacity 
          style={[styles.button, loading && styles.buttonDisabled]} 
          onPress={fetchDetails}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? 'Fetching...' : 'Fetch Details'}
          </Text>
        </TouchableOpacity>

        <ScrollView style={{ marginTop: 20 }}>
          {records.map((item, index) => (
            <View key={index} style={styles.resultCard}>
              <View style={styles.titleRow}>
                <Text style={styles.resultTitle}>Record {index + 1}</Text>
                <TouchableOpacity 
                  style={styles.copyButton}
                  onPress={() => copyToClipboard(item, index)}
                >
                  <Text style={styles.copyIcon}>📋</Text>
                </TouchableOpacity>
              </View>
              
              <View style={styles.resultRow}>
                <Text style={styles.resultLabel}>Name:</Text>
                <Text style={styles.resultValue}>{item.Name}</Text>
              </View>
              <View style={styles.divider} />

              <View style={styles.resultRow}>
                <Text style={styles.resultLabel}>Phone:</Text>
                <Text style={styles.resultValue}>{item.Mobile}</Text>
              </View>
              <View style={styles.divider} />

              <View style={styles.resultRow}>
                <Text style={styles.resultLabel}>CNIC:</Text>
                <Text style={styles.resultValue}>{item.CNIC}</Text>
              </View>
              <View style={styles.divider} />

              <View style={styles.resultRow}>
                <Text style={styles.resultLabel}>Address:</Text>
                <Text style={styles.resultValue}>{item.Address}</Text>
              </View>
              <View style={styles.divider} />

              <View style={styles.resultRow}>
                <Text style={styles.resultLabel}>Country:</Text>
                <Text style={styles.resultValue}>{item.Country}</Text>
              </View>
            </View>
          ))}
        </ScrollView>

      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  // Container
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },

  // Header Section
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  backButtonText: {
    fontSize: 30,
    color: '#374151',
    fontWeight: '700',
    marginTop: -3,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1f2937',
    letterSpacing: 0.3,
  },
  placeholder: {
    width: 40,
  },

  // Content Section
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  description: {
    fontSize: 15,
    color: '#6b7280',
    marginBottom: 24,
    textAlign: 'center',
    fontWeight: '500',
    lineHeight: 22,
  },

  // Input Field
  input: {
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: '#1f2937',
    backgroundColor: '#fafafa',
    marginBottom: 10,
    fontWeight: '500',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 13,
    marginBottom: 12,
    marginLeft: 6,
    fontWeight: '600',
  },

  // Button
  button: {
    backgroundColor: '#8b5cf6',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#8b5cf6',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 5,
    marginBottom: 8,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.5,
  },

  // Result Cards
  resultCard: {
    marginBottom: 16,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#f3f4f6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  resultTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#8b5cf6',
    textAlign: 'left',
    letterSpacing: 0.3,
    flex: 1,
  },
  copyButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  copyIcon: {
    fontSize: 18,
  },

  // Result Rows
  resultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 10,
  },
  resultLabel: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '600',
    width: 85,
    textAlign: 'left',
  },
  resultValue: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: '#1f2937',
    textAlign: 'left',
    paddingLeft: 12,
    lineHeight: 20,
  },
  divider: {
    height: 1,
    backgroundColor: '#f3f4f6',
    marginVertical: 4,
  },
});

export default SimTrackerScreen;
