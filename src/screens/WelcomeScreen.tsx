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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "./navigation/AppNavigator";
import { useTheme } from "../context/ThemeContext";

const { width } = Dimensions.get("window");

type WelcomeScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  "Welcome"
>;

export const WelcomeScreen: React.FC = () => {
  const { theme, isDark } = useTheme();
  const navigation = useNavigation<WelcomeScreenNavigationProp>();

  const features = [
    { id: 1, text: "Expert Coaching.", icon: "🎓" },
    { id: 2, text: "Innovative Learning.", icon: "📹" },
    { id: 3, text: "Comprehensive Training.", icon: "📋" },
    { id: 4, text: "Competitive Environment.", icon: "🏫" },
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
          {/* Illustration Section */}
          <View style={styles.illustrationContainer}>
            <View
              style={[
                styles.circleBackground,
                {
                  backgroundColor: isDark ? 'rgba(139, 92, 246, 0.1)' : 'rgba(139, 92, 246, 0.08)',
                },
              ]}
            />
            <View
              style={[
                styles.phoneFrame,
                { backgroundColor: theme.card, borderColor: isDark ? theme.border : '#e5e7eb' },
              ]}
            >
              <Image
                source={require("../../assets/icon.png")}
                style={styles.logoImage}
                resizeMode="contain"
              />
              {/* Mock UI lines */}
              <View
                style={[styles.mockLineLong, { backgroundColor: theme.border }]}
              />
              <View
                style={[styles.mockLineShort, { backgroundColor: theme.border }]}
              />
              <View
                style={[styles.mockLineMedium, { backgroundColor: theme.border }]}
              />
            </View>
          </View>

          {/* Text Content */}
          <View style={styles.textContainer}>
            <Text style={[styles.headline, { color: theme.text }]}>
              The Seeks Academy
            </Text>
            <Text style={[styles.subHeading, { color: theme.text }]}>
              Fort Abbas
            </Text>
            <Text style={[styles.subheadline, { color: theme.textSecondary }]}>
              Join a community of learners achieving their goals through expert
              coaching and personalized paths.
            </Text>

            {/* Feature List */}
            <View style={styles.featureList}>
              {features.map((feature) => (
                <View key={feature.id} style={styles.featureItem}>
                  <View style={styles.iconContainer}>
                    <Text style={styles.featureIcon}>{feature.icon}</Text>
                  </View>
                  <Text
                    style={[styles.featureText, { color: theme.textSecondary }]}
                  >
                    {feature.text}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[
                styles.getStartedButton,
                { backgroundColor: theme.primary, shadowColor: theme.primary },
              ]}
              onPress={() => 
                Alert.alert(
                  "Registration Required",
                  "Contact admin to be Registered",
                  [{ text: "OK" }]
                )
              }
            >
              <Text style={styles.getStartedText}>Get Started</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.loginButton,
                { backgroundColor: 'transparent', borderColor: theme.primary },
              ]}
              onPress={() => navigation.navigate("Login")}
            >
              <Text style={[styles.loginText, { color: theme.primary }]}>
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
    alignItems: "center",
    paddingHorizontal: 24,
    paddingBottom: 20,
  },
  illustrationContainer: {
    marginTop: 10,
    marginBottom: 10,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    width: width,
    height: 240,
  },
  circleBackground: {
    position: "absolute",
    width: 210,
    height: 210,
    borderRadius: 115,
    backgroundColor: "#f3f4f6", // Light gray/purple tint
    top: 20,
  },
  phoneFrame: {
    width: 110,
    height: 220,
    borderRadius: 20,
    borderWidth: 4,
    alignItems: "center",
    paddingTop: 15,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  logoImage: {
    width: 60,
    height: 60,
    marginBottom: 20,
    borderRadius: 60,
  },
  mockLineLong: {
    width: "70%",
    height: 3,
    backgroundColor: "#e5e7eb",
    borderRadius: 4,
    marginBottom: 12,
  },
  mockLineShort: {
    width: "50%",
    height: 5,
    backgroundColor: "#e5e7eb",
    borderRadius: 4,
    marginBottom: 12,
    alignSelf: "flex-start",
    marginLeft: 14,
  },
  mockLineMedium: {
    width: "60%",
    height: 5,
    backgroundColor: "#e5e7eb",
    borderRadius: 4,
    alignSelf: "flex-start",
    marginLeft: 14,
  },
  textContainer: {
    width: "100%",
    marginBottom: 10,
  },
  headline: {
    fontSize: 28,
    fontWeight: "800",
    color: "#1f2937",
    textAlign: "center",
    marginBottom: 8,
    lineHeight: 30,
  },
  subHeading: {
    fontSize: 20,
    fontWeight: "800",
    color: "#1f2937",
    textAlign: "center",
    marginBottom: 6,
    lineHeight: 25,
  },
  subheadline: {
    fontSize: 15,
    color: "#6b7280",
    textAlign: "center",
    marginBottom: 15,
    lineHeight: 28,
  },
  featureList: {
    width: "90%",
    paddingHorizontal: 10,
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  iconContainer: {
    width: 22,
    alignItems: "center",
    marginRight: 12,
  },
  featureIcon: {
    fontSize: 16,
  },
  featureText: {
    fontSize: 16,
    color: "#4b5563",
    fontWeight: "500",
  },
  buttonContainer: {
    width: "100%",
    gap: 20,
  },
  getStartedButton: {
    backgroundColor: "#8b5cf6", // Purple
    paddingVertical: 16,
    borderRadius: 20,
    alignItems: "center",
    width: "100%",
    shadowColor: "#8b5cf6",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  getStartedText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
  },
  loginButton: {
    paddingVertical: 16,
    borderRadius: 20,
    alignItems: "center",
    width: "100%",
    borderWidth: 2,
  },
  loginText: {
    color: "#8b5cf6", // Purple text
    fontSize: 16,
    fontWeight: "700",
  },
});
