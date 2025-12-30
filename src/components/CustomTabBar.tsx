import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import Svg, { Path } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';

import { scale } from '../utils/responsive'; // Verify import path

const { width } = Dimensions.get('window');
const TAB_HEIGHT = scale(70);

export const CustomTabBar: React.FC<BottomTabBarProps> = ({ state, descriptors, navigation }) => {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const PADDING_BOTTOM = insets.bottom > 0 ? insets.bottom : scale(10);
  const TOTAL_HEIGHT = TAB_HEIGHT + PADDING_BOTTOM;

  const center = width / 2;

  const CURVE_WIDTH = scale(65);
  const CURVE_DEPTH = scale(25);
  const BUTTON_RADIUS = scale(15);

  // Note: Path string structure depends on exact coordinate values
  // We need to construct calculations carefully.
  // It is safer to keep the path logic relative to calculated CURVE_WIDTH etc.

  const path = `
    M0,0
    L${center - CURVE_WIDTH},0
    C${center - CURVE_WIDTH + scale(15)},0 ${center - BUTTON_RADIUS - scale(25)},0 ${center - BUTTON_RADIUS - scale(10)},${scale(20)}
    C${center - BUTTON_RADIUS},${scale(40)} ${center - BUTTON_RADIUS / 2},${CURVE_DEPTH} ${center},${CURVE_DEPTH}
    C${center + BUTTON_RADIUS / 2},${CURVE_DEPTH} ${center + BUTTON_RADIUS},${scale(40)} ${center + BUTTON_RADIUS + scale(10)},${scale(20)}
    C${center + BUTTON_RADIUS + scale(25)},0 ${center + CURVE_WIDTH - scale(15)},0 ${center + CURVE_WIDTH},0
    L${width},0
    L${width},${TOTAL_HEIGHT}
    L0,${TOTAL_HEIGHT}
    Z
  `;

  // ... rest of component ...


  const focusedRoute = state.routes[state.index];
  const focusedDescriptor = descriptors[focusedRoute.key];
  const focusedOptions = focusedDescriptor.options;

  if ((focusedOptions.tabBarStyle as any)?.display === 'none') {
    return null;
  }

  return (
    <View style={[styles.container, { height: TOTAL_HEIGHT }]}>
      <Svg width={width} height={TOTAL_HEIGHT} style={styles.svg}>
        <Path
          d={path}
          fill={isDark ? theme.card : "white"}
          stroke={theme.border}
          strokeWidth={1}
        />
      </Svg>

      <View style={[styles.tabsContainer, { paddingBottom: PADDING_BOTTOM }]}>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const label = options.tabBarLabel !== undefined
            ? options.tabBarLabel
            : options.title !== undefined
              ? options.title
              : route.name;

          const isFocused = state.index === index;
          const isCenter = index === 2; // Messages is the 3rd item (index 2)

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          // Extract the icon from the options
          // Note: We assume tabBarIcon is a function returning a ReactNode
          const Icon = options.tabBarIcon ? (options.tabBarIcon as any)({
            focused: isFocused,
            color: isFocused ? theme.primary : theme.textSecondary,
            size: 24
          }) : null;

          if (isCenter) {
            return (
              <View key={route.key} style={styles.centerButtonContainer}>
                <TouchableOpacity
                  onPress={onPress}
                  style={[styles.centerButton, { backgroundColor: theme.primary, shadowColor: theme.primary }]}
                  activeOpacity={0.8}
                >
                  {/* Custom Chat Bubble SVG Icon */}
                  <Svg width={28} height={28} viewBox="0 0 24 24" fill="none">
                    <Path
                      d="M20 2H4C2.9 2 2 2.9 2 4V22L6 18H20C21.1 18 22 17.1 22 16V4C22 2.9 21.1 2 20 2Z"
                      fill="#ffffff"
                    />
                    <Path
                      d="M7 9H17"
                      stroke={theme.primary}
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                    <Path
                      d="M7 13H13"
                      stroke={theme.primary}
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </Svg>
                </TouchableOpacity>
                <Text style={[styles.label, { color: isFocused ? theme.primary : theme.textSecondary, marginTop: scale(18) }]}>
                  {label as string}
                </Text>
              </View>
            );
          }

          return (
            <TouchableOpacity
              key={route.key}
              onPress={onPress}
              style={styles.tab}
              activeOpacity={0.7}
            >
              {Icon}
              <Text style={[styles.label, { color: isFocused ? theme.primary : theme.textSecondary }]}>
                {label as string}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    backgroundColor: 'transparent',
    elevation: 0,
    borderTopWidth: 0,
  },
  svg: {
    position: 'absolute',
    top: 0,
    left: 0,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: scale(-2),
    },
    shadowOpacity: 0.1,
    shadowRadius: scale(3),
    elevation: 5,
  },
  tabsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: '100%',
    paddingHorizontal: scale(4),
  },
  tab: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    height: scale(60),
    marginBottom: scale(5),
  },
  centerButtonContainer: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'center',
    height: scale(100),
    marginTop: scale(-25), // Pull up to float
    zIndex: 10,
  },
  centerButton: {
    width: scale(50),
    height: scale(50),
    borderRadius: scale(25),
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: {
      width: 0,
      height: scale(4),
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
  label: {
    fontSize: scale(10),
    marginTop: scale(4),
  },
});
