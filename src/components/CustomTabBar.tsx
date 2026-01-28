import React from 'react';
import { View, TouchableOpacity, StyleSheet, Text } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';
import { Svg, Path, Circle } from 'react-native-svg';

// Modern sleek icons with rounded corners
const TabIcons = {
  Dashboard: ({ color, size, focused }: { color: string; size: number; focused: boolean }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* Modern grid dashboard */}
      <Path
        d="M4 6C4 4.89543 4.89543 4 6 4H9C10.1046 4 11 4.89543 11 6V9C11 10.1046 10.1046 11 9 11H6C4.89543 11 4 10.1046 4 9V6Z"
        stroke={color}
        strokeWidth={focused ? 2 : 1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill={focused ? color : 'none'}
        fillOpacity={focused ? 0.1 : 0}
      />
      <Path
        d="M13 6C13 4.89543 13.8954 4 15 4H18C19.1046 4 20 4.89543 20 6V9C20 10.1046 19.1046 11 18 11H15C13.8954 11 13 10.1046 13 9V6Z"
        stroke={color}
        strokeWidth={focused ? 2 : 1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <Path
        d="M4 15C4 13.8954 4.89543 13 6 13H9C10.1046 13 11 13.8954 11 15V18C11 19.1046 10.1046 20 9 20H6C4.89543 20 4 19.1046 4 18V15Z"
        stroke={color}
        strokeWidth={focused ? 2 : 1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <Path
        d="M13 15C13 13.8954 13.8954 13 15 13H18C19.1046 13 20 13.8954 20 15V18C20 19.1046 19.1046 20 18 20H15C13.8954 20 13 19.1046 13 18V15Z"
        stroke={color}
        strokeWidth={focused ? 2 : 1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  ),

  VideoGallery: ({ color, size, focused }: { color: string; size: number; focused: boolean }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* Modern video camera */}
      <Path
        d="M15 10L19.5528 7.72361C20.2177 7.39116 21 7.87465 21 8.61803V15.382C21 16.1253 20.2177 16.6088 19.5528 16.2764L15 14V10Z"
        stroke={color}
        strokeWidth={focused ? 2 : 1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill={focused ? color : 'none'}
        fillOpacity={focused ? 0.15 : 0}
      />
      <Path
        d="M3 8C3 6.89543 3.89543 6 5 6H13C14.1046 6 15 6.89543 15 8V16C15 17.1046 14.1046 18 13 18H5C3.89543 18 3 17.1046 3 16V8Z"
        stroke={color}
        strokeWidth={focused ? 2 : 1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill={focused ? color : 'none'}
        fillOpacity={focused ? 0.1 : 0}
      />
      <Circle cx="7" cy="10" r="1.5" fill={color} />
    </Svg>
  ),

  Messages: ({ color, size, focused }: { color: string; size: number; focused: boolean }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* Modern chat bubbles */}
      <Path
        d="M8 10H8.01M12 10H12.01M16 10H16.01M21 12C21 16.4183 16.9706 20 12 20C10.4607 20 9.01172 19.6565 7.74467 19.0511L3 20L4.39499 16.28C3.51156 15.0423 3 13.5743 3 12C3 7.58172 7.02944 4 12 4C16.9706 4 21 7.58172 21 12Z"
        stroke={color}
        strokeWidth={focused ? 2 : 1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill={focused ? color : 'none'}
        fillOpacity={focused ? 0.05 : 0}
      />
    </Svg>
  ),

  NoticeBoard: ({ color, size, focused }: { color: string; size: number; focused: boolean }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* Modern notification bell */}
      <Path
        d="M15 17H20L18.5951 5.52786C18.4596 4.64373 17.7269 4 16.8549 4H7.14509C6.27309 4 5.54041 4.64373 5.40486 5.52786L4 17H9M15 17V18C15 19.6569 13.6569 21 12 21C10.3431 21 9 19.6569 9 18V17M15 17H9"
        stroke={color}
        strokeWidth={focused ? 2 : 1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      {focused && (
        <Circle cx="18" cy="6" r="3" fill="#EF4444" stroke="#FFFFFF" strokeWidth="1.5" />
      )}
    </Svg>
  ),

  Profile: ({ color, size, focused }: { color: string; size: number; focused: boolean }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* Modern user avatar */}
      <Circle
        cx="12"
        cy="12"
        r="10"
        stroke={color}
        strokeWidth={focused ? 2 : 1.5}
        fill={focused ? color : 'none'}
        fillOpacity={focused ? 0.05 : 0}
      />
      <Circle cx="12" cy="10" r="3" stroke={color} strokeWidth={focused ? 2 : 1.5} fill="none" />
      <Path
        d="M6.16797 18.8344C6.90024 17.0086 8.63244 15.75 10.6562 15.75H13.3438C15.3676 15.75 17.0998 17.0086 17.832 18.8344"
        stroke={color}
        strokeWidth={focused ? 2 : 1.5}
        strokeLinecap="round"
      />
    </Svg>
  ),
};

interface TabData {
  id: string;
  label: string;
  icon: keyof typeof TabIcons;
  badgeCount?: number;
}

const TAB_CONFIG: TabData[] = [
  { id: 'Home', label: 'Home', icon: 'Dashboard' },
  { id: 'VideoGallery', label: 'Videos', icon: 'VideoGallery' },
  { id: 'Messages', label: 'Messages', icon: 'Messages', badgeCount: 3 },
  { id: 'NoticeBoard', label: 'Notices', icon: 'NoticeBoard' },
  { id: 'Profile', label: 'Profile', icon: 'Profile' },
];

export const EducationalTabBar: React.FC<BottomTabBarProps> = ({ state, descriptors, navigation }) => {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const focusedRoute = state.routes[state.index];
  const focusedDescriptor = descriptors[focusedRoute.key];
  const focusedOptions = focusedDescriptor.options;
  const tabBarStyle = focusedOptions.tabBarStyle;

  // If display is none, return null to completely hide it
  if ((tabBarStyle as any)?.display === 'none') {
    return null;
  }

  return (
    <View
      style={[
        styles.container,
        {
          paddingBottom: Math.max(insets.bottom, 4),
          backgroundColor: isDark ? theme.card : '#FFFFFF',
          borderTopColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)',
        },
        tabBarStyle as any,
      ]}
    >
      {/* Active indicator */}
      <View
        style={[
          styles.indicator,
          {
            left: `${(state.index / TAB_CONFIG.length) * 100}%`,
            width: `${100 / TAB_CONFIG.length}%`,
          },
        ]}
      >
        <LinearGradient
          colors={isDark ? [theme.primary, theme.accent] : ['#667eea', '#764ba2']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.indicatorGradient}
        />
      </View>

      {/* Tabs */}
      {TAB_CONFIG.map((tabData, index) => {
        const route = state.routes.find((r) => r.name === tabData.id) || state.routes[index];
        const isFocused = state.index === index;

        // Icon color
        const iconColor = isFocused
          ? isDark
            ? theme.primary
            : '#4F46E5'
          : isDark
            ? theme.textTertiary
            : '#9CA3AF';

        const IconComponent = TabIcons[tabData.icon];

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            if (route.name === 'Home') {
              navigation.navigate('Home', { screen: 'HomeScreen' });
            } else {
              navigation.navigate(route.name);
            }
          } else if (isFocused && !event.defaultPrevented && route.name === 'Home') {
            // Reset Home Stack to initial screen
            navigation.navigate(route.name, { screen: 'HomeScreen' });
          }
        };

        return (
          <TouchableOpacity
            key={tabData.id}
            accessibilityRole="button"
            accessibilityState={isFocused ? { selected: true } : {}}
            accessibilityLabel={`${tabData.label} tab`}
            testID={`tab-${tabData.id}`}
            onPress={onPress}
            style={styles.tab}
            activeOpacity={0.7}
          >
            <View style={styles.tabContent}>
              <View style={styles.iconContainer}>
                <IconComponent color={iconColor} size={22} focused={isFocused} />

                {/* Badge */}
                {tabData.badgeCount && tabData.badgeCount > 0 && (
                  <View
                    style={[
                      styles.badge,
                      { backgroundColor: isDark ? '#EF4444' : '#DC2626' },
                    ]}
                  >
                    <Text style={styles.badgeText}>
                      {tabData.badgeCount > 9 ? '9+' : tabData.badgeCount}
                    </Text>
                  </View>
                )}
              </View>

              <Text
                style={[
                  styles.label,
                  {
                    color: iconColor,
                    fontWeight: isFocused ? '600' : '400',
                  },
                ]}
                numberOfLines={1}
              >
                {tabData.label}
              </Text>
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderTopWidth: 1,
    paddingTop: 6,
    position: 'relative',
  },
  indicator: {
    position: 'absolute',
    top: 0,
    height: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  indicatorGradient: {
    height: '100%',
    width: '60%',
    borderRadius: 2,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 6,
  },
  tabContent: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  iconContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -8,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '700',
    paddingHorizontal: 3,
  },
  label: {
    fontSize: 10,
    marginTop: 2,
    textAlign: 'center',
  },
});

export default EducationalTabBar;