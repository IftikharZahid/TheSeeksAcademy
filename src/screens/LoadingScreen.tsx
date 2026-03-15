import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
  Dimensions,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../context/ThemeContext';

const { width } = Dimensions.get('window');
const BAR_WIDTH = width * 0.55;

export const LoadingScreen: React.FC = () => {
  const { isDark } = useTheme();

  // Fade + slight rise for the whole card
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const riseAnim = useRef(new Animated.Value(18)).current;

  // Pulse for the logo badge
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Shimmer position for the progress bar
  const shimmerAnim = useRef(new Animated.Value(-BAR_WIDTH)).current;

  // Dot breathing animations
  const dot1 = useRef(new Animated.Value(0.35)).current;
  const dot2 = useRef(new Animated.Value(0.35)).current;
  const dot3 = useRef(new Animated.Value(0.35)).current;

  useEffect(() => {
    // Entrance
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 700,
        useNativeDriver: true,
      }),
      Animated.spring(riseAnim, {
        toValue: 0,
        tension: 40,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();

    // Logo pulse
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.06, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    ).start();

    // Shimmer sweep across the progress bar
    Animated.loop(
      Animated.timing(shimmerAnim, {
        toValue: BAR_WIDTH + 80,
        duration: 1400,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      })
    ).start();

    // Staggered dot bounce
    const makeDot = (anim: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(anim, { toValue: 1, duration: 400, easing: Easing.out(Easing.ease), useNativeDriver: true }),
          Animated.timing(anim, { toValue: 0.35, duration: 400, easing: Easing.in(Easing.ease), useNativeDriver: true }),
          Animated.delay(600 - delay),
        ])
      );

    makeDot(dot1, 0).start();
    makeDot(dot2, 200).start();
    makeDot(dot3, 400).start();
  }, []);

  return (
    <View style={styles.root}>
      {/* Full-screen gradient background */}
      <LinearGradient
        colors={isDark ? ['#0D0D1A', '#0D1B3E'] : ['#EEF4FF', '#DBEAFE']}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Decorative top arc */}
      <View style={styles.topArc}>
        <LinearGradient
          colors={['#0A84FF', '#3B82F6']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.topArcGradient}
        />
      </View>

      {/* Main content card */}
      <Animated.View
        style={[
          styles.card,
          isDark && styles.cardDark,
          { opacity: fadeAnim, transform: [{ translateY: riseAnim }] },
        ]}
      >
        {/* Logo Badge */}
        <Animated.View style={[styles.logoBadge, { transform: [{ scale: pulseAnim }] }]}>
          <LinearGradient
            colors={['#0A84FF', '#2563EB']}
            style={styles.logoBadgeGradient}
          >
            <Image
              source={require('../../assets/the-seeks-logo.png')}
              style={styles.logo}
              resizeMode="contain"
            />
          </LinearGradient>
        </Animated.View>

        {/* App name */}
        <Text style={[styles.appName, isDark && styles.textLight]}>
          TheSeeks<Text style={styles.accentText}>Academy</Text>
        </Text>

        {/* Tagline */}
        <Text style={[styles.tagline, isDark && styles.taglineDark]}>
          Fort Abbas
        </Text>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Progress bar with shimmer */}
        <View style={styles.progressTrack}>
          <LinearGradient
            colors={['#3B82F6', '#0A84FF']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.progressFill}
          />
          {/* Shimmer layer */}
          <Animated.View
            style={[
              styles.shimmer,
              { transform: [{ translateX: shimmerAnim }] },
            ]}
          >
            <LinearGradient
              colors={['transparent', 'rgba(255,255,255,0.45)', 'transparent']}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={{ flex: 1 }}
            />
          </Animated.View>
        </View>

        {/* Loading label + dots */}
        <View style={styles.loadingRow}>
          <Text style={[styles.loadingLabel, isDark && styles.taglineDark]}>
            Loading
          </Text>
          {[dot1, dot2, dot3].map((d, i) => (
            <Animated.View
              key={i}
              style={[
                styles.dot,
                { opacity: d },
              ]}
            />
          ))}
        </View>
      </Animated.View>

      {/* Bottom caption */}
      <Animated.Text style={[styles.bottomCaption, isDark && styles.taglineDark, { opacity: fadeAnim }]}>
        Empowering Learners • Fort Abbas
      </Animated.Text>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Decorative arc ──
  topArc: {
    position: 'absolute',
    top: -120,
    left: -60,
    width: width + 120,
    height: 320,
    borderRadius: 220,
    overflow: 'hidden',
    opacity: 0.18,
  },
  topArcGradient: {
    flex: 1,
  },

  // ── Card ──
  card: {
    width: width * 0.82,
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    paddingHorizontal: 32,
    paddingTop: 72,
    paddingBottom: 36,
    alignItems: 'center',
    shadowColor: '#0A84FF',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 30,
    elevation: 10,
  },
  cardDark: {
    backgroundColor: '#0F1A2E',
  },

  // ── Logo ──
  logoBadge: {
    position: 'absolute',
    top: -52,
    width: 104,
    height: 104,
    borderRadius: 26,
    shadowColor: '#0A84FF',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 18,
    elevation: 14,
  },
  logoBadgeGradient: {
    flex: 1,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
  },
  logo: {
    width: '100%',
    height: '100%',
  },

  // ── Typography ──
  appName: {
    fontSize: 24,
    fontWeight: '800',
    color: '#111827',
    letterSpacing: 0.3,
    marginBottom: 4,
    marginTop: 8,
  },
  textLight: {
    color: '#F0F6FF',
  },
  accentText: {
    color: '#0A84FF',
  },
  tagline: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
    letterSpacing: 2.5,
    textTransform: 'uppercase',
    marginBottom: 22,
  },
  taglineDark: {
    color: '#6B9BD2',
  },

  // ── Divider ──
  divider: {
    width: '100%',
    height: 1,
    backgroundColor: 'rgba(10,132,255,0.1)',
    marginBottom: 22,
  },

  // ── Progress bar ──
  progressTrack: {
    width: BAR_WIDTH,
    height: 6,
    backgroundColor: 'rgba(10,132,255,0.12)',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 16,
  },
  progressFill: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 3,
  },
  shimmer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 80,
  },

  // ── Loading label + dots ──
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  loadingLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#9CA3AF',
    letterSpacing: 0.5,
    marginRight: 2,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#0A84FF',
  },

  // ── Footer ──
  bottomCaption: {
    position: 'absolute',
    bottom: 36,
    fontSize: 12,
    fontWeight: '500',
    color: '#9CA3AF',
    letterSpacing: 0.8,
  },
});
