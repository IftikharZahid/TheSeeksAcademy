import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Dimensions, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from './navigation/AppNavigator';
import { useTheme } from '../context/ThemeContext';
import { StatusBar } from 'react-native';

const { width } = Dimensions.get('window');

type WelcomeScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Welcome'>;

export const WelcomeScreen: React.FC = () => {
  const { theme, isDark } = useTheme();
  const navigation = useNavigation<WelcomeScreenNavigationProp>();

  const features = [
    { id: 1, text: 'Personalized Coaching', icon: '🎓' },
    { id: 2, text: 'Video & Chat Support', icon: '📹' },
    { id: 3, text: 'Coach Reviews & Ratings', icon: '📋' },
    { id: 4, text: 'Secure Payments', icon: '💳' },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={theme.background} />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Illustration Section */}
        <View style={styles.illustrationContainer}>
          <View style={[styles.circleBackground, { backgroundColor: isDark ? theme.backgroundSecondary : '#f3f4f6' }]} />
          <View style={[styles.phoneFrame, { backgroundColor: theme.card, borderColor: theme.text }]}>
            <Image 
              source={require('../../assets/icon.png')} 
              style={styles.logoImage} 
              resizeMode="contain"
            />
            {/* Mock UI lines */}
            <View style={[styles.mockLineLong, { backgroundColor: theme.border }]} />
            <View style={[styles.mockLineShort, { backgroundColor: theme.border }]} />
            <View style={[styles.mockLineMedium, { backgroundColor: theme.border }]} />
          </View>
        </View>

        {/* Text Content */}
        <View style={styles.textContainer}>
          <Text style={[styles.headline, { color: theme.text }]}>Welcome to The Seeks Academy</Text>
          <Text style={[styles.subheadline, { color: theme.textSecondary }]}>
            Unleash your potential and dive into new cultures with our engaging language tools.
          </Text>

          {/* Feature List */}
          <View style={styles.featureList}>
            {features.map((feature) => (
              <View key={feature.id} style={styles.featureItem}>
                <View style={styles.iconContainer}>
                  <Text style={styles.featureIcon}>{feature.icon}</Text>
                </View>
                <Text style={[styles.featureText, { color: theme.textSecondary }]}>{feature.text}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity 
            style={[styles.getStartedButton, { backgroundColor: theme.primary, shadowColor: theme.primary }]}
            onPress={() => navigation.navigate('Signup')}
          >
            <Text style={styles.getStartedText}>Get Started</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.loginButton, { backgroundColor: theme.background, borderColor: theme.primary }]}
            onPress={() => navigation.navigate('Login')}
          >
            <Text style={[styles.loginText, { color: theme.primary }]}>Log In</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 20,
  },
  illustrationContainer: {
    marginTop: 20,
    marginBottom: 30,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    width: width,
    height: 280,
  },
  circleBackground: {
    position: 'absolute',
    width: 230,
    height: 230,
    borderRadius: 115,
    backgroundColor: '#f3f4f6', // Light gray/purple tint
    top: 20,
  },
  phoneFrame: {
    width: 120,
    height: 250,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    borderWidth: 4,
    borderColor: '#1f2937', // Dark frame
    alignItems: 'center',
    paddingTop: 20,
    elevation: 5,
    shadowColor: '#000',
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
    width: '70%',
    height: 3,
    backgroundColor: '#e5e7eb',
    borderRadius: 4,
    marginBottom: 12,
  },
  mockLineShort: {
    width: '50%',
    height: 5,
    backgroundColor: '#e5e7eb',
    borderRadius: 4,
    marginBottom: 12,
    alignSelf: 'flex-start',
    marginLeft: 14,
  },
  mockLineMedium: {
    width: '60%',
    height: 5,
    backgroundColor: '#e5e7eb',
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginLeft: 14,
  },
  textContainer: {
    width: '100%',
    marginBottom: 20,
  },
  headline: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1f2937',
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 36,
  },
  subheadline: {
    fontSize: 15,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 22,
  },
  featureList: {
    width: '90%',
    paddingHorizontal: 10,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  iconContainer: {
    width: 22,
    alignItems: 'center',
    marginRight: 12,
  },
  featureIcon: {
    fontSize: 16,
  },
  featureText: {
    fontSize: 16,
    color: '#4b5563',
    fontWeight: '500',
  },
  buttonContainer: {
    width: '100%',
    gap: 20,
  },
  getStartedButton: {
    backgroundColor: '#8b5cf6', // Purple
    paddingVertical: 16,
    borderRadius: 20,
    alignItems: 'center',
    width: '100%',
    shadowColor: '#8b5cf6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  getStartedText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  loginButton: {
    backgroundColor: '#ffffff',
    paddingVertical: 16,
    borderRadius: 20,
    alignItems: 'center',
    width: '100%',
    borderWidth: 1.5,
    borderColor: '#8b5cf6', // Purple border
  },
  loginText: {
    color: '#8b5cf6', // Purple text
    fontSize: 16,
    fontWeight: '700',
  },
});
