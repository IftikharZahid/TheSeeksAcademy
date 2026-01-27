import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { useNavigation, useNavigationState } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { scale } from '../utils/responsive';

interface BreadcrumbItem {
    label: string;
    screen?: string;
}

interface BreadcrumbProps {
    items: BreadcrumbItem[];
    maxItems?: number;
}

export const Breadcrumb: React.FC<BreadcrumbProps> = ({ items, maxItems = 3 }) => {
    const navigation = useNavigation();
    const { theme } = useTheme();
    const animatedValue = React.useRef(new Animated.Value(0)).current;

    React.useEffect(() => {
        Animated.spring(animatedValue, {
            toValue: 1,
            tension: 50,
            friction: 7,
            useNativeDriver: true,
        }).start();
    }, [items]);

    const displayItems = items.length > maxItems
        ? [items[0], { label: '...' }, ...items.slice(-maxItems + 2)]
        : items;

    const handlePress = (screen?: string) => {
        if (screen && navigation.canGoBack()) {
            // Navigate back to specific screen if possible
            navigation.goBack();
        }
    };

    return (
        <Animated.View
            style={[
                styles.container,
                {
                    opacity: animatedValue,
                    transform: [
                        {
                            translateY: animatedValue.interpolate({
                                inputRange: [0, 1],
                                outputRange: [-10, 0],
                            }),
                        },
                    ],
                },
            ]}
        >
            {displayItems.map((item, index) => {
                const isLast = index === displayItems.length - 1;
                const isClickable = !isLast && item.screen;

                return (
                    <View key={`${item.label}-${index}`} style={styles.itemWrapper}>
                        <TouchableOpacity
                            onPress={() => handlePress(item.screen)}
                            disabled={!isClickable}
                            activeOpacity={0.6}
                        >
                            <Text
                                style={[
                                    styles.itemText,
                                    {
                                        color: isLast ? theme.primary : theme.textSecondary,
                                        fontWeight: isLast ? '600' : '400',
                                    },
                                ]}
                                numberOfLines={1}
                            >
                                {item.label}
                            </Text>
                        </TouchableOpacity>

                        {!isLast && (
                            <Ionicons
                                name="chevron-forward"
                                size={scale(14)}
                                color={theme.textTertiary}
                                style={styles.separator}
                            />
                        )}
                    </View>
                );
            })}
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: scale(16),
        paddingVertical: scale(8),
    },
    itemWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    itemText: {
        fontSize: scale(13),
        letterSpacing: 0.2,
    },
    separator: {
        marginHorizontal: scale(6),
    },
});
