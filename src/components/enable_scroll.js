const fs = require('fs');
const targetFile = 'c:/p/TheSeeks-Students/src/components/TopHeader.tsx';
let content = fs.readFileSync(targetFile, 'utf8');

// Change slice from 5 to 15 (to show more items but not overload)
content = content.replace(
  'const topUpdates = recentUpdates.slice(0, 5);',
  'const topUpdates = recentUpdates.slice(0, 15);'
);

// Add maxHeight to dropdownContent to enable scrolling after ~5 items
if (!content.includes('maxHeight: scale(300)')) {
  content = content.replace(
    '  dropdownContent: {\n    flex: 1,\n  },',
    '  dropdownContent: {\n    flexShrink: 1,\n    maxHeight: scale(300),\n  },'
  );
  // Just in case flex: 1 wasn't matched properly
  if (!content.includes('maxHeight: scale(300)')) {
    content = content.replace(
      /dropdownContent: \{[\s\S]*?\},/,
      'dropdownContent: {\n    flexShrink: 1,\n    maxHeight: scale(300),\n  },'
    );
  }
}

fs.writeFileSync(targetFile, content);
console.log('Successfully enabled scrolling and increased update limit!');
