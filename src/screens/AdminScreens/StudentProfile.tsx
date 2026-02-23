import React from 'react';
import {  View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, Dimensions, SafeAreaView , StatusBar } from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';
import { scale } from '../../utils/responsive';
import * as Clipboard from 'expo-clipboard';

// Define the params list locally or import if centralized
type RootStackParamList = {
    AdminStudentRecords: undefined;
    StudentProfile: { student: any }; // Using any for flexibility, or import AdminStudent interface
};

type StudentProfileRouteProp = RouteProp<RootStackParamList, 'StudentProfile'>;

export const StudentProfile: React.FC = () => {
    const route = useRoute<StudentProfileRouteProp>();
    const navigation = useNavigation();
    const { theme, isDark } = useTheme();
    const { student } = route.params;

    const copyToClipboard = async (text: string, label: string) => {
        if (text) {
            await Clipboard.setStringAsync(text);
            // Optional: Show a toast or small alert
        }
    };

    const InfoRow = ({ icon, label, value, copyable = false }: { icon: string; label: string; value: string; copyable?: boolean }) => (
        <TouchableOpacity
            style={[styles.infoRow, { backgroundColor: theme.card }]}
            activeOpacity={copyable ? 0.7 : 1}
            onPress={() => copyable && copyToClipboard(value, label)}
        >
            <View style={[styles.iconContainer, { backgroundColor: theme.primary + '15' }]}>
                <Ionicons name={icon as any} size={20} color={theme.primary} />
            </View>
            <View style={styles.infoContent}>
                <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>{label}</Text>
                <Text style={[styles.infoValue, { color: theme.text }]}>{value || 'N/A'}</Text>
            </View>
            {copyable && (
                <Ionicons name="copy-outline" size={16} color={theme.textSecondary} />
            )}
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={theme.background} />
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Student Profile</Text>
                <View style={{ width: 24 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {/* Profile Header Card */}
                <LinearGradient
                    colors={[theme.primary, theme.primary + '90']}
                    style={styles.profileHeader}
                >
                    <View style={styles.profileImageContainer}>
                        {student.profileImage ? (
                            <Image source={{ uri: student.profileImage }} style={styles.profileImage} />
                        ) : (
                            <Image source={require('../../assets/default-profile.png')} style={styles.profileImage} />
                        )}
                    </View>
                    <Text style={styles.name}>{student.name}</Text>
                    <Text style={styles.subText}>{student.studentId} • {student.grade}</Text>
                </LinearGradient>

                {/* Details Section */}
                <View style={styles.detailsContainer}>
                    <Text style={[styles.sectionTitle, { color: theme.text }]}>Personal Information</Text>

                    <InfoRow icon="person" label="Full Name" value={student.name} copyable />
                    <InfoRow icon="people" label="Father Name" value={student.fatherName} copyable />
                    <InfoRow icon="male-female" label="Gender" value={student.gender} />
                    <InfoRow icon="calendar" label="Date of Birth" value={student.dateofbirth} />

                    <View style={styles.divider} />

                    <Text style={[styles.sectionTitle, { color: theme.text }]}>Academic Details</Text>
                    <InfoRow icon="id-card" label="Roll No / ID" value={student.studentId} copyable />
                    <InfoRow icon="school" label="Class / Grade" value={student.grade} />
                    <InfoRow icon="time" label="Session" value={student.session || '2025-2026'} />
                    <InfoRow icon="layers" label="Section" value={student.section || 'A'} />

                    <View style={styles.divider} />

                    <Text style={[styles.sectionTitle, { color: theme.text }]}>Contact & Account</Text>
                    <InfoRow icon="mail" label="Email" value={student.email} copyable />
                    <InfoRow icon="call" label="Phone" value={student.phone} copyable />
                    <InfoRow icon="key" label="Password" value={student.password} copyable />
                    <InfoRow icon="location" label="Address" value={student.address} />

                </View>
            </ScrollView>
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
        paddingHorizontal: scale(16),
        paddingVertical: scale(12),
        backgroundColor: '#4f46e5', // Fixed color to match gradient or theme primary 
        // We'll override this with inline style if needed, but keeping it simple for now
    },
    backButton: {
        padding: 4,
    },
    headerTitle: {
        fontSize: scale(18),
        fontWeight: 'bold',
        color: '#fff',
    },
    scrollContent: {
        paddingBottom: scale(20),
    },
    profileHeader: {
        alignItems: 'center',
        paddingVertical: scale(24),
        borderBottomLeftRadius: scale(30),
        borderBottomRightRadius: scale(30),
        marginBottom: scale(16),
    },
    profileImageContainer: {
        width: scale(110),
        height: scale(110),
        borderRadius: scale(55),
        borderWidth: 4,
        borderColor: '#fff',
        overflow: 'hidden',
        marginBottom: scale(12),
        backgroundColor: '#e0e7ff',
        justifyContent: 'center',
        alignItems: 'center',
    },
    profileImage: {
        width: '100%',
        height: '100%',
    },
    name: {
        fontSize: scale(22),
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: scale(4),
    },
    subText: {
        fontSize: scale(14),
        color: '#e0e7ff',
        opacity: 0.9,
    },
    detailsContainer: {
        paddingHorizontal: scale(16),
    },
    sectionTitle: {
        fontSize: scale(16),
        fontWeight: '700',
        marginBottom: scale(12),
        marginTop: scale(12),
        opacity: 0.8,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: scale(12),
        borderRadius: scale(12),
        marginBottom: scale(10),
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    iconContainer: {
        width: scale(36),
        height: scale(36),
        borderRadius: scale(18),
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: scale(12),
    },
    infoContent: {
        flex: 1,
    },
    infoLabel: {
        fontSize: scale(12),
        marginBottom: scale(2),
    },
    infoValue: {
        fontSize: scale(14),
        fontWeight: '600',
    },
    divider: {
        height: 1,
        backgroundColor: '#ccc', // Use theme border if possible
        opacity: 0.2,
        marginVertical: scale(8),
    },
});
