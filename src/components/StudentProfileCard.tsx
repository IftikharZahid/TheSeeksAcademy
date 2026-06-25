import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { scale } from '../utils/responsive';
import { useNavigation } from '@react-navigation/native';

interface StudentProfileCardProps {
  name: string;
  role?: string;
  studentId: string;
  className: string;
  gender: string;
  rollNo: string;
  email: string;
  avatarUrl?: string;
}

export const StudentProfileCard: React.FC<StudentProfileCardProps> = ({
  name,
  role = 'Student',
  studentId,
  className,
  gender,
  rollNo,
  email,
  avatarUrl,
}) => {
  const { theme, isDark } = useTheme();
  const navigation = useNavigation<any>();

  return (
    <View style={[styles.cardContainer, { backgroundColor: theme.card, shadowColor: isDark ? '#000' : '#888' }]}>
      {/* Left Section: Avatar & Basic Info */}
      <View style={styles.leftSection}>
        <TouchableOpacity onPress={() => navigation.navigate('Profile')} activeOpacity={0.8}>
          <View style={styles.avatarContainer}>
            <Image
              source={avatarUrl ? { uri: avatarUrl } : require('../assets/default-profile.png')}
              style={styles.avatarImage}
              contentFit="cover"
            />
            <View style={styles.onlineIndicator} />
          </View>
        </TouchableOpacity>
        
        <Text style={[styles.nameText, { color: theme.text }]} numberOfLines={2}>
          {name}
        </Text>
        
        <View style={styles.roleBadge}>
          <Text style={styles.roleBadgeText}>{role}</Text>
        </View>

        <Text style={[styles.idText, { color: theme.textSecondary }]}>
          ID: {studentId}
        </Text>
      </View>

      {/* Divider */}
      <View style={[styles.divider, { backgroundColor: theme.border }]} />

      {/* Right Section: Details Grid */}
      <View style={styles.rightSection}>
        
        {/* Detail 1: Class */}
        <View style={styles.detailRow}>
          <View style={[styles.iconBox, { backgroundColor: '#e0f2fe' }]}>
            <Ionicons name="book" size={scale(16)} color="#0284c7" />
          </View>
          <View style={styles.detailTextContainer}>
            <Text style={[styles.detailLabel, { color: theme.textTertiary }]}>Class</Text>
            <Text style={[styles.detailValue, { color: theme.text }]} numberOfLines={1}>{className}</Text>
          </View>
        </View>

        {/* Detail 2: Gender/Section */}
        <View style={styles.detailRow}>
          <View style={[styles.iconBox, { backgroundColor: '#f3e8ff' }]}>
            <Ionicons name="person" size={scale(16)} color="#9333ea" />
          </View>
          <View style={styles.detailTextContainer}>
            <Text style={[styles.detailLabel, { color: theme.textTertiary }]}>Gender</Text>
            <Text style={[styles.detailValue, { color: theme.text }]} numberOfLines={1}>{gender}</Text>
          </View>
        </View>

        {/* Detail 3: Roll No */}
        <View style={styles.detailRow}>
          <View style={[styles.iconBox, { backgroundColor: '#dcfce7' }]}>
            <Ionicons name="id-card" size={scale(16)} color="#16a34a" />
          </View>
          <View style={styles.detailTextContainer}>
            <Text style={[styles.detailLabel, { color: theme.textTertiary }]}>Roll No</Text>
            <Text style={[styles.detailValue, { color: theme.text }]} numberOfLines={1}>{rollNo}</Text>
          </View>
        </View>

        {/* Detail 4: Email */}
        <View style={styles.detailRow}>
          <View style={[styles.iconBox, { backgroundColor: '#ffedd5' }]}>
            <Ionicons name="mail" size={scale(16)} color="#ea580c" />
          </View>
          <View style={styles.detailTextContainer}>
            <Text style={[styles.detailLabel, { color: theme.textTertiary }]}>Email</Text>
            <Text style={[styles.detailValue, { color: theme.text }]} numberOfLines={1}>{email}</Text>
          </View>
        </View>

      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    flexDirection: 'row',
    marginHorizontal: scale(16),
    marginTop: scale(16),
    marginBottom: scale(8),
    borderRadius: scale(20),
    padding: scale(16),
    elevation: 4,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  leftSection: {
    flex: 0.45,
    alignItems: 'center',
    justifyContent: 'center',
    paddingRight: scale(12),
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: scale(12),
  },
  avatarImage: {
    width: scale(70),
    height: scale(70),
    borderRadius: scale(35),
    borderWidth: 2,
    borderColor: '#f3f4f6',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: scale(16),
    height: scale(16),
    borderRadius: scale(8),
    backgroundColor: '#22c55e',
    borderWidth: 2,
    borderColor: '#fff',
  },
  nameText: {
    fontSize: scale(16),
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: scale(6),
  },
  roleBadge: {
    backgroundColor: '#a855f7',
    paddingHorizontal: scale(10),
    paddingVertical: scale(4),
    borderRadius: scale(12),
    marginBottom: scale(8),
  },
  roleBadgeText: {
    color: '#fff',
    fontSize: scale(11),
    fontWeight: '700',
  },
  idText: {
    fontSize: scale(11),
    fontWeight: '500',
  },
  divider: {
    width: 1,
    height: '100%',
    opacity: 0.6,
  },
  rightSection: {
    flex: 0.55,
    paddingLeft: scale(16),
    justifyContent: 'space-between',
    gap: scale(12),
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBox: {
    width: scale(32),
    height: scale(32),
    borderRadius: scale(8),
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: scale(10),
  },
  detailTextContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  detailLabel: {
    fontSize: scale(10),
    fontWeight: '500',
    marginBottom: 2,
  },
  detailValue: {
    fontSize: scale(12),
    fontWeight: '700',
  },
});
