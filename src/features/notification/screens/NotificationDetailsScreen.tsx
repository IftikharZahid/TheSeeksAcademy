import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Share, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../../context/ThemeContext';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { PushNotification } from '../types';
import * as Clipboard from 'expo-clipboard';

type RouteParams = {
    params: {
        notification: PushNotification;
    };
};

export const NotificationDetailsScreen: React.FC = () => {
    const { theme } = useTheme();
    const navigation = useNavigation();
    const route = useRoute<RouteProp<RouteParams, 'params'>>();
    const { notification } = route.params;

    const handleShare = async () => {
        try {
            await Share.share({
                message: `${notification.title}\n\n${notification.message}`,
            });
        } catch (error) {
            console.error(error);
        }
    };

    const handleCopy = async () => {
        await Clipboard.setStringAsync(notification.message);
    };

    const openPdf = () => {
        if (notification.pdfUrl) {
            Linking.openURL(notification.pdfUrl);
        }
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
            <View style={[styles.header, { borderBottomColor: theme.border }]}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <MaterialIcons name="arrow-back" size={24} color={theme.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: theme.text }]}>Details</Text>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                {notification.imageUrl && (
                    <Image source={{ uri: notification.imageUrl }} style={styles.banner} />
                )}

                <View style={styles.content}>
                    <Text style={[styles.title, { color: theme.text }]}>{notification.title}</Text>
                    
                    <View style={styles.meta}>
                        <View style={styles.metaItem}>
                            <MaterialIcons name="schedule" size={16} color={theme.text + '60'} />
                            <Text style={[styles.metaText, { color: theme.text + '60' }]}>
                                {notification.createdAt?.toDate 
                                    ? notification.createdAt.toDate().toLocaleString()
                                    : 'Just now'}
                            </Text>
                        </View>
                        {notification.priority !== 'Normal' && (
                            <View style={styles.metaItem}>
                                <MaterialIcons name="flag" size={16} color={theme.error} />
                                <Text style={[styles.metaText, { color: theme.error }]}>
                                    {notification.priority}
                                </Text>
                            </View>
                        )}
                    </View>

                    <Text style={[styles.message, { color: theme.text + '90' }]}>
                        {notification.message}
                    </Text>

                    {notification.pdfUrl && (
                        <TouchableOpacity 
                            onPress={openPdf}
                            style={[styles.attachmentBtn, { backgroundColor: theme.primary + '10', borderColor: theme.primary + '30' }]}
                        >
                            <MaterialIcons name="picture-as-pdf" size={24} color={theme.primary} />
                            <Text style={[styles.attachmentText, { color: theme.primary }]}>View Attached PDF</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </ScrollView>

            <View style={[styles.footer, { borderTopColor: theme.border, backgroundColor: theme.card }]}>
                <TouchableOpacity style={styles.footerBtn} onPress={handleCopy}>
                    <MaterialIcons name="content-copy" size={20} color={theme.text} />
                    <Text style={[styles.footerBtnText, { color: theme.text }]}>Copy</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.footerBtn} onPress={handleShare}>
                    <MaterialIcons name="share" size={20} color={theme.text} />
                    <Text style={[styles.footerBtnText, { color: theme.text }]}>Share</Text>
                </TouchableOpacity>
            </View>
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
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
    },
    backButton: {
        padding: 4,
        marginRight: 12,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        flex: 1,
    },
    scrollContent: {
        paddingBottom: 40,
    },
    banner: {
        width: '100%',
        height: 200,
        backgroundColor: '#000',
    },
    content: {
        padding: 24,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 16,
        lineHeight: 32,
    },
    meta: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
        marginBottom: 24,
        paddingBottom: 24,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(150,150,150,0.2)',
    },
    metaItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    metaText: {
        fontSize: 14,
        fontWeight: '500',
    },
    message: {
        fontSize: 16,
        lineHeight: 26,
    },
    attachmentBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginTop: 32,
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
    },
    attachmentText: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    footer: {
        flexDirection: 'row',
        borderTopWidth: 1,
        paddingBottom: 20,
        paddingTop: 12,
        paddingHorizontal: 16,
    },
    footerBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 12,
    },
    footerBtnText: {
        fontSize: 16,
        fontWeight: '500',
    }
});
