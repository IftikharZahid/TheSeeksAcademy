import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../context/ThemeContext';
import { scale } from '../../utils/responsive';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export interface AppHeaderProps {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  onBack?: () => void;
  rightAction?: React.ReactNode;
  containerStyle?: StyleProp<ViewStyle>;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  title,
  subtitle,
  showBack = true,
  onBack,
  rightAction,
  containerStyle,
}) => {
  const navigation = useNavigation();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else if (navigation.canGoBack()) {
      navigation.goBack();
    }
  };

  return (
    <View style={[styles.headerContainer, { backgroundColor: theme.primary, paddingTop: Math.max(insets.top + scale(8), scale(16)) }, containerStyle]}>
      {/* Left side (Back button or placeholder) */}
      <View style={styles.leftContainer}>
        {showBack ? (
          <TouchableOpacity onPress={handleBack} style={styles.iconButton} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="arrow-back" size={scale(24)} color="#ffffff" />
          </TouchableOpacity>
        ) : (
          <View style={styles.placeholder} />
        )}
      </View>

      {/* Center (Title & Subtitle) */}
      <View style={styles.centerContainer}>
        <Text style={styles.title} numberOfLines={1}>{title}</Text>
        {subtitle && <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text>}
      </View>

      {/* Right side (Action or placeholder) */}
      <View style={styles.rightContainer}>
        {rightAction || <View style={styles.placeholder} />}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: scale(10),
    paddingBottom: scale(16),
    borderBottomLeftRadius: scale(16),
    borderBottomRightRadius: scale(16),
    // Subtle elevation
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  leftContainer: {
    flex: 1,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  centerContainer: {
    flex: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rightContainer: {
    flex: 1,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  iconButton: {
    padding: scale(4),
  },
  title: {
    fontSize: scale(18),
    fontWeight: '700',
    color: '#ffffff',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: scale(12),
    color: 'rgba(255,255,255,0.8)',
    marginTop: scale(2),
    textAlign: 'center',
  },
  placeholder: {
    width: scale(32), // Approximate width of the back button
  },
});
