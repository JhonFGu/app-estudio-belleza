import sharp from 'sharp';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.resolve(__dirname, '..', 'public');
const svgPath = path.join(publicDir, 'brand-icon.svg');

const sizes = [
  { name: 'pwa-192x192.png', size: 192 },
  { name: 'pwa-512x512.png', size: 512 },
  { name: 'apple-touch-icon.png', size: 180 },
  { name: 'favicon.png', size: 32 },
];

for (const { name, size } of sizes) {
  await sharp(svgPath)
    .resize(size, size)
    .png()
    .toFile(path.join(publicDir, name));
  console.log(`Generated ${name} (${size}x${size})`);
}

// Also generate favicon.ico (32x32 png saved as .ico alias, or just keep favicon.svg)
console.log('All icons generated.');
