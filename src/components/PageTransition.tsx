import React from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { useTheme } from '../context/ThemeContext';

interface PageTransitionProps {
    children: React.ReactNode;
    type?: 'slide' | 'fade' | 'scale';
    duration?: number;
}

export const PageTransition: React.FC<PageTransitionProps> = ({
    children,
    type = 'slide',
    duration = 300,
}) => {
    const { theme } = useTheme();
    const animatedValue = React.useRef(new Animated.Value(0)).current;

    React.useEffect(() => {
        Animated.timing(animatedValue, {
            toValue: 1,
            duration,
            useNativeDriver: true,
        }).start();
    }, []);

    const getTransform = () => {
        switch (type) {
            case 'slide':
                return {
                    opacity: animatedValue,
                    transform: [
                        {
                            translateX: animatedValue.interpolate({
                                inputRange: [0, 1],
                                outputRange: [50, 0],
                            }),
                        },
                    ],
                };
            case 'fade':
                return {
                    opacity: animatedValue,
                };
            case 'scale':
                return {
                    opacity: animatedValue,
                    transform: [
                        {
                            scale: animatedValue.interpolate({
                                inputRange: [0, 1],
                                outputRange: [0.9, 1],
                            }),
                        },
                    ],
                };
            default:
                return { opacity: animatedValue };
        }
    };

    return (
        <Animated.View style={[styles.container, { backgroundColor: theme.background }, getTransform()]}>
            {children}
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
});
