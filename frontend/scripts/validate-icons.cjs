#!/usr/bin/env node
/**
 * Icon Validation Script
 * 
 * Scans the codebase for icon usages and validates they exist in the iconCache.
 * Run this in CI or before commits to catch missing icons early.
 * 
 * Usage: node scripts/validate-icons.cjs
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const SRC_DIR = path.join(__dirname, '../src');
const ICON_CACHE_FILE = path.join(SRC_DIR, 'iconCache.ts');

// Patterns to find icon usages
const ICON_PATTERNS = [
  /iconType=["']([^"']+)["']/g,           // iconType="search"
  /icon:\s*["']([^"']+)["']/g,            // icon: 'search'
  /<EuiIcon[^>]*type=["']([^"']+)["']/g,  // <EuiIcon type="search"
  /<EuiButtonIcon[^>]*iconType=["']([^"']+)["']/g,  // <EuiButtonIcon iconType="search"
];

// Icons that are valid but not in our cache (emojis, custom SVGs, etc.)
const IGNORE_PATTERNS = [
  /^[^\w]/,      // Starts with non-word char (emojis)
  /^http/,       // URLs
  /^data:/,      // Data URIs
  /^\//,         // Paths
  /^button$/,    // HTML button type="button"
  /^submit$/,    // HTML button type="submit"
  /^reset$/,     // HTML button type="reset"
  /^text$/,      // HTML input type="text"
  /^number$/,    // HTML input type="number"
  /^checkbox$/,  // HTML input type
  /^radio$/,     // HTML input type
  /^password$/,  // HTML input type
];

function extractIconsFromFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const icons = new Set();
  
  for (const pattern of ICON_PATTERNS) {
    let match;
    // Reset regex state
    pattern.lastIndex = 0;
    while ((match = pattern.exec(content)) !== null) {
      const icon = match[1];
      // Skip ignored patterns
      if (!IGNORE_PATTERNS.some(p => p.test(icon))) {
        icons.add(icon);
      }
    }
  }
  
  return icons;
}

function getRegisteredIcons() {
  const content = fs.readFileSync(ICON_CACHE_FILE, 'utf8');
  const icons = new Set();
  
  // Match entries in appendIconComponentCache like:
  //   icon_name,
  //   'icon_name': varName,
  //   iconName: varName,
  const entryPattern = /^\s*['"]?(\w+)['"]?(?::|,)/gm;
  
  let match;
  while ((match = entryPattern.exec(content)) !== null) {
    icons.add(match[1]);
  }
  
  return icons;
}

function findTsxFiles(dir) {
  const files = [];
  
  function scan(currentDir) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      
      if (entry.isDirectory() && entry.name !== 'node_modules' && entry.name !== 'dist') {
        scan(fullPath);
      } else if (entry.isFile() && (entry.name.endsWith('.tsx') || entry.name.endsWith('.ts'))) {
        // Skip iconCache itself
        if (!entry.name.includes('iconCache')) {
          files.push(fullPath);
        }
      }
    }
  }
  
  scan(dir);
  return files;
}

function main() {
  console.log('🔍 Validating icon usage...\n');
  
  // Get registered icons
  const registeredIcons = getRegisteredIcons();
  console.log(`📦 Found ${registeredIcons.size} icons in iconCache.ts\n`);
  
  // Find all TSX/TS files
  const files = findTsxFiles(SRC_DIR);
  console.log(`📂 Scanning ${files.length} files...\n`);
  
  // Track all used icons and any missing ones
  const allUsedIcons = new Set();
  const missingIcons = new Map(); // icon -> [files]
  
  for (const file of files) {
    const icons = extractIconsFromFile(file);
    const relativePath = path.relative(SRC_DIR, file);
    
    for (const icon of icons) {
      allUsedIcons.add(icon);
      
      if (!registeredIcons.has(icon)) {
        if (!missingIcons.has(icon)) {
          missingIcons.set(icon, []);
        }
        missingIcons.get(icon).push(relativePath);
      }
    }
  }
  
  // Report results
  console.log(`📊 Found ${allUsedIcons.size} unique icons used in code\n`);
  
  if (missingIcons.size === 0) {
    console.log('✅ All icons are registered in iconCache.ts!\n');
    console.log('Your icon setup is bulletproof. 🛡️');
    process.exit(0);
  } else {
    console.log(`❌ Found ${missingIcons.size} icons NOT in iconCache.ts:\n`);
    
    for (const [icon, files] of missingIcons) {
      console.log(`  ⚠️  "${icon}"`);
      for (const file of files) {
        console.log(`      └─ ${file}`);
      }
    }
    
    console.log('\n📝 To fix:');
    console.log('   1. Check if the icon name is correct (see EUI docs)');
    console.log('   2. Run: node scripts/generate-icon-cache.cjs');
    console.log('   3. If it\'s a custom icon, add it to the ALIASES in generate-icon-cache.cjs\n');
    
    process.exit(1);
  }
}

main();
