const fs = require('fs');

const file = 'c:/p/TheSeeks-Students/src/screens/Teachers/TeacherDetailsScreen.tsx';
let content = fs.readFileSync(file, 'utf8');

// The error lines in StyleSheet:
// 299: backgroundColor: isDark ? theme.card : '#fff',
// 312: backgroundColor: isDark ? '#374151' : '#e5e7eb',
// 387: backgroundColor: isDark ? '#374151' : '#e5e7eb',

// Let's just find the `StyleSheet.create({` and replace inside it.
let styleStart = content.indexOf('StyleSheet.create({');
let styleEnd = content.length;

let beforeStyle = content.substring(0, styleStart);
let styleContent = content.substring(styleStart, styleEnd);

styleContent = styleContent.replace(/backgroundColor:\s*isDark\s*\?\s*theme\.card\s*:\s*'#fff'/g, "backgroundColor: '#fff'");
styleContent = styleContent.replace(/backgroundColor:\s*isDark\s*\?\s*'#374151'\s*:\s*'#e5e7eb'/g, "backgroundColor: '#e5e7eb'");

content = beforeStyle + styleContent;

// Now let's find where these styles are used in JSX and apply inline overrides
content = content.replace(
  /<View style=\{\[styles\.imageRing\]\}>/,
  "<View style={[styles.imageRing, { backgroundColor: isDark ? theme.card : '#fff' }]}>"
);

content = content.replace(
  /<View style=\{\[styles\.profileImage\]\}>/,
  "<View style={[styles.profileImage, { backgroundColor: isDark ? '#374151' : '#e5e7eb' }]}>"
);

// For statDivider, it is already overriding in JSX but it might not be.
content = content.replace(
  /<View style=\{styles\.statDivider\} \/>/g,
  "<View style={[styles.statDivider, { backgroundColor: isDark ? '#374151' : '#e5e7eb' }]} />"
);

fs.writeFileSync(file, content);
console.log('Fixed TypeScript errors');
