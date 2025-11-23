#!/usr/bin/env node

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

/**
 * Generate PWA icons for ArtiConnect
 * Creates simple branded icons with the app's theme color
 */

const THEME_COLOR = '#2563EB'; // Blue from manifest
const SIZES = [192, 512];

async function generateIcon(size) {
  const svg = `
    <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <!-- Background -->
      <rect width="${size}" height="${size}" fill="${THEME_COLOR}" rx="${size * 0.1}"/>

      <!-- Icon content - Stylized 'A' for ArtiConnect -->
      <g transform="translate(${size * 0.5}, ${size * 0.5})">
        <!-- Main 'A' shape -->
        <path
          d="M ${-size * 0.25} ${size * 0.3} L 0 ${-size * 0.3} L ${size * 0.25} ${size * 0.3} L ${size * 0.15} ${size * 0.3} L ${size * 0.08} ${size * 0.08} L ${-size * 0.08} ${size * 0.08} L ${-size * 0.15} ${size * 0.3} Z M ${-size * 0.05} ${-size * 0.02} L ${size * 0.05} ${-size * 0.02} L 0 ${-size * 0.15} Z"
          fill="white"
          stroke="white"
          stroke-width="${size * 0.01}"
        />

        <!-- Tool icon accent (hammer) -->
        <circle cx="${size * 0.28}" cy="${-size * 0.28}" r="${size * 0.08}" fill="white" opacity="0.9"/>
        <rect
          x="${size * 0.25}"
          y="${-size * 0.22}"
          width="${size * 0.06}"
          height="${size * 0.15}"
          fill="white"
          opacity="0.9"
          rx="${size * 0.01}"
        />
      </g>
    </svg>
  `;

  const outputPath = path.join(__dirname, '..', 'public', `icon-${size}x${size}.png`);

  try {
    await sharp(Buffer.from(svg))
      .resize(size, size)
      .png()
      .toFile(outputPath);

    console.log(`✅ Generated ${size}x${size} icon: ${outputPath}`);
  } catch (error) {
    console.error(`❌ Failed to generate ${size}x${size} icon:`, error.message);
    throw error;
  }
}

async function generateAllIcons() {
  console.log('🎨 Generating PWA icons for ArtiConnect...\n');

  for (const size of SIZES) {
    await generateIcon(size);
  }

  console.log('\n✨ All icons generated successfully!');
  console.log('\nGenerated files:');
  SIZES.forEach(size => {
    console.log(`  - public/icon-${size}x${size}.png`);
  });
}

// Run the script
generateAllIcons().catch(error => {
  console.error('\n❌ Icon generation failed:', error);
  process.exit(1);
});
