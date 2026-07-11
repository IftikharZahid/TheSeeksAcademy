const fs = require('fs');
const path = require('path');

const screensDir = path.join(__dirname, 'src/screens');

const targetFiles = [
  'Academics/AssignmentsScreen.tsx',
  'Academics/AttendanceScreen.tsx',
  'Academics/DiaryScreen.tsx',
  'Academics/TimetableScreen.tsx',
  'Academics/ResultsScreen.tsx',
  'Lectures/LikedVideosScreen.tsx',
  'Lectures/VideoGalleryScreen.tsx',
  'Lectures/VideoLecturesScreen.tsx',
  'Finance/FeeDetailScreen.tsx',
  'Communication/MessagesScreen.tsx',
  'SettingScreens/HelpCenterScreen.tsx',
  'SettingScreens/PrivacyPolicyScreen.tsx',
  'SettingScreens/SettingsScreen.tsx',
  'Teachers/TeachersListScreen.tsx'
];

targetFiles.forEach(relPath => {
  const filePath = path.join(screensDir, relPath);
  let content = fs.readFileSync(filePath, 'utf8');

  // Replace StatusBar
  content = content.replace(
    /<StatusBar[^>]*\/>/g,
    `<StatusBar barStyle="light-content" backgroundColor={theme.primary} translucent={false} />`
  );

  // Replace header background
  content = content.replace(
    /<View style={\[styles\.header,\s*{([^}]*)}\]}/g,
    (match, p1) => {
      let newStyles = p1.replace(/backgroundColor:\s*[^,]+,?/g, '');
      newStyles = newStyles.replace(/borderBottomColor:\s*[^,]+,?/g, '');
      return `<View style={[styles.header, { ${newStyles} backgroundColor: theme.primary, borderBottomColor: 'transparent' }]}`;
    }
  );

  // Replace text colors in header
  // Note: this is tricky. The header usually contains:
  // <Text style={[styles.headerTitle, { color: theme.text }]}>
  // or <Ionicons name="arrow-back" ... color={theme.text} />
  
  // We can look for <Text style={[styles.headerTitle, { color: theme.text }]}> 
  content = content.replace(
    /<Text style={\[styles\.headerTitle,\s*{\s*color:\s*[^}]+}\]}/g,
    `<Text style={[styles.headerTitle, { color: '#ffffff' }]}`
  );

  // Replace arrow back color
  content = content.replace(
    /color={theme\.text}\s*\/>/g, // very loose, but usually arrow-back has this inside header
    `color="#ffffff" />`
  );
  
  // Also fix arrow-back if it uses isDark ternary
  content = content.replace(
    /color={isDark \? '[^']+' : '[^']+'}\s*\/>/g,
    `color="#ffffff" />`
  );

  fs.writeFileSync(filePath, content, 'utf8');
  console.log('Processed', relPath);
});
