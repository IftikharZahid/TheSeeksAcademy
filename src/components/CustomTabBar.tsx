import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import Svg, { Path } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');
const TAB_HEIGHT = 70;

export const CustomTabBar: React.FC<BottomTabBarProps> = ({ state, descriptors, navigation }) => {
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

  return (
    <View style={[styles.container, { height: TOTAL_HEIGHT }]}>
      <Svg width={width} height={TOTAL_HEIGHT} style={styles.svg}>
        <Path d={path} fill="white" stroke="#e5e7eb" strokeWidth={1} />
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
          const Icon = options.tabBarIcon ? (options.tabBarIcon as any)({ focused: isFocused, color: isFocused ? '#3b82f6' : '#9ca3af', size: 24 }) : null;

          if (isCenter) {
            return (
              <View key={route.key} style={styles.centerButtonContainer}>
                <TouchableOpacity
                  onPress={onPress}
                  style={styles.centerButton}
                  activeOpacity={0.8}
                >
                  {/* Render icon inside the floating button with white color */}
                  {options.tabBarIcon ? (options.tabBarIcon as any)({ focused: isFocused, color: '#ffffff', size: 30 }) : <Text style={{ fontSize: 24 }}>💬</Text>}
                </TouchableOpacity>
                <Text style={[styles.label, isFocused && styles.labelFocused, { marginTop: 18 }]}>
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
              <Text style={[styles.label, isFocused && styles.labelFocused]}>
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
    backgroundColor: '#3b82f6', // Primary color
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: "#3b82f6",
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
    color: '#9ca3af',
    marginTop: 4,
  },
  labelFocused: {
    color: '#3b82f6',
    fontWeight: '600',
  },
});
