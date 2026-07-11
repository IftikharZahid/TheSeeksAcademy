import os

def configure_build_gradle():
    path = r"c:\Users\USER\Desktop\Mobile App Dev\TheSeeks Projects\TheSeeks-Students\android\app\build.gradle"
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Find signingConfigs {
    # If release is already there, don't add it.
    if "storeFile file(MYAPP_UPLOAD_STORE_FILE)" not in content:
        # Add release block to signingConfigs
        debug_config = "signingConfigs {\n        debug {\n            storeFile file('debug.keystore')\n            storePassword 'android'\n            keyAlias 'androiddebugkey'\n            keyPassword 'android'\n        }"
        
        release_config = """signingConfigs {
        debug {
            storeFile file('debug.keystore')
            storePassword 'android'
            keyAlias 'androiddebugkey'
            keyPassword 'android'
        }
        release {
            if (project.hasProperty('MYAPP_UPLOAD_STORE_FILE')) {
                storeFile file(MYAPP_UPLOAD_STORE_FILE)
                storePassword MYAPP_UPLOAD_STORE_PASSWORD
                keyAlias MYAPP_UPLOAD_KEY_ALIAS
                keyPassword MYAPP_UPLOAD_KEY_PASSWORD
            }
        }"""
        
        content = content.replace(debug_config, release_config)
        
    if "signingConfig signingConfigs.release" not in content:
        # Find buildTypes -> release -> signingConfig signingConfigs.debug
        old_release = """release {
            // Caution! In production, you need to generate your own keystore file."""
            
        new_release = """release {
            signingConfig signingConfigs.release
            // Caution! In production, you need to generate your own keystore file."""
            
        content = content.replace(old_release, new_release)

    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)

configure_build_gradle()
