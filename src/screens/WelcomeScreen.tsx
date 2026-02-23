import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
  ScrollView,
  Alert,
  StatusBar,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "./navigation/AppNavigator";
import { useTheme } from "../context/ThemeContext";

const { height } = Dimensions.get("window");
const isSmall = height < 700;

type WelcomeScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  "Welcome"
>;

export const WelcomeScreen: React.FC = () => {
  const { theme, isDark } = useTheme();
  const navigation = useNavigation<WelcomeScreenNavigationProp>();

  const features = [
    { id: 1, text: "Expert Coaching", icon: "🎓" },
    { id: 2, text: "Video Lectures", icon: "📹" },
    { id: 3, text: "Smart Training", icon: "📋" },
    { id: 4, text: "Compete & Grow", icon: "🏫" },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar
        barStyle={isDark ? "light-content" : "dark-content"}
        backgroundColor={theme.background}
      />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Illustration ── */}
        <View style={styles.illustrationContainer}>
          <View style={[styles.circleBackground, {
            backgroundColor: isDark ? 'rgba(139,92,246,0.1)' : 'rgba(139,92,246,0.08)',
          }]} />
          <View style={[styles.phoneFrame, {
            backgroundColor: theme.card,
            borderColor: isDark ? theme.border : '#e5e7eb',
          }]}>
            <Image
              source={require("../../assets/icon.png")}
              style={styles.logoImage}
              resizeMode="contain"
            />
            <View style={[styles.mockLineLong, { backgroundColor: theme.border }]} />
            <View style={[styles.mockLineShort, { backgroundColor: theme.border }]} />
            <View style={[styles.mockLineMedium, { backgroundColor: theme.border }]} />
          </View>
        </View>

        {/* ── Text Content ── */}
        <View style={styles.textSection}>
          <Text style={[styles.title, { color: theme.text }]}>
            The Seeks Academy
          </Text>
          <Text style={[styles.location, { color: theme.primary }]}>
            Fort Abbas
          </Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            Join a community of learners achieving their goals through expert coaching and personalized paths.
          </Text>
        </View>

        {/* ── Feature Chips ── */}
        <View style={styles.chipGrid}>
          {features.map((f) => (
            <View
              key={f.id}
              style={[styles.chip, {
                backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#f5f3ff',
                borderColor: isDark ? 'rgba(139,92,246,0.2)' : 'rgba(139,92,246,0.12)',
              }]}
            >
              <Text style={styles.chipIcon}>{f.icon}</Text>
              <Text style={[styles.chipText, { color: theme.text }]}>{f.text}</Text>
            </View>
          ))}
        </View>

        {/* ── Action Buttons ── */}
        <View style={styles.actions}>
          <TouchableOpacity
            activeOpacity={0.85}
            style={[styles.primaryBtn, { backgroundColor: theme.primary }]}
            onPress={() =>
              Alert.alert(
                "Registration Required",
                "Contact admin to be Registered",
                [{ text: "OK" }]
              )
            }
          >
            <Text style={styles.primaryBtnText}>Get Started</Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.7}
            style={[styles.secondaryBtn, { borderColor: theme.primary }]}
            onPress={() => navigation.navigate("Login")}
          >
            <Text style={[styles.secondaryBtnText, { color: theme.primary }]}>
              Log In
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 28,
    paddingVertical: isSmall ? 16 : 24,
  },

  /* ── Illustration ── */
  illustrationContainer: {
    marginBottom: 12,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    height: isSmall ? 150 : 170,
  },
  circleBackground: {
    position: "absolute",
    width: isSmall ? 140 : 160,
    height: isSmall ? 140 : 160,
    borderRadius: isSmall ? 70 : 80,
    top: isSmall ? 5 : 8,
  },
  phoneFrame: {
    width: isSmall ? 80 : 90,
    height: isSmall ? 145 : 160,
    borderRadius: 14,
    borderWidth: 2.5,
    alignItems: "center",
    paddingTop: 16,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
  logoImage: {
    width: isSmall ? 36 : 44,
    height: isSmall ? 36 : 44,
    marginBottom: 12,
    borderRadius: 22,
  },
  mockLineLong: {
    width: "70%",
    height: 4,
    borderRadius: 2,
    marginBottom: 5,
  },
  mockLineShort: {
    width: "45%",
    height: 4,
    borderRadius: 2,
    marginBottom: 5,
    alignSelf: "flex-start" as const,
    marginLeft: 10,
  },
  mockLineMedium: {
    width: "58%",
    height: 4,
    borderRadius: 2,
    alignSelf: "flex-start" as const,
    marginLeft: 10,
  },

  /* ── Text ── */
  textSection: {
    alignItems: "center",
    marginBottom: isSmall ? 20 : 28,
  },
  title: {
    fontSize: isSmall ? 22 : 26,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 2,
    letterSpacing: 0.2,
  },
  location: {
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 10,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  subtitle: {
    fontSize: 13,
    textAlign: "center",
    lineHeight: 20,
    paddingHorizontal: 8,
  },

  /* ── Chips ── */
  chipGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 8,
    marginBottom: isSmall ? 28 : 36,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  chipIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  chipText: {
    fontSize: 12,
    fontWeight: "600",
  },

  /* ── Buttons ── */
  actions: {
    gap: 10,
  },
  primaryBtn: {
    height: isSmall ? 46 : 50,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    ...Platform.select({
      ios: {
        shadowColor: "#8b5cf6",
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.25,
        shadowRadius: 6,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  primaryBtnText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  secondaryBtn: {
    height: isSmall ? 46 : 50,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    backgroundColor: "transparent",
  },
  secondaryBtnText: {
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
});
