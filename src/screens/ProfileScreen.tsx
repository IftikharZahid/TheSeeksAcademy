import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export const ProfileScreen: React.FC = () => {
  return (
    <SafeAreaView style={styles.container} edges={['left', 'right']}>
      <ScrollView contentContainerStyle={{ paddingBottom: 0 }}>

        {/* Header Section */}
        <View style={styles.header}>
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
        <TouchableOpacity style={styles.logoutBtn}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>

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

  logoutBtn: {
    backgroundColor: "#FF4B4B",
    padding: 14,
    marginHorizontal: 16,
    borderRadius: 12,
    marginBottom: 40,
    marginTop: 10,
  },

  logoutText: {
    color: "#fff",
    fontWeight: "700",
    textAlign: "center",
    fontSize: 16,
  },
});
