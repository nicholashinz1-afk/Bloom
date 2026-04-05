import sharp from 'sharp';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const svg = readFileSync(resolve(root, 'icon.svg'));

// Standard icons
await sharp(svg, { density: 300 })
  .resize(192, 192)
  .png()
  .toFile(resolve(root, 'icon-192.png'));

await sharp(svg, { density: 300 })
  .resize(512, 512)
  .png()
  .toFile(resolve(root, 'icon-512.png'));

// Maskable icon: add 20% padding (safe zone) around the original
// Maskable icons need content within the inner 80% circle
const maskableSize = 512;
const padding = Math.round(maskableSize * 0.1); // 10% each side = 80% content area
const contentSize = maskableSize - (padding * 2);

const resizedContent = await sharp(svg, { density: 300 })
  .resize(contentSize, contentSize)
  .png()
  .toBuffer();

await sharp({
  create: {
    width: maskableSize,
    height: maskableSize,
    channels: 4,
    background: { r: 13, g: 22, b: 16, alpha: 1 } // #0d1610
  }
})
  .composite([{ input: resizedContent, left: padding, top: padding }])
  .png()
  .toFile(resolve(root, 'icon-maskable-512.png'));

console.log('Generated: icon-192.png, icon-512.png, icon-maskable-512.png');
