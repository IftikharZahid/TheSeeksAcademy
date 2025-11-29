import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LogoutIcon } from '../components/LogoutIcon';

export const ProfileScreen: React.FC = () => {
  return (
    <SafeAreaView style={styles.container} edges={['left', 'right']}>
      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>

        {/* Header Section */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.headerLogoutBtn}>
            <LogoutIcon size={20} color="#FF3B30" />
          </TouchableOpacity>
          <Image
            source={require('../assets/profile.jpg')}
            style={styles.avatar}
          />

          <Text style={styles.name}>Iftikhar Zahid</Text>
          <Text style={styles.role}>Student – The Seeks Academy</Text>

          <TouchableOpacity style={styles.editBtn}>
            <Text style={styles.editBtnText}>Edit Profile</Text>
          </TouchableOpacity>
        </View>

        {/* Personal Info */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Personal Information</Text>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Full Name</Text>
            <Text style={styles.infoValue}>Iftikhar Zahid</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Email</Text>
            <Text style={styles.infoValue}>iftikharXahhid@gmail.com</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Phone</Text>
            <Text style={styles.infoValue}>+92 300 7971374</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Date of Birth</Text>
            <Text style={styles.infoValue}>12 Aug 2000</Text>
          </View>
        </View>

        {/* Academic Info */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Academic Information</Text>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Roll Number</Text>
            <Text style={styles.infoValue}>SA-2025-001</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Class</Text>
            <Text style={styles.infoValue}>BSCS</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Section</Text>
            <Text style={styles.infoValue}>A</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Session</Text>
            <Text style={styles.infoValue}>2024 – 2028</Text>
          </View>
        </View>

        {/* Settings */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Settings</Text>

          <TouchableOpacity style={styles.settingRow}>
            <Text style={styles.settingText}>🔒 Change Password</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingRow}>
            <Text style={styles.settingText}>📊 Attendance Log</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingRow}>
            <Text style={styles.settingText}>📝 Assignments</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingRow}>
            <Text style={styles.settingText}>💬 Messages</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingRow}>
            <Text style={styles.settingText}>🔔 Notification Settings</Text>
          </TouchableOpacity>
        </View>

        {/* Logout */}


      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F7FA",
  },

  header: {
    alignItems: "center",
    paddingVertical: 30,
    backgroundColor: "#1E66FF",
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    marginBottom: 20,
  },

  avatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 2,
    borderColor: "#fff",
    marginBottom: 10,
    marginTop:15,
  },

  name: {
    fontSize: 20,
    fontWeight: "700",
    color: "#fff",
  },

  role: {
    fontSize: 13,
    color: "#E5ECFF",
    marginTop: 4,
  },

  editBtn: {
    marginTop: 12,
    backgroundColor: "#ffffff",
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
  },

  editBtnText: {
    color: "#1E66FF",
    fontWeight: "600",
  },

  card: {
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },

  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 12,
  },

  infoRow: {
    marginBottom: 10,
  },

  infoLabel: {
    fontSize: 12,
    color: "#6B7280",
  },

  infoValue: {
    fontSize: 14,
    fontWeight: "600",
    marginTop: 2,
  },

  settingRow: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },

  settingText: {
    fontSize: 14,
    fontWeight: "600",
  },

  headerLogoutBtn: {
    position: 'absolute',
    top: 40,
    right: 20, // Moved to right
    zIndex: 10,
    backgroundColor: '#ffffff', // White background
    width: 40,
    height: 40,
    borderRadius: 20, // Circular
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 5,
  },

  headerLogoutText: {
    color: '#FF3B30', // Red icon
    fontSize: 18,
    fontWeight: 'bold',
  },
});
