const fs = require('fs');

function fixFile(file, replaces) {
  let content = fs.readFileSync(file, 'utf8');
  replaces.forEach(rep => {
    content = content.replace(rep.find, rep.replace);
  });
  fs.writeFileSync(file, content);
}

// 1. Fix TeacherDetailsScreen
const detailsFile = 'c:/p/TheSeeks-Students/src/screens/Teachers/TeacherDetailsScreen.tsx';
const detailsReplaces = [
  // Remove heart button and add Header text
  {
    find: /\{\/\* Header Title Removed \*\/\}[\s\S]*?<\/TouchableOpacity>/,
    replace: `<Text style={[styles.headerTitle, { color: '#ffffff' }]}>Teacher Profile</Text>\n          <View style={{ width: scale(40) }} />`
  },
  // Fix #e5e7eb background
  {
    find: /backgroundColor:\s*'#e5e7eb'/g,
    replace: `backgroundColor: isDark ? '#374151' : '#e5e7eb'`
  },
  // Fix #fee2e2 background
  {
    find: /backgroundColor:\s*'#fee2e2'/g,
    replace: `backgroundColor: isDark ? 'rgba(248,113,113,0.15)' : '#fee2e2'`
  },
  // Fix #dcfce7 background
  {
    find: /backgroundColor:\s*'#dcfce7'/g,
    replace: `backgroundColor: isDark ? 'rgba(74,222,128,0.15)' : '#dcfce7'`
  },
  // Fix #fff background in styles
  {
    find: /backgroundColor:\s*'#fff'/g,
    replace: `backgroundColor: isDark ? theme.card : '#fff'`
  },
  {
    find: /color:\s*'#000'/g,
    replace: `color: theme.text`
  }
];

// 2. Fix TeachersListScreen
const listFile = 'c:/p/TheSeeks-Students/src/screens/Teachers/TeachersListScreen.tsx';
const listReplaces = [
  {
    find: /backgroundColor:\s*'#e5e7eb'/g,
    replace: `backgroundColor: isDark ? '#374151' : '#e5e7eb'`
  }
];

fixFile(detailsFile, detailsReplaces);
fixFile(listFile, listReplaces);
console.log('Fixed Teacher Screens for Dark Mode and Header');
