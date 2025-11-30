import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, CommonActions } from '@react-navigation/native';

import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ProfileStackParamList } from './navigation/ProfileStack';
import { useTheme } from '../context/ThemeContext';

const { width } = Dimensions.get('window');

type ProfileScreenNavigationProp = NativeStackNavigationProp<ProfileStackParamList, 'ProfileScreen'>;

export const ProfileScreen: React.FC = () => {
  const navigation = useNavigation<ProfileScreenNavigationProp>();
  const { theme } = useTheme();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.backgroundSecondary }]} edges={['left', 'right']}>
      {/* Header Section */}
      <View style={styles.header}>
        <View style={styles.circleBackground} />
        
        <View style={styles.avatarContainer}>
          <Image
            source={require('../assets/profile.jpg')}
            style={styles.avatar}
          />
        </View>

        <Text style={[styles.name, { color: theme.text }]}>Iftikhar Zahid</Text>
        <Text style={[styles.role, { color: theme.textSecondary }]}>Student – The Seeks Academy</Text>

        <View style={styles.headerDivider} />
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        {/* Personal Info */}
        <View style={styles.sectionContainer}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Personal Information</Text>
          <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Full Name</Text>
              <Text style={[styles.infoValue, { color: theme.text }]}>Iftikhar Zahid</Text>
            </View>
            <View style={[styles.divider, { backgroundColor: theme.border }]} />

            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Email</Text>
              <Text style={[styles.infoValue, { color: theme.text }]}>IftikharXahhid@gmail.com</Text>
            </View>
            <View style={[styles.divider, { backgroundColor: theme.border }]} />

            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Phone</Text>
              <Text style={[styles.infoValue, { color: theme.text }]}>+92 300 7971374</Text>
            </View>
            <View style={[styles.divider, { backgroundColor: theme.border }]} />

            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Date of Birth</Text>
              <Text style={[styles.infoValue, { color: theme.text }]}>12 Aug 2000</Text>
            </View>
          </View>
        </View>

        {/* Academic Info */}
        <View style={styles.sectionContainer}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Academic Information</Text>
          <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Roll Number</Text>
              <Text style={[styles.infoValue, { color: theme.text }]}>SA-2025-001</Text>
            </View>
            <View style={[styles.divider, { backgroundColor: theme.border }]} />

            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Class</Text>
              <Text style={[styles.infoValue, { color: theme.text }]}>BSCS</Text>
            </View>
            <View style={[styles.divider, { backgroundColor: theme.border }]} />

            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Section</Text>
              <Text style={[styles.infoValue, { color: theme.text }]}>A</Text>
            </View>
            <View style={[styles.divider, { backgroundColor: theme.border }]} />

            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Session</Text>
              <Text style={[styles.infoValue, { color: theme.text }]}>2024 – 2028</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
  },

  header: {
    alignItems: "center",
    paddingTop: 40,
    paddingBottom: 20,
    position: 'relative',
    marginBottom: 5,
  },

  circleBackground: {
    position: 'absolute',
    width: width * 1.2,
    height: width * 1.2,
    borderRadius: (width * 1.2) / 2,
    backgroundColor: '#8b5cf6', // Light gray/purple tint matching Welcome screen
    top: -width * 0.8,
    zIndex: -1,
  },

  avatarContainer: {
    padding: 4,
    backgroundColor: '#ffffff',
    borderRadius: 50,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    marginBottom: 15,
  },

  avatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
  },

  name: {
    fontSize: 22,
    fontWeight: "800",
    color: "#1f2937",
    marginBottom: 4,
  },

  role: {
    fontSize: 14,
    color: "#6b7280",
    marginBottom: 16,
  },

  headerDivider: {
    width: '80%',
    height: 1,
    backgroundColor: '#e5e7eb',
    marginTop:1,
    marginBottom: 1,
  },

  sectionContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#374151",
    marginBottom: 12,
    marginLeft: 4,
  },

  card: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#f3f4f6",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },

  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },

  infoLabel: {
    fontSize: 14,
    color: "#6b7280",
    fontWeight: "500",
  },

  infoValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1f2937",
  },

  divider: {
    height: 1,
    backgroundColor: "#f3f4f6",
  },
});
