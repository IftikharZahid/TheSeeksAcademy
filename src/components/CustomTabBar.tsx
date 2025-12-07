import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import Svg, { Path } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';

const { width } = Dimensions.get('window');
const TAB_HEIGHT = 70;

export const CustomTabBar: React.FC<BottomTabBarProps> = ({ state, descriptors, navigation }) => {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const PADDING_BOTTOM = insets.bottom > 0 ? insets.bottom : 10;
  const TOTAL_HEIGHT = TAB_HEIGHT + PADDING_BOTTOM;

  const center = width / 2;
  
  // Bezier curve path for the indentation
  // const path = `
  //   M0,0
  //   L${center - 45},0
  //   C${center - 45},0 ${center - 35},0 ${center - 30},10
  //   C${center - 25},20 ${center - 15},40 ${center},40
  //   C${center + 15},40 ${center + 25},20 ${center + 30},10
  //   C${center + 35},0 ${center + 45},0 ${center + 45},0
  //   L${width},0
  //   L${width},${TOTAL_HEIGHT}
  //   L0,${TOTAL_HEIGHT}
  //   Z
  // `;
const CURVE_WIDTH = 65;   // widen the curve
const CURVE_DEPTH = 25;   // deepen the curve
const BUTTON_RADIUS = 15; // matches large 70–80 px button

const path = `
  M0,0
  L${center - CURVE_WIDTH},0
  C${center - CURVE_WIDTH + 15},0 ${center - BUTTON_RADIUS - 25},0 ${center - BUTTON_RADIUS - 10},20
  C${center - BUTTON_RADIUS},40 ${center - BUTTON_RADIUS / 2},${CURVE_DEPTH} ${center},${CURVE_DEPTH}
  C${center + BUTTON_RADIUS / 2},${CURVE_DEPTH} ${center + BUTTON_RADIUS},40 ${center + BUTTON_RADIUS + 10},20
  C${center + BUTTON_RADIUS + 25},0 ${center + CURVE_WIDTH - 15},0 ${center + CURVE_WIDTH},0
  L${width},0
  L${width},${TOTAL_HEIGHT}
  L0,${TOTAL_HEIGHT}
  Z
`;

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
                <Text style={[styles.label, { color: isFocused ? theme.primary : theme.textSecondary, marginTop: 18 }]}>
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
      height: -2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 5,
  },
  tabsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: '100%',
    paddingHorizontal: 4,
  },
  tab: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    height: 60,
    marginBottom: 5,
  },
  centerButtonContainer: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'center',
    height: 100,
    marginTop: -25, // Pull up to float
    zIndex: 10,
  },
  centerButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
  label: {
    fontSize: 10,
    marginTop: 4,
  },
});
