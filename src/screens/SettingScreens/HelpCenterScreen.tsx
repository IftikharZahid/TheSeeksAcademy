import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  LayoutAnimation,
  Platform,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { scale } from '../../utils/responsive';

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
      <TouchableOpacity onPress={onToggle} style={styles.faqHeader} activeOpacity={0.7}>
        <Text style={[styles.faqQuestion, { color: theme.text }]}>{question}</Text>
        <Ionicons 
          name={isOpen ? "chevron-up" : "chevron-down"} 
          size={16} 
          color={theme.textSecondary} 
        />
      </TouchableOpacity>
      {isOpen && (
        <View style={[styles.faqBody, { borderTopWidth: 1, borderTopColor: theme.border + '50' }]}>
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
    if (Platform.OS !== 'web') {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    }
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
      question: "How do I check my daily attendance?",
      answer: "You can view your complete attendance record by tapping the 'Attendance' option in the Quick Actions menu on the Home screen."
    },
    {
      question: "Where can I find today's diary or homework?",
      answer: "Tap on the 'Diary' option on the Home screen. You can use the weekly calendar at the top to filter diary entries by specific dates."
    },
    {
      question: "How can I view my class timetable?",
      answer: "Your daily class schedule is available under the 'Timetable' section. It shows subject details, timings, and assigned teachers."
    },
    {
      question: "Where do I submit or check my assignments?",
      answer: "Go to the 'Assignments' section. There you can find pending assignments, their deadlines, and submit your work directly."
    },
    {
      question: "How do I check my fee details?",
      answer: "Your current fee status, dues, and payment history can be viewed in the 'Fees' section."
    }
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top', 'left', 'right', 'bottom']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={[styles.backBtn, { backgroundColor: theme.backgroundSecondary }]}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={20} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Help Center</Text>
        <View style={{ width: scale(36) }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Frequently Asked Questions */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>FREQUENTLY ASKED QUESTIONS</Text>
          <View style={styles.faqList}>
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
        </View>

      </ScrollView>

      {/* Contact Support (Fixed at Bottom) */}
      <View style={[styles.bottomContainer, { borderTopColor: theme.border, backgroundColor: theme.background }]}>
        <Text style={[styles.sectionLabel, { color: theme.textSecondary, marginBottom: scale(8) }]}>CONTACT SUPPORT</Text>
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={styles.cardHeader}>
            <View style={[styles.iconWrap, { backgroundColor: theme.primary + '15' }]}>
              <Ionicons name="chatbubbles-outline" size={18} color={theme.primary} />
            </View>
            <Text style={[styles.cardTitle, { color: theme.text }]}>Still Need Help?</Text>
          </View>
          <Text style={[styles.cardText, { color: theme.textSecondary }]}>
            Our support team is available to assist you. Get in touch with us via email or phone call.
          </Text>

          <View style={styles.contactButtonsRow}>
            <TouchableOpacity
              style={[styles.contactBtn, { backgroundColor: theme.primary }]}
              onPress={handleEmailPress}
              activeOpacity={0.8}
            >
              <Ionicons name="mail-outline" size={16} color="#ffffff" />
              <Text style={[styles.contactBtnText, { color: '#ffffff' }]}>Email Support</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.contactBtn, { backgroundColor: theme.card, borderWidth: 1, borderColor: theme.primary }]}
              onPress={handleCallPress}
              activeOpacity={0.7}
            >
              <Ionicons name="call-outline" size={16} color={theme.primary} />
              <Text style={[styles.contactBtnText, { color: theme.primary }]}>Call Us</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: scale(12),
    paddingVertical: scale(10),
    borderBottomWidth: 1,
  },
  backBtn: {
    width: scale(36), height: scale(36),
    borderRadius: scale(12),
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: { fontSize: scale(18), fontWeight: '700', letterSpacing: -0.3 },

  scroll: { padding: scale(12), paddingBottom: scale(16), gap: 16 },

  bottomContainer: {
    paddingHorizontal: scale(12),
    paddingTop: scale(12),
    paddingBottom: scale(16),
    borderTopWidth: 1,
  },

  section: { gap: 8 },

  sectionLabel: {
    fontSize: scale(10),
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    paddingLeft: scale(4),
  },

  faqList: { gap: 8 },

  faqItem: {
    borderRadius: scale(14),
    borderWidth: 1,
    overflow: 'hidden',
  },
  faqHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: scale(16),
    paddingVertical: scale(14),
  },
  faqQuestion: {
    fontSize: scale(14),
    fontWeight: '600',
    flex: 1,
    marginRight: scale(10),
    lineHeight: 18,
  },
  faqBody: {
    paddingHorizontal: scale(16),
    paddingBottom: scale(14),
    paddingTop: scale(10),
  },
  faqAnswer: {
    fontSize: scale(13),
    lineHeight: 20,
  },

  card: {
    borderRadius: scale(14),
    borderWidth: 1,
    padding: scale(16),
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: scale(10),
  },
  iconWrap: {
    width: scale(32),
    height: scale(32),
    borderRadius: scale(10),
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: scale(15),
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  cardText: {
    fontSize: scale(13),
    lineHeight: 21,
    letterSpacing: 0.2,
  },

  contactButtonsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: scale(14),
  },
  contactBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: scale(10),
    borderRadius: scale(10),
  },
  contactBtnText: {
    fontSize: scale(13),
    fontWeight: '600',
  },
});
