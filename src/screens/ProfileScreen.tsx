import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, CommonActions } from '@react-navigation/native';
import { LogoutIcon } from '../components/LogoutIcon';

const { width } = Dimensions.get('window');

export const ProfileScreen: React.FC = () => {
  const navigation = useNavigation();

  const handleLogout = () => {
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: 'Login' }],
      })
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right']}>
      <ScrollView contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>

        {/* Header Section */}
        <View style={styles.header}>
          <View style={styles.circleBackground} />
          
          <TouchableOpacity style={styles.headerLogoutBtn} onPress={handleLogout}>
            <LogoutIcon size={20} color="#ef4444" />
          </TouchableOpacity>
          
          <View style={styles.avatarContainer}>
            <Image
              source={require('../assets/profile.jpg')}
              style={styles.avatar}
            />
          </View>

          <Text style={styles.name}>Iftikhar Zahid</Text>
          <Text style={styles.role}>Student – The Seeks Academy</Text>

          <TouchableOpacity style={styles.editBtn}>
            <Text style={styles.editBtnText}>Edit Profile</Text>
          </TouchableOpacity>
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

        {/* Settings */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Settings</Text>
          <View style={styles.card}>
            <TouchableOpacity style={styles.settingRow}>
              <Text style={styles.settingText}>🔒 Change Password</Text>
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>
            <View style={styles.divider} />

            <TouchableOpacity style={styles.settingRow}>
              <Text style={styles.settingText}>📊 Attendance Log</Text>
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>
            <View style={styles.divider} />

            <TouchableOpacity style={styles.settingRow}>
              <Text style={styles.settingText}>📝 Assignments</Text>
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>
            <View style={styles.divider} />

            <TouchableOpacity style={styles.settingRow}>
              <Text style={styles.settingText}>💬 Messages</Text>
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>
            <View style={styles.divider} />

            <TouchableOpacity style={styles.settingRow}>
              <Text style={styles.settingText}>🔔 Notification Settings</Text>
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>
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

  headerLogoutBtn: {
    position: 'absolute',
    top: 40,
    right: 20,
    backgroundColor: '#ffffff',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
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

  editBtn: {
    backgroundColor: "#8b5cf6", // Primary Purple
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 25,
    shadowColor: '#8b5cf6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },

  editBtnText: {
    color: "#ffffff",
    fontWeight: "700",
    fontSize: 14,
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

  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
  },

  settingText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#374151",
  },

  chevron: {
    fontSize: 18,
    color: "#9ca3af",
    fontWeight: "600",
  },
});
