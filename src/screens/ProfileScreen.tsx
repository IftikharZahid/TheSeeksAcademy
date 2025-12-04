import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView, Dimensions, ActivityIndicator, RefreshControl } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ProfileStackParamList } from './navigation/ProfileStack';
import { useTheme } from '../context/ThemeContext';
import { auth, db } from '../api/firebaseConfig';
import { collection, query, where, getDocs } from 'firebase/firestore';

const { width } = Dimensions.get('window');

type ProfileScreenNavigationProp = NativeStackNavigationProp<ProfileStackParamList, 'ProfileScreen'>;

interface ProfileData {
  fullname: string;
  email: string;
  phone: string;
  dateofbirth: string;
  rollno: string;
  class: string;
  section: string;
  session: string;
  image: string;
  role?: string;
}

export const ProfileScreen: React.FC = () => {
  const navigation = useNavigation<ProfileScreenNavigationProp>();
  const { theme } = useTheme();
  const user = auth.currentUser;
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      fetchUserData();
    }, [])
  );

  const fetchUserData = async () => {
    if (!user?.email) {
      setLoading(false);
      return;
    }

    const cacheKey = `user_profile_${user.email}`;

    try {
      if (!refreshing) setLoading(true);

      // Try to load from cache first
      const cachedProfile = await AsyncStorage.getItem(cacheKey);
      if (cachedProfile) {
        setProfileData(JSON.parse(cachedProfile));
        setLoading(false); // Show cached content immediately
      }

      // Query the 'profile' collection where email matches the logged-in user's email
      const q = query(collection(db, "profile"), where("email", "==", user.email));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const docData = querySnapshot.docs[0].data() as ProfileData;
        setProfileData(docData);
        await AsyncStorage.setItem(cacheKey, JSON.stringify(docData));
      } else {
        console.log("No profile found for this email:", user.email);
        setProfileData(null);
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchUserData();
    setRefreshing(false);
  }, []);

  const displayName = profileData?.fullname || user?.displayName || 'Student';
  const displayEmail = profileData?.email || user?.email || 'Not set';
  const displayImage = profileData?.image || user?.photoURL;
  const displayRole = profileData?.role || 'Loading';
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.backgroundSecondary }]} edges={['left', 'right']}>
      {/* Header Section */}
      <View style={styles.header}>
        <View style={styles.circleBackground} />
        
        <View style={styles.avatarContainer}>
          <Image
            source={displayImage ? { uri: displayImage } : require('../assets/default-profile.png')}
            defaultSource={require('../assets/default-profile.png')}
            style={styles.avatar}
          />
        </View>

        <Text style={[styles.name, { color: theme.text }]}>{displayName}</Text>
        <Text style={[styles.role, { color: theme.textSecondary }]}>{displayRole}</Text>

        <View style={styles.headerDivider} />
      </View>

      <ScrollView 
        contentContainerStyle={{ paddingBottom: 100 }} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />
        }
      >
        {loading && !refreshing ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.primary} />
          </View>
        ) : (
          <>
            {/* Personal Info */}
            <View style={styles.sectionContainer}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Personal Information</Text>
              <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <View style={styles.infoRow}>
                  <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Full Name</Text>
                  <Text style={[styles.infoValue, { color: theme.text }]}>{displayName}</Text>
                </View>
                <View style={[styles.divider, { backgroundColor: theme.border }]} />

                <View style={styles.infoRow}>
                  <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Email</Text>
                  <Text style={[styles.infoValue, { color: theme.text }]}>{displayEmail}</Text>
                </View>
                <View style={[styles.divider, { backgroundColor: theme.border }]} />

                <View style={styles.infoRow}>
                  <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Phone</Text>
                  <Text style={[styles.infoValue, { color: theme.text }]}>{profileData?.phone || 'Not set'}</Text>
                </View>
                <View style={[styles.divider, { backgroundColor: theme.border }]} />

                <View style={styles.infoRow}>
                  <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Date of Birth</Text>
                  <Text style={[styles.infoValue, { color: theme.text }]}>{profileData?.dateofbirth || 'Not set'}</Text>
                </View>
              </View>
            </View>

            {/* Academic Info */}
            <View style={styles.sectionContainer}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Academic Information</Text>
              <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <View style={styles.infoRow}>
                  <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Roll Number</Text>
                  <Text style={[styles.infoValue, { color: theme.text }]}>{profileData?.rollno || 'Not set'}</Text>
                </View>
                <View style={[styles.divider, { backgroundColor: theme.border }]} />

                <View style={styles.infoRow}>
                  <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Class</Text>
                  <Text style={[styles.infoValue, { color: theme.text }]}>{profileData?.class || 'Not set'}</Text>
                </View>
                <View style={[styles.divider, { backgroundColor: theme.border }]} />

                <View style={styles.infoRow}>
                  <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Section</Text>
                  <Text style={[styles.infoValue, { color: theme.text }]}>{profileData?.section || 'Not set'}</Text>
                </View>
                <View style={[styles.divider, { backgroundColor: theme.border }]} />

                <View style={styles.infoRow}>
                  <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Session</Text>
                  <Text style={[styles.infoValue, { color: theme.text }]}>{profileData?.session || 'Not set'}</Text>
                </View>
              </View>
            </View>
          </>
        )}
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

  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
});
