import sharp from 'sharp';
import { mkdirSync } from 'fs';

const input = 'src/assets/logo/logo.png';
const outDir = 'src/assets/splash';
mkdirSync(outDir, { recursive: true });

// [width, height, logoSize]
const splashSizes = [
  [1320, 2868, 280], // iPhone 16 Pro Max
  [1179, 2556, 240], // iPhone 16 / 15 Pro
  [1170, 2532, 240], // iPhone 14 / 13 / 12
  [750,  1334, 160], // iPhone SE
  [828,  1792, 180], // iPhone 11 / XR
];

for (const [w, h, logoSize] of splashSizes) {
  // 1. Ridimensiona il logo
  const logoBuffer = await sharp(input)
    .resize(logoSize, logoSize, { fit: 'contain', background: { r: 15, g: 15, b: 15, alpha: 0 } })
    .png()
    .toBuffer();

  // 2. Componi: sfondo scuro + logo centrato
  await sharp({
    create: {
      width: w,
      height: h,
      channels: 4,
      background: { r: 15, g: 15, b: 15, alpha: 255 }
    }
  })
  .composite([{
    input: logoBuffer,
    gravity: 'centre'
  }])
  .png()
  .toFile(`${outDir}/apple-splash-${w}x${h}.png`);

  console.log(`✓ apple-splash-${w}x${h}.png`);
}

console.log('Apple splash screens generate con successo.');
