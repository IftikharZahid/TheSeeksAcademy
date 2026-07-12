const fs = require('fs');

const file = 'c:/p/TheSeeks-Students/src/screens/Communication/MessagesScreen.tsx';
let content = fs.readFileSync(file, 'utf8');

// Use regex with \s* to ignore line ending issues
content = content.replace(
  /<View style=\{\{ flex: 1, backgroundColor: theme\.backgroundSecondary \}\}>\s*<KeyboardAvoidingView\s*style=\{\{ flex: 1 \}\}/,
  "<KeyboardAvoidingView\n        style={{ flex: 1, backgroundColor: theme.backgroundSecondary }}"
);

// Also remove the extra </View> at the end
content = content.replace(
  /<\/KeyboardAvoidingView>\s*<\/View>/,
  "</KeyboardAvoidingView>"
);

fs.writeFileSync(file, content);
console.log('Fixed KeyboardAvoidingView structure');
