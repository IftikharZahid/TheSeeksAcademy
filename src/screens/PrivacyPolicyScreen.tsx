import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';

export const PrivacyPolicyScreen: React.FC = () => {
  const navigation = useNavigation();
  const { theme } = useTheme();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.backgroundSecondary }]} edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.backButton, { backgroundColor: theme.background }]}>
          <Text style={[styles.backIcon, { color: theme.text }]}>‹</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Privacy & Policy</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.card, { backgroundColor: theme.card }]}>
          <Text style={[styles.lastUpdated, { color: theme.textSecondary }]}>Last Updated: November 30, 2025</Text>
          
          <Text style={[styles.sectionTitle, { color: theme.text }]}>1. Introduction</Text>
          <Text style={[styles.paragraph, { color: theme.textSecondary }]}>
            Welcome to The Seeks Academy. We respect your privacy and are committed to protecting your personal data. This privacy policy will inform you as to how we look after your personal data when you visit our application and tell you about your privacy rights and how the law protects you.
          </Text>

          <Text style={[styles.sectionTitle, { color: theme.text }]}>2. Data We Collect</Text>
          <Text style={[styles.paragraph, { color: theme.textSecondary }]}>
            We may collect, use, store and transfer different kinds of personal data about you which we have grouped together follows:
          </Text>
          <View style={styles.bulletPoint}>
            <Text style={[styles.bullet, { color: theme.text }]}>•</Text>
            <Text style={[styles.paragraph, { color: theme.textSecondary }]}>Identity Data includes first name, last name, username or similar identifier.</Text>
          </View>
          <View style={styles.bulletPoint}>
            <Text style={[styles.bullet, { color: theme.text }]}>•</Text>
            <Text style={[styles.paragraph, { color: theme.textSecondary }]}>Contact Data includes email address and telephone numbers.</Text>
          </View>
          <View style={styles.bulletPoint}>
            <Text style={[styles.bullet, { color: theme.text }]}>•</Text>
            <Text style={[styles.paragraph, { color: theme.textSecondary }]}>Technical Data includes internet protocol (IP) address, your login data, browser type and version, time zone setting and location, browser plug-in types and versions, operating system and platform and other technology on the devices you use to access this application.</Text>
          </View>

          <Text style={[styles.sectionTitle, { color: theme.text }]}>3. How We Use Your Data</Text>
          <Text style={[styles.paragraph, { color: theme.textSecondary }]}>
            We will only use your personal data when the law allows us to. Most commonly, we will use your personal data in the following circumstances:
          </Text>
          <View style={styles.bulletPoint}>
            <Text style={[styles.bullet, { color: theme.text }]}>•</Text>
            <Text style={[styles.paragraph, { color: theme.textSecondary }]}>Where we need to perform the contract we are about to enter into or have entered into with you.</Text>
          </View>
          <View style={styles.bulletPoint}>
            <Text style={[styles.bullet, { color: theme.text }]}>•</Text>
            <Text style={[styles.paragraph, { color: theme.textSecondary }]}>Where it is necessary for our legitimate interests (or those of a third party) and your interests and fundamental rights do not override those interests.</Text>
          </View>

          <Text style={[styles.sectionTitle, { color: theme.text }]}>4. Data Security</Text>
          <Text style={[styles.paragraph, { color: theme.textSecondary }]}>
            We have put in place appropriate security measures to prevent your personal data from being accidentally lost, used or accessed in an unauthorized way, altered or disclosed. In addition, we limit access to your personal data to those employees, agents, contractors and other third parties who have a business need to know.
          </Text>

          <Text style={[styles.sectionTitle, { color: theme.text }]}>5. Contact Us</Text>
          <Text style={[styles.paragraph, { color: theme.textSecondary }]}>
            If you have any questions about this privacy policy or our privacy practices, please contact us at: 
            <Text style={[styles.link, { color: theme.primary }]}>
              TheSeeksAcademyFTA@gmail.com
            </Text>
          </Text>
        </View>
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  backIcon: {
    fontSize: 30,
    fontWeight: '700',
    marginTop: -3,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  card: {
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  lastUpdated: {
    fontSize: 12,
    fontStyle: 'italic',
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 16,
    marginBottom: 8,
  },
  paragraph: {
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 8,
  },
  bulletPoint: {
    flexDirection: 'row',
    paddingLeft: 8,
    marginBottom: 4,
  },
  bullet: {
    fontSize: 14,
    marginRight: 8,
    marginTop: 4,
  },
  link: {
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});
