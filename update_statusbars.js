const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'src', 'screens', 'AdminScreens');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.tsx') && f !== 'AdminDashboard.tsx');

files.forEach(file => {
    const filePath = path.join(dir, file);
    let content = fs.readFileSync(filePath, 'utf8');

    // 1. Ensure StatusBar is imported from 'react-native'
    const rnImportMatch = content.match(/import \{([^}]+)\} from 'react-native';/);
    if (rnImportMatch && !rnImportMatch[1].includes('StatusBar')) {
        content = content.replace(/import \{([^}]+)\} from 'react-native';/, "import { $1, StatusBar } from 'react-native';");
    }

    // 2. Ensure isDark is destructured from useTheme
    if (content.includes('const { theme } = useTheme();')) {
        content = content.replace('const { theme } = useTheme();', 'const { theme, isDark } = useTheme();');
    }

    // 3. Replace or Insert StatusBar
    const statusBarTag = `<StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={theme.background} />`;
    if (content.includes('<StatusBar')) {
        content = content.replace(/<StatusBar[^>]*\/>/g, statusBarTag);
    } else {
        content = content.replace(/(<SafeAreaView[^>]*>)/, `$1\n      ${statusBarTag}`);
    }

    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated ${file}`);
});
