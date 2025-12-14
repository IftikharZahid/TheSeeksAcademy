import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle } from 'react-native';
import { useNavigation } from '@react-navigation/native';

interface BackButtonProps {
  onPress?: () => void;
  style?: ViewStyle;
  iconColor?: string;
  backgroundColor?: string;
  size?: number;
}

export const BackButton: React.FC<BackButtonProps> = ({ 
  onPress, 
  style,
  iconColor = '#ffffff',
  backgroundColor = 'rgba(255,255,255,0.2)',
  size = 40
}) => {
  const navigation = useNavigation();

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      navigation.goBack();
    }
  };

  return (
    <TouchableOpacity 
      style={[
        styles.backButton,
        { 
          backgroundColor,
          width: size,
          height: size,
          borderRadius: size / 2
        },
        style
      ]}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <Text style={[styles.backButtonText, { color: iconColor }]}>‹</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  backButton: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 28,
    fontWeight: '700',
    marginTop: -4,
  },
});
