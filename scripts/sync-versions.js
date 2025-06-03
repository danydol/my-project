#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Synchronizes version across all package.json files in the project
 */
function syncVersions() {
  try {
    // Read root package.json
    const rootPackagePath = path.join(__dirname, '..', 'package.json');
    const rootPackage = JSON.parse(fs.readFileSync(rootPackagePath, 'utf8'));
    const version = rootPackage.version;

    console.log(`🔄 Syncing version ${version} across all packages...`);

    // Package paths to update
    const packagePaths = [
      path.join(__dirname, '..', 'frontend', 'package.json'),
      path.join(__dirname, '..', 'backend', 'package.json')
    ];

    // Update each package.json
    packagePaths.forEach(packagePath => {
      if (fs.existsSync(packagePath)) {
        const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
        packageJson.version = version;
        
        fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2) + '\n');
        
        const packageName = packageJson.name || path.basename(path.dirname(packagePath));
        console.log(`✅ Updated ${packageName} to version ${version}`);
      } else {
        console.log(`⚠️  Package.json not found: ${packagePath}`);
      }
    });

    // Update Docker Compose labels if exists
    const dockerComposePath = path.join(__dirname, '..', 'docker-compose.yml');
    if (fs.existsSync(dockerComposePath)) {
      let dockerCompose = fs.readFileSync(dockerComposePath, 'utf8');
      
      // Update version labels in docker-compose.yml
      dockerCompose = dockerCompose.replace(
        /(version:\s*)"[\d\.]+"/g,
        `$1"${version}"`
      );
      
      fs.writeFileSync(dockerComposePath, dockerCompose);
      console.log(`✅ Updated docker-compose.yml version labels to ${version}`);
    }

    console.log(`🎉 Version sync completed successfully! All packages now at v${version}`);
    
  } catch (error) {
    console.error('❌ Error syncing versions:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  syncVersions();
}

module.exports = { syncVersions }; 