import React from "react";
import { View, Text, Image, Platform, StatusBar } from "react-native";
import { useTheme } from "../context/ThemeContext";
import { scale } from '../utils/responsive';
import { useSafeAreaInsets } from "react-native-safe-area-context";

export const StudentProfileBanner = ({ children }: { children?: React.ReactNode }) => {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  
  return (
    <View style={{ position: 'relative', height: scale(160), overflow: 'hidden' }}>
      {/* Solid Primary Background */}
      <View style={{ flex: 1, backgroundColor: theme.primary, paddingTop: 0 }}>
        {/* Academy Logo (Faint) */}
        <Image 
          source={require('../../assets/the-seeks-logo.png')}
          style={{
            position: 'absolute',
            right: scale(-20),
            top: scale(-10),
            width: scale(160),
            height: scale(200),
            opacity: 0.15,
          }}
          resizeMode="contain"
        />

        {/* Academy Watermark */}
        <View style={{ position: 'absolute', left: scale(24), top: scale(50) }}>
          <Text
            style={{
              color: "rgba(255,255,255,0.15)",
              fontSize: scale(20),
              fontWeight: "900",
              letterSpacing: 2,
              lineHeight: scale(24),
            }}
          >
            THE SEEKS
          </Text>

          <Text
            style={{
              color: "rgba(255,255,255,0.15)",
              fontSize: scale(15),
              fontWeight: "700",
              letterSpacing: 1,
              marginTop: scale(-4),
            }}
          >
            ACADEMY
          </Text>

          <Text
            style={{
              color: "rgba(255,255,255,0.12)",
              fontSize: scale(10),
              marginTop: scale(-2),
            }}
          >
            Fort Abbas
          </Text>
        </View>

        {/* Bottom Wave */}
        <View
          style={{
            position: "absolute",
            bottom: scale(-30),
            left: scale(-20),
            right: scale(-20),
            height: scale(70),
            backgroundColor: theme.background,
            borderTopLeftRadius: scale(100),
            borderTopRightRadius: scale(100),
          }}
        />

        {/* Optional Header/Content over Banner */}
        {children && (
          <View style={{ position: 'absolute', top: StatusBar.currentHeight || 24, left: 0, right: 0, zIndex: 50 }}>
            {children}
          </View>
        )}
      </View>
    </View>
  );
};
