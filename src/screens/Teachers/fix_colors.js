const fs = require('fs');

function fixFile(file, replaces) {
  let content = fs.readFileSync(file, 'utf8');
  replaces.forEach(rep => {
    content = content.replace(rep.find, rep.replace);
  });
  fs.writeFileSync(file, content);
}

// 1. TeachersListScreen.tsx
const listFile = 'c:/p/TheSeeks-Students/src/screens/Teachers/TeachersListScreen.tsx';
const listReplaces = [
  // Fix subject color
  {
    find: /<Text style=\{\[styles\.subject, \{ color: theme\.primary \}\]\} numberOfLines=\{1\}>/g,
    replace: `<Text style={[styles.subject, { color: isDark ? '#93c5fd' : theme.primary }]} numberOfLines={1}>`
  },
  // Fix counter icon color
  {
    find: /<Ionicons name="people" size=\{scale\(16\)\} color=\{theme\.primary\} style=\{\{ marginRight: scale\(6\) \}\} \/>/g,
    replace: `<Ionicons name="people" size={scale(16)} color={isDark ? theme.text : theme.primary} style={{ marginRight: scale(6) }} />`
  },
  // Fix counter text color
  {
    find: /<Text style=\{\{ fontSize: scale\(14\), fontWeight: '700', color: theme\.primary \}\}>\{staff\.length\} Total<\/Text>/g,
    replace: `<Text style={{ fontSize: scale(14), fontWeight: '700', color: isDark ? theme.text : theme.primary }}>{staff.length} Total</Text>`
  }
];

// 2. TeacherDetailsScreen.tsx
const detailsFile = 'c:/p/TheSeeks-Students/src/screens/Teachers/TeacherDetailsScreen.tsx';
const detailsReplaces = [
  // Fix subject color
  {
    find: /<Text style=\{\[styles\.role, \{ color: theme\.primary \}\]\} numberOfLines=\{1\}>\{teacher\.subject\} Specialist<\/Text>/g,
    replace: `<Text style={[styles.role, { color: isDark ? '#93c5fd' : theme.primary }]} numberOfLines={1}>{teacher.subject} Specialist</Text>`
  }
];

fixFile(listFile, listReplaces);
fixFile(detailsFile, detailsReplaces);

console.log('Fixed subject and counter colors for dark mode');
