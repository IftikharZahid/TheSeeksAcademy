import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export const AttendanceScreen: React.FC = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Attendance</Text>
      <View style={styles.card}>
        <Text>Attendance tracking UI</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
    padding: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  card: {
    backgroundColor: '#ffffff',
    padding: 12,
    borderRadius: 8,
  },
});