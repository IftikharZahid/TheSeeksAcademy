const fs = require('fs');
['src/screens/AdminScreens/AdminComplaintsScreen.tsx', 'src/screens/AdminScreens/ComplaintsScreen.tsx'].forEach(f => {
    let t = fs.readFileSync(f, 'utf8');
    t = t.replace(/,\r?\n, StatusBar \} from 'react-native';/g, ",\r\n  StatusBar\r\n} from 'react-native';");
    t = t.replace(/,\n, StatusBar \} from 'react-native';/g, ",\n  StatusBar\n} from 'react-native';");
    fs.writeFileSync(f, t);
});
