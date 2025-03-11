import sharp from 'sharp';
import path from 'path';
import { promises as fs } from 'fs';

const INPUT_PATH = 'assets/images/danielportfolio.png';
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

    // Create WebP versions with proper quality for PNG source
    const sizes = [1920, 1440, 1024, 768, 480];

    for (const width of sizes) {
      await sharp(INPUT_PATH)
        .webp({
          quality: 90, // Higher quality for PNG source
          lossless: true, // Preserve PNG quality
        })
        .resize(width, null, {
          withoutEnlargement: true,
          kernel: sharp.kernel.lanczos3, // Better for text/UI elements
        })
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
