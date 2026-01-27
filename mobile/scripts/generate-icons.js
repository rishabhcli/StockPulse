#!/usr/bin/env node

/**
 * Icon Generation Script for StockPulse
 *
 * This script generates app icons for iOS, Android, and Web.
 *
 * Prerequisites:
 *   npm install sharp
 *
 * Usage:
 *   node scripts/generate-icons.js
 *
 * Or create your own 1024x1024 icon.png and place it in assets/
 */

const fs = require('fs');
const path = require('path');

// Check if sharp is available
let sharp;
try {
  sharp = require('sharp');
} catch (e) {
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║  StockPulse Icon Generator                                    ║
╠══════════════════════════════════════════════════════════════╣
║                                                                ║
║  To generate icons automatically, install sharp:              ║
║                                                                ║
║    npm install sharp --save-dev                               ║
║                                                                ║
║  Then run this script again.                                  ║
║                                                                ║
║  ─────────────────────────────────────────────────────────── ║
║                                                                ║
║  Alternatively, create icons manually:                        ║
║                                                                ║
║  1. Create a 1024x1024 PNG icon                              ║
║  2. Save as: assets/icon.png                                  ║
║  3. For iOS, also create assets/splash-icon.png (288x288)    ║
║  4. For Android adaptive icon:                                ║
║     - assets/adaptive-icon.png (1024x1024, centered logo)    ║
║                                                                ║
║  Design Guidelines:                                           ║
║  - Background: #0a0a0a (dark)                                ║
║  - Primary color: #22c55e (green)                            ║
║  - Use a simple "SP" or chart icon                           ║
║                                                                ║
╚══════════════════════════════════════════════════════════════╝
`);
  process.exit(0);
}

const ASSETS_DIR = path.join(__dirname, '..', 'assets');

// Icon sizes needed
const SIZES = {
  icon: 1024,           // Main app icon
  adaptiveIcon: 1024,   // Android adaptive icon foreground
  splashIcon: 288,      // Splash screen icon
  favicon: 48,          // Web favicon
};

// Colors
const COLORS = {
  background: '#0a0a0a',
  primary: '#22c55e',
  text: '#ffffff',
};

async function generateIcons() {
  console.log('Generating StockPulse icons...\n');

  // Create a simple icon with "SP" text
  const svgIcon = `
    <svg width="1024" height="1024" xmlns="http://www.w3.org/2000/svg">
      <rect width="1024" height="1024" fill="${COLORS.background}"/>
      <circle cx="512" cy="512" r="400" fill="none" stroke="${COLORS.primary}" stroke-width="40"/>
      <text x="512" y="580" font-family="Arial, sans-serif" font-size="360" font-weight="bold" fill="${COLORS.primary}" text-anchor="middle">SP</text>
    </svg>
  `;

  // Generate main icon
  await sharp(Buffer.from(svgIcon))
    .resize(SIZES.icon, SIZES.icon)
    .png()
    .toFile(path.join(ASSETS_DIR, 'icon.png'));
  console.log('✓ Generated icon.png (1024x1024)');

  // Generate adaptive icon (Android)
  await sharp(Buffer.from(svgIcon))
    .resize(SIZES.adaptiveIcon, SIZES.adaptiveIcon)
    .png()
    .toFile(path.join(ASSETS_DIR, 'adaptive-icon.png'));
  console.log('✓ Generated adaptive-icon.png (1024x1024)');

  // Generate splash icon
  await sharp(Buffer.from(svgIcon))
    .resize(SIZES.splashIcon, SIZES.splashIcon)
    .png()
    .toFile(path.join(ASSETS_DIR, 'splash-icon.png'));
  console.log('✓ Generated splash-icon.png (288x288)');

  // Generate favicon
  await sharp(Buffer.from(svgIcon))
    .resize(SIZES.favicon, SIZES.favicon)
    .png()
    .toFile(path.join(ASSETS_DIR, 'favicon.png'));
  console.log('✓ Generated favicon.png (48x48)');

  console.log('\n✅ All icons generated successfully!');
}

generateIcons().catch(console.error);
