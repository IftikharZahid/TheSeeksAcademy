import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { notices } from '../screens/NoticesScreen';

export const TopHeader: React.FC<{ title?: string; onBell?: () => void; notificationCount?: number }> = ({ title = 'Home', onBell, notificationCount }) => {
  const navigation = useNavigation<any>();
  
  const handleBellPress = () => {
    if (onBell) {
      onBell();
    } else {
      // Navigate to NoticeBoard tab in MainTabs
      navigation.navigate('NoticeBoard');
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'Good Morning 🌄';
    if (hour >= 12 && hour < 13) return 'Good Noon 🌞';
    if (hour >= 13 && hour < 17) return 'Good Afternoon 🌤️';
    if (hour >= 17 && hour < 20) return 'Good Evening 🌃';
    return 'Good Night, Sweet Dreams 🌌';
  };

  const count = notificationCount !== undefined ? notificationCount : notices.length;

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.leftSection}>
          <View style={styles.avatar}>
            <Image source={require('../assets/profile.jpg')} style={styles.avatarImage} />
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>Iftikhar Zahid</Text>
            <Text style={styles.greetingText}>{getGreeting()}</Text>
          </View>
        </View>
        <View style={styles.rightSection}>
          <TouchableOpacity onPress={handleBellPress} style={styles.iconButton}>
            <Text style={{ fontSize: 20 }}>🔔</Text>
            {count > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{count > 9 ? '9+' : count}</Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('Home', { screen: 'SettingsScreen' })} style={styles.iconButton}>
            <Text style={{ fontSize: 20 }}>⚙️</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: '#ffffff',
  },
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 8,
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  userInfo: {
    marginLeft: 12,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  greetingText: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  iconButton: {
    padding: 8,
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#ef4444',
    borderRadius: 10,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 2,
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: 'bold',
  },
});