import sharp from 'sharp';
import { mkdirSync } from 'fs';

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
const input = 'src/assets/logo/solo-logo.png';
const outDir = 'src/assets/icons';

mkdirSync(outDir, { recursive: true });

for (const size of sizes) {
  // Il logo occupa il 72% dell'icona — il 28% restante è padding per il safe zone iOS
  const logoSize = Math.round(size * 0.72);

  const logoBuffer = await sharp(input)
    .resize(logoSize, logoSize, { fit: 'contain', background: { r: 15, g: 15, b: 15, alpha: 0 } })
    .png()
    .toBuffer();

  await sharp({
    create: {
      width: size, height: size,
      channels: 4,
      background: { r: 15, g: 15, b: 15, alpha: 255 }
    }
  })
  .composite([{ input: logoBuffer, gravity: 'centre' }])
  .png()
  .toFile(`${outDir}/icon-${size}x${size}.png`);

  console.log(`✓ icon-${size}x${size}.png`);
}

// Favicon
await sharp(input)
  .resize(32, 32, { fit: 'contain', background: { r: 15, g: 15, b: 15, alpha: 1 } })
  .png()
  .toFile('src/favicon.ico');

console.log('✓ favicon.ico');
console.log('Icone generate con successo.');
