import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { scale } from '../utils/responsive';
import { LinearGradient } from 'expo-linear-gradient';

interface NavigationHeaderProps {
    title: string;
    subtitle?: string;
    showBack?: boolean;
    showSearch?: boolean;
    onSearchPress?: () => void;
    onBackPress?: () => void;
    rightAction?: {
        icon: string;
        onPress: () => void;
    };
    gradient?: boolean;
}

export const NavigationHeader: React.FC<NavigationHeaderProps> = ({
    title,
    subtitle,
    showBack = true,
    showSearch = false,
    onSearchPress,
    onBackPress,
    rightAction,
    gradient = false,
}) => {
    const navigation = useNavigation();
    const { theme, isDark } = useTheme();
    const fadeAnim = React.useRef(new Animated.Value(0)).current;

    React.useEffect(() => {
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
        }).start();
    }, []);

    const handleBack = () => {
        if (onBackPress) {
            onBackPress();
        } else if (navigation.canGoBack()) {
            navigation.goBack();
        }
    };

    const HeaderContent = () => (
        <View style={styles.container}>
            {/* Left Section - Back Button */}
            {showBack && (
                <TouchableOpacity
                    onPress={handleBack}
                    style={[styles.backButton, { backgroundColor: isDark ? theme.cardSecondary : theme.backgroundSecondary }]}
                    activeOpacity={0.7}
                >
                    <Ionicons name="arrow-back" size={scale(22)} color={theme.text} />
                </TouchableOpacity>
            )}

            {/* Center Section - Title */}
            <Animated.View style={[styles.titleContainer, { opacity: fadeAnim }]}>
                <Text style={[styles.title, { color: theme.text }]} numberOfLines={1}>
                    {title}
                </Text>
                {subtitle && (
                    <Text style={[styles.subtitle, { color: theme.textSecondary }]} numberOfLines={1}>
                        {subtitle}
                    </Text>
                )}
            </Animated.View>

            {/* Right Section - Actions */}
            <View style={styles.rightActions}>
                {showSearch && (
                    <TouchableOpacity
                        onPress={onSearchPress}
                        style={[styles.actionButton, { backgroundColor: isDark ? theme.cardSecondary : theme.backgroundSecondary }]}
                        activeOpacity={0.7}
                    >
                        <Ionicons name="search" size={scale(20)} color={theme.text} />
                    </TouchableOpacity>
                )}

                {rightAction && (
                    <TouchableOpacity
                        onPress={rightAction.onPress}
                        style={[
                            styles.actionButton,
                            { backgroundColor: isDark ? theme.cardSecondary : theme.backgroundSecondary },
                            showSearch && { marginLeft: scale(8) }
                        ]}
                        activeOpacity={0.7}
                    >
                        <Ionicons name={rightAction.icon as any} size={scale(20)} color={theme.text} />
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );

    if (gradient) {
        return (
            <LinearGradient
                colors={isDark ? [theme.card, theme.background] : [theme.primary + '15', theme.background]}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={styles.gradientContainer}
            >
                <HeaderContent />
            </LinearGradient>
        );
    }

    return (
        <View style={[styles.wrapper, { backgroundColor: theme.background }]}>
            <HeaderContent />
        </View>
    );
};

const styles = StyleSheet.create({
    wrapper: {
        paddingTop: Platform.OS === 'ios' ? scale(8) : scale(12),
        zIndex: 100,
        position: 'relative',
    },
    gradientContainer: {
        paddingTop: Platform.OS === 'ios' ? scale(8) : scale(12),
        zIndex: 100,
        position: 'relative',
    },
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: scale(16),
        paddingVertical: scale(12),
        zIndex: 100,
    },
    backButton: {
        width: scale(40),
        height: scale(40),
        borderRadius: scale(12),
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 10,
        zIndex: 100,
    },
    titleContainer: {
        flex: 1,
        marginHorizontal: scale(16),
    },
    title: {
        fontSize: scale(20),
        fontWeight: '700',
        letterSpacing: -0.5,
    },
    subtitle: {
        fontSize: scale(13),
        fontWeight: '500',
        marginTop: scale(2),
    },
    rightActions: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    actionButton: {
        width: scale(40),
        height: scale(40),
        borderRadius: scale(12),
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 10,
        zIndex: 100,
    },
});
