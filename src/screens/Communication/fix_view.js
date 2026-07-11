const fs = require('fs');

const file = 'c:/p/TheSeeks-Students/src/screens/Communication/MessagesScreen.tsx';
let content = fs.readFileSync(file, 'utf8');

// Insert </View> after </KeyboardAvoidingView>
content = content.replace(
  "</KeyboardAvoidingView>",
  "</KeyboardAvoidingView>\n      </View>"
);

fs.writeFileSync(file, content);
console.log('Fixed unclosed View');
