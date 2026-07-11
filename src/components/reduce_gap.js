const fs = require('fs');
const targetFile = 'c:/p/TheSeeks-Students/src/components/TopHeader.tsx';
let content = fs.readFileSync(targetFile, 'utf8');

// Reduce width from 290 to 260
content = content.replace(/width: scale\(290\),/g, 'width: scale(260),');

// Reduce gap (paddingVertical from 10 to 8)
content = content.replace(/paddingVertical: scale\(10\),/g, 'paddingVertical: scale(8),');

// Reduce iconSize slightly more and margin right
content = content.replace(/iconBox: \{\s*width: scale\(32\),\s*height: scale\(32\),\s*borderRadius: scale\(16\),\s*justifyContent: 'center',\s*alignItems: 'center',\s*marginRight: scale\(12\),/g, `iconBox: {\n    width: scale(28),\n    height: scale(28),\n    borderRadius: scale(14),\n    justifyContent: 'center',\n    alignItems: 'center',\n    marginRight: scale(10),`);

fs.writeFileSync(targetFile, content);
console.log('Successfully reduced dropdown width and item gap!');
