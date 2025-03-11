import sharp from 'sharp';
import path from 'path';
import { promises as fs } from 'fs';

const INPUT_PATH = 'assets/images/selfedited2.jpg';
const OUTPUT_DIR = 'assets/images';

async function ensureOutputDir() {
  try {
    await fs.mkdir(OUTPUT_DIR, { recursive: true });
  } catch (error) {
    console.error('Failed to create output directory:', error);
    throw error;
  }
}

async function optimizeHeroImage() {
  try {
    await ensureOutputDir();

    // Create WebP versions
    await sharp(INPUT_PATH)
      .webp({ quality: 80 })
      .resize(1920, null, { withoutEnlargement: true })
      .toFile(path.join(OUTPUT_DIR, 'hero-1920.webp'));

    console.log('✅ Created hero-1920.webp');

    // Create responsive sizes
    const sizes = [1440, 1024, 768, 480];

    for (const width of sizes) {
      await sharp(INPUT_PATH)
        .webp({ quality: 80 })
        .resize(width, null, { withoutEnlargement: true })
        .toFile(path.join(OUTPUT_DIR, `hero-${width}.webp`));

      console.log(`✅ Created hero-${width}.webp`);
    }

    console.log('🎉 Image optimization complete!');
  } catch (error) {
    console.error('❌ Failed to optimize images:', error);
    process.exit(1);
  }
}

optimizeHeroImage();
