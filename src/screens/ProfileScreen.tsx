import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, CommonActions } from '@react-navigation/native';

import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ProfileStackParamList } from './navigation/ProfileStack';

const { width } = Dimensions.get('window');

type ProfileScreenNavigationProp = NativeStackNavigationProp<ProfileStackParamList, 'ProfileScreen'>;

export const ProfileScreen: React.FC = () => {
  const navigation = useNavigation<ProfileScreenNavigationProp>();



  return (
    <SafeAreaView style={styles.container} edges={['left', 'right']}>
      <ScrollView contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>

        {/* Header Section */}
        <View style={styles.header}>
          <View style={styles.circleBackground} />
          

          
          <View style={styles.avatarContainer}>
            <Image
              source={require('../assets/profile.jpg')}
              style={styles.avatar}
            />
          </View>

          <Text style={styles.name}>Iftikhar Zahid</Text>
          <Text style={styles.role}>Student – The Seeks Academy</Text>

          <View style={styles.headerDivider} />
        </View>

        {/* Personal Info */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Personal Information</Text>
          <View style={styles.card}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Full Name</Text>
              <Text style={styles.infoValue}>Iftikhar Zahid</Text>
            </View>
            <View style={styles.divider} />

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Email</Text>
              <Text style={styles.infoValue}>IftikharXahhid@gmail.com</Text>
            </View>
            <View style={styles.divider} />

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Phone</Text>
              <Text style={styles.infoValue}>+92 300 7971374</Text>
            </View>
            <View style={styles.divider} />

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Date of Birth</Text>
              <Text style={styles.infoValue}>12 Aug 2000</Text>
            </View>
          </View>
        </View>

        {/* Academic Info */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Academic Information</Text>
          <View style={styles.card}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Roll Number</Text>
              <Text style={styles.infoValue}>SA-2025-001</Text>
            </View>
            <View style={styles.divider} />

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Class</Text>
              <Text style={styles.infoValue}>BSCS</Text>
            </View>
            <View style={styles.divider} />

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Section</Text>
              <Text style={styles.infoValue}>A</Text>
            </View>
            <View style={styles.divider} />

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Session</Text>
              <Text style={styles.infoValue}>2024 – 2028</Text>
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
    paddingBottom: 30,
    position: 'relative',
    marginBottom: 10,
  },

  circleBackground: {
    position: 'absolute',
    width: width * 1.2,
    height: width * 1.2,
    borderRadius: (width * 1.2) / 2,
    backgroundColor: '#f3f4f6', // Light gray/purple tint matching Welcome screen
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
    marginBottom: 16,
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
    marginTop: 16,
    marginBottom: 8,
  },

  sectionContainer: {
    paddingHorizontal: 20,
    marginBottom: 24,
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
