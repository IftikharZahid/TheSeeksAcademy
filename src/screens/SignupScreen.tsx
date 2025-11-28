import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export const SignupScreen: React.FC = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Signup (sample)</Text>
      <Text style={styles.description}>
        Implement registration form here using AuthAPI.signup
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    backgroundColor: '#ffffff',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  description: {
    marginTop: 12,
    textAlign: 'center',
    color: '#4b5563',
  },
});