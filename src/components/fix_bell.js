const fs = require('fs');
const targetFile = 'c:/p/TheSeeks-Students/src/components/TopHeader.tsx';
let content = fs.readFileSync(targetFile, 'utf8');

// Fix bell sound path
content = content.replace(
  "require('../assets/bell.wav')",
  "require('../../assets/bell.wav')"
);

fs.writeFileSync(targetFile, content);
console.log('Successfully fixed bell sound path!');
