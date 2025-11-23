/**
 * Generate Favicons
 *
 * Creates favicon files in multiple sizes
 */

const fs = require('fs');
const path = require('path');

// SVG content for ArtiConnect logo
const generateSVG = (size, bgColor = '#2563EB') => `
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <!-- Background -->
  <rect width="${size}" height="${size}" fill="${bgColor}" rx="${size * 0.15}"/>

  <!-- Letter "A" -->
  <text
    x="50%"
    y="50%"
    dominant-baseline="middle"
    text-anchor="middle"
    font-family="Arial, sans-serif"
    font-weight="bold"
    font-size="${size * 0.6}"
    fill="white"
  >A</text>
</svg>
`;

// Create public directory if it doesn't exist
const publicDir = path.join(__dirname, '..', 'public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// Generate SVG favicons
const sizes = [
  { name: 'favicon.svg', size: 32 },
  { name: 'icon.svg', size: 512 },
];

sizes.forEach(({ name, size }) => {
  const svg = generateSVG(size);
  fs.writeFileSync(path.join(publicDir, name), svg.trim());
  console.log(`✓ Generated ${name} (${size}x${size})`);
});

// Generate apple-touch-icon
const appleIcon = generateSVG(180);
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.svg'), appleIcon.trim());
console.log('✓ Generated apple-touch-icon.svg (180x180)');

console.log('\n✅ All favicons generated successfully!');
console.log('\nNext steps:');
console.log('1. Add to your HTML <head>:');
console.log('   <link rel="icon" type="image/svg+xml" href="/favicon.svg">');
console.log('   <link rel="apple-touch-icon" href="/apple-touch-icon.svg">');
console.log('\n2. For production, consider converting SVG to PNG using an online tool');
console.log('   like https://cloudconvert.com/svg-to-png for better browser support.');
