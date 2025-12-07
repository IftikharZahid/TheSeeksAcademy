import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView, Linking } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../context/ThemeContext';

export const AboutScreen: React.FC = () => {
  const navigation = useNavigation();
  const { theme } = useTheme();

  const handleLinkPress = (url: string) => {
    Linking.openURL(url);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.backgroundSecondary }]} edges={['top', 'left', 'right']}>
      {/* Header */}
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.backButton, { backgroundColor: theme.background }]}>
          <Text style={[styles.backIcon, { color: theme.text }]}>‹</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>About Developers</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.logoContainer}>
          <Image 
            source={require('../../../assets/icon.png')} 
            style={styles.appLogo} 
            resizeMode="contain"
          />
          <Text style={[styles.appName, { color: theme.text }]}>The Seeks Academy</Text>
          <Text style={[styles.appVersion, { color: theme.textSecondary }]}>Version 1.0.0</Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Meet the Developer</Text>
          
          <View style={[styles.card, { backgroundColor: theme.card }]}>
            <View style={styles.devHeader}>
              <View style={styles.devAvatarContainer}>
                 <Image 
                  source={require('../../assets/profile.jpg')} 
                  style={styles.devAvatar} 
                />
              </View>
              <View style={styles.devInfo}>
                <Text style={[styles.devName, { color: theme.text }]}>Iftikhar Zahid</Text>
                <Text style={[styles.devRole, { color: theme.primary }]}>Full Stack Developer</Text>
              </View>
            </View>

            <Text style={[styles.devBio, { color: theme.textSecondary }]}>
              Passionate about building intuitive and performant mobile applications. Dedicated to creating seamless user experiences through clean code and modern design.
            </Text>

            <View style={[styles.divider, { backgroundColor: theme.border }]} />

            <View style={styles.socialLinks}>
              <TouchableOpacity style={styles.socialBtn} onPress={() => handleLinkPress('https://github.com/iftikharzahid')}>
                <Text style={styles.socialIcon}>🐙</Text>
                <Text style={[styles.socialText, { color: theme.text }]}>GitHub</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.socialBtn} onPress={() => handleLinkPress('https://linkedin.com/in/iftikharzahid')}>
                <Text style={styles.socialIcon}>💼</Text>
                <Text style={[styles.socialText, { color: theme.text }]}>LinkedIn</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.socialBtn} onPress={() => handleLinkPress('https://zahid.codes')}>
                <Text style={styles.socialIcon}>🌐</Text>
                <Text style={[styles.socialText, { color: theme.text }]}>Portfolio</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.socialBtn} onPress={() => handleLinkPress('https://wa.me/923007971374')}>
                <View style={{ marginBottom: 12 }}>
                  <Svg width={28} height={28} viewBox="0 0 24 24" fill="#25D366">
                    <Path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                  </Svg>
                </View>
                <Text style={[styles.socialText, { color: '#25D366' }]}>WhatsApp</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Credits</Text>
          <View style={[styles.card, { backgroundColor: theme.card }]}>
             <Text style={[styles.creditText, { color: theme.textSecondary }]}>
               Built with React Native, Expo, and ❤️.
             </Text>
          </View>
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
    paddingHorizontal: 20,
  },
  logoContainer: {
    alignItems: 'center',
    marginVertical: 32,
  },
  appLogo: {
    width: 100,
    height: 100,
    borderRadius: 20,
    marginBottom: 16,
  },
  appName: {
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 4,
  },
  appVersion: {
    fontSize: 14,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
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
  devHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  devAvatarContainer: {
    marginRight: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    backgroundColor: '#fff',
    borderRadius: 30,
    padding: 2,
  },
  devAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  devInfo: {
    flex: 1,
  },
  devName: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  devRole: {
    fontSize: 14,
    fontWeight: '600',
  },
  devBio: {
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 20,
  },
  divider: {
    height: 1,
    marginBottom: 20,
  },
  socialLinks: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  socialBtn: {
    alignItems: 'center',
  },
  socialIcon: {
    fontSize: 25,
    marginBottom: 8,
  },
  socialText: {
    fontSize: 12,
    fontWeight: '500',
  },
  creditText: {
    fontSize: 14,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
