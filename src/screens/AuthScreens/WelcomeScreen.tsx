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
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/AppNavigator";
import Svg, { Path } from "react-native-svg";
import { scale } from '../../utils/responsive';
import { useTheme } from '../../context/ThemeContext';

const { height, width } = Dimensions.get("window");
const isSmall = height < 700;

type WelcomeScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  "Welcome"
>;

// Exact Colors from the Design
const COLORS = {
  darkBlue: "#0B2D64",
  gold: "#D4AF37",
  textGray: "#64748B",
  lightBlueBg: "#EBF4FB",
  white: "#FFFFFF",
  lineGray: "#CBD5E1",
};

export const WelcomeScreen: React.FC = () => {
  const navigation = useNavigation<WelcomeScreenNavigationProp>();
  const { theme, isDark } = useTheme();

  const features = [
    {
      id: 1,
      title: "Daily Diary",
      desc: "Track your daily\nactivities",
      icon: "book",
    },
    {
      id: 2,
      title: "Video Lectures",
      desc: "Access recorded\nlectures",
      icon: "videocam",
    },
    {
      id: 3,
      title: "Live Timetable",
      desc: "View your class\nschedule",
      icon: "calendar",
    },
    {
      id: 4,
      title: "Fee Ledgers",
      desc: "Check fee records\nand history",
      icon: "card",
    },
  ];

  return (
    <View style={[styles.mainContainer, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor="transparent" translucent />
      
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {/* ── Background Graphic (Scrolls with content) ── */}
          <View style={styles.backgroundGraphic}>
            <Svg height={Math.max(height, 800)} width="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
              {/* First V-Shape Layer */}
              <Path d="M0,18 L50,45 L100,18 L100,100 L0,100 Z" fill="#F4F8FC" />
              {/* Second V-Shape Layer (Inner/Darker) */}
              <Path d="M0,25 L50,55 L100,25 L100,100 L0,100 Z" fill="#EAF2F8" />
            </Svg>
          </View>

          {/* ── Top Header Section ── */}
          <View style={styles.topSection}>
            <Text style={styles.mainTitle}>STUDENT PORTAL</Text>
            
            <View style={styles.dividerRow}>
              <View style={styles.thinLine} />
              <Ionicons name="school" size={14} color={COLORS.darkBlue} style={styles.hatIcon} />
              <View style={styles.thinLine} />
            </View>

            <Text style={styles.topSubtitle}>Your Gateway to Learning and Success</Text>
          </View>

          {/* ── Logo & Middle Header ── */}
          <View style={styles.logoSection}>
            <View style={styles.logoContainer}>
              <Image
                source={require("../../../assets/icon.png")}
                style={styles.logoImage}
                resizeMode="contain"
              />
            </View>
            
            <View style={styles.starsRow}>
              <Ionicons name="star" size={12} color={COLORS.gold} />
              <Ionicons name="star" size={14} color={COLORS.gold} style={styles.centerStar} />
              <Ionicons name="star" size={12} color={COLORS.gold} />
            </View>

            <Text style={styles.academyTitle}>THE SEEKS ACADEMY</Text>
            
            <View style={styles.locationRow}>
              <View style={styles.locationLine} />
              <Text style={styles.locationText}>F O R T  A B B A S</Text>
              <View style={styles.locationLine} />
            </View>

            <Text style={styles.descriptionText}>
              Stay connected with your daily diaries, timetable,{"\n"}
              fee records, and video lectures all in one place.
            </Text>
          </View>

          {/* ── Features Grid ── */}
          <View style={styles.featuresGrid}>
            {features.map((item) => (
              <View key={item.id} style={styles.featureCard}>
                <View style={styles.iconCircle}>
                  <Ionicons name={item.icon as any} size={18} color={COLORS.darkBlue} />
                </View>
                <View style={styles.featureTextContainer}>
                  <Text style={styles.featureTitle}>{item.title}</Text>
                  <Text style={styles.featureDesc}>{item.desc}</Text>
                </View>
              </View>
            ))}
          </View>

          {/* ── Bottom Buttons ── */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity 
              activeOpacity={0.85}
              style={styles.primaryBtn}
              onPress={() => navigation.navigate("Login")}
            >
              <Ionicons name="person" size={16} color={COLORS.white} style={styles.btnIcon} />
              <Text style={styles.primaryBtnText}>Student Login</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              activeOpacity={0.7}
              style={styles.secondaryBtn}
              onPress={() =>
                Alert.alert(
                  "Admission Required",
                  "Please visit The Seeks Academy administration office to register and receive your student credentials.",
                  [{ text: "OK" }]
                )
              }
            >
              <Ionicons name="business" size={16} color={COLORS.darkBlue} style={styles.btnIcon} />
              <Text style={styles.secondaryBtnText}>New Admission?</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  backgroundGraphic: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: -500, // extend far down to ensure it covers scrolling
    zIndex: 0,
  },
  safeArea: {
    flex: 1,
    zIndex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: "center",
    paddingHorizontal: scale(20),
    paddingTop: isSmall ? 10 : 20,
    paddingBottom: 0,
  },

  /* ── Top Section ── */
  topSection: {
    alignItems: "center",
    width: "100%",
    marginBottom: scale(16),
    zIndex: 1,
  },
  mainTitle: {
    fontSize: isSmall ? 26 : 30, // Compacted from 36
    fontWeight: "900",
    color: COLORS.darkBlue,
    letterSpacing: 1,
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    width: "80%",
    marginVertical: scale(8),
  },
  thinLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.lineGray,
  },
  hatIcon: {
    marginHorizontal: scale(12),
  },
  topSubtitle: {
    fontSize: isSmall ? 12 : 13,
    color: COLORS.textGray,
    fontWeight: "500",
  },

  /* ── Logo Section ── */
  logoSection: {
    alignItems: "center",
    width: "100%",
    marginBottom: scale(16), // Compacted
    zIndex: 1,
  },
  logoContainer: {
    marginBottom: scale(8),
    alignItems: "center",
    justifyContent: "center",
  },
  logoImage: {
    width: isSmall ? 90 : 110,
    height: isSmall ? 90 : 110,
  },
  starsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: scale(10),
  },
  centerStar: {
    marginHorizontal: scale(4),
    marginTop: -4, // slight arc effect
  },
  academyTitle: {
    fontSize: isSmall ? 20 : 24, // Compacted
    fontWeight: "800",
    color: COLORS.darkBlue,
    letterSpacing: 1,
    marginBottom: scale(6),
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: scale(12),
  },
  locationLine: {
    width: scale(30),
    height: 1,
    backgroundColor: COLORS.lineGray,
    marginHorizontal: scale(10),
  },
  locationText: {
    fontSize: scale(11),
    fontWeight: "700",
    color: COLORS.gold,
    letterSpacing: 4,
  },
  descriptionText: {
    fontSize: isSmall ? 11 : 12,
    color: COLORS.textGray,
    textAlign: "center",
    lineHeight: 18,
    paddingHorizontal: scale(10),
    fontWeight: "500",
  },

  /* ── Features Grid ── */
  featuresGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    width: "100%",
    marginBottom: scale(16),
    zIndex: 1,
  },
  featureCard: {
    width: "48%",
    backgroundColor: COLORS.white,
    borderRadius: scale(12),
    padding: scale(10), // Compacted
    marginBottom: scale(12),
    flexDirection: "row",
    alignItems: "center",
    elevation: 6,
  },
  iconCircle: {
    width: scale(32),
    height: scale(32), // Compacted
    borderRadius: scale(16),
    backgroundColor: COLORS.lightBlueBg,
    alignItems: "center",
    justifyContent: "center",
    marginRight: scale(8),
  },
  featureTextContainer: {
    flex: 1,
  },
  featureTitle: {
    fontSize: scale(11),
    fontWeight: "700",
    color: COLORS.darkBlue,
    marginBottom: 2,
  },
  featureDesc: {
    fontSize: scale(9),
    color: COLORS.textGray,
    lineHeight: 12,
  },

  /* ── Bottom Buttons ── */
  buttonContainer: {
    width: "100%",
    gap: 10, // Compacted
    paddingBottom: 0,
    zIndex: 1,
  },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.darkBlue,
    borderRadius: scale(10),
    height: isSmall ? 44 : 48, // Compacted
    ...Platform.select({
      ios: {
        shadowColor: COLORS.darkBlue,
        shadowOffset: { width: 0, height: scale(4) },
        shadowOpacity: 0.2,
        shadowRadius: 6,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  primaryBtnText: {
    color: COLORS.white,
    fontSize: scale(14),
    fontWeight: "700",
  },
  btnIcon: {
    marginRight: scale(8),
  },
  secondaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.white,
    borderRadius: scale(10),
    height: isSmall ? 44 : 48, // Compacted
    borderWidth: 1.5,
    borderColor: COLORS.darkBlue,
  },
  secondaryBtnText: {
    color: COLORS.darkBlue,
    fontSize: scale(14),
    fontWeight: "700",
  },
});
