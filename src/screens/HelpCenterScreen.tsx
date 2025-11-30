import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, LayoutAnimation, Platform, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';



interface FAQItemProps {
  question: string;
  answer: string;
  isOpen: boolean;
  onToggle: () => void;
}

const FAQItem: React.FC<FAQItemProps> = ({ question, answer, isOpen, onToggle }) => {
  const { theme } = useTheme();

  return (
    <View style={[styles.faqItem, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <TouchableOpacity onPress={onToggle} style={styles.faqHeader}>
        <Text style={[styles.faqQuestion, { color: theme.text }]}>{question}</Text>
        <Text style={[styles.chevron, { color: theme.textTertiary, transform: [{ rotate: isOpen ? '180deg' : '0deg' }] }]}>
          ▼
        </Text>
      </TouchableOpacity>
      {isOpen && (
        <View style={styles.faqBody}>
          <Text style={[styles.faqAnswer, { color: theme.textSecondary }]}>{answer}</Text>
        </View>
      )}
    </View>
  );
};

export const HelpCenterScreen: React.FC = () => {
  const navigation = useNavigation();
  const { theme } = useTheme();
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggleFAQ = (index: number) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpenIndex(openIndex === index ? null : index);
  };

  const handleEmailPress = () => {
    Linking.openURL('mailto:IftikharXahid@gmail.com');
  };

  const handleCallPress = () => {
    Linking.openURL('tel:+923487000302');
  };

  const faqs = [
    {
      question: "How do I reset my password?",
      answer: "Go to Settings > General > Change Password. You will need to enter your current password and then your new password."
    },
    {
      question: "How can I contact my teacher?",
      answer: "You can find your teacher's contact information in the 'Teachers' section of the app or by visiting their profile."
    },
    {
      question: "Where can I see my attendance?",
      answer: "Your attendance record is available in the 'Attendance Log' section under Settings > Account."
    },
    {
      question: "How do I update my profile picture?",
      answer: "Currently, profile pictures are managed by the administration. Please contact the office to update your photo."
    },
     {
      question: "Is there a dark mode?",
      answer: "Yes! You can enable Dark Mode in Settings > General > Dark Mode."
    }
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.backgroundSecondary }]} edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.backButton, { backgroundColor: theme.background }]}>
          <Text style={[styles.backIcon, { color: theme.text }]}>‹</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Help Center</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Frequently Asked Questions</Text>
          {faqs.map((faq, index) => (
            <FAQItem
              key={index}
              question={faq.question}
              answer={faq.answer}
              isOpen={openIndex === index}
              onToggle={() => toggleFAQ(index)}
            />
          ))}
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Contact Support</Text>
          <View style={[styles.card, { backgroundColor: theme.card }]}>
            <Text style={[styles.contactText, { color: theme.textSecondary }]}>
              Still need help? Our support team is available to assist you.
            </Text>
            
            <TouchableOpacity 
              style={[styles.contactButton, { backgroundColor: theme.primary }]}
              onPress={handleEmailPress}
            >
              <Text style={styles.contactButtonText}>Email Support</Text>
            </TouchableOpacity>
             <TouchableOpacity 
              style={[styles.contactButton, { backgroundColor: theme.card, borderWidth: 1, borderColor: theme.primary, marginTop: 10 }]}
              onPress={handleCallPress}
             >
              <Text style={[styles.contactButtonText, { color: theme.primary }]}>Call Us</Text>
            </TouchableOpacity>
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
    padding: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  faqItem: {
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    overflow: 'hidden',
  },
  faqHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  faqQuestion: {
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
    marginRight: 10,
  },
  chevron: {
    fontSize: 12,
  },
  faqBody: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  faqAnswer: {
    fontSize: 14,
    lineHeight: 20,
  },
  card: {
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    alignItems: 'center',
  },
  contactText: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  contactButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
  },
  contactButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
});
