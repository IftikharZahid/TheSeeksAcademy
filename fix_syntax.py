import os
import re

def fix_syntax():
    path = "src/screens/Finance/FeeDetailScreen.tsx"
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()

    # The broken comment in JSX
    # <TouchableOpacity onPress={onRefresh} style={{ backgroundColor: theme.primary, paddingHorizontal: scale(24), // paddingVertical removed in favor of inline padding borderRadius: scale(8) }}>
    # We should restore paddingVertical for the no-data view button!
    
    broken_line = "<TouchableOpacity onPress={onRefresh} style={{ backgroundColor: theme.primary, paddingHorizontal: scale(24), // paddingVertical removed in favor of inline padding borderRadius: scale(8) }}>"
    fixed_line = "<TouchableOpacity onPress={onRefresh} style={{ backgroundColor: theme.primary, paddingHorizontal: scale(24), paddingVertical: scale(12), borderRadius: scale(8) }}>"
    
    if broken_line in content:
        content = content.replace(broken_line, fixed_line)
        
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)

fix_syntax()
