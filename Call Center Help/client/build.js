const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const distPath = path.join(__dirname, 'dist');
const cssOutputPath = path.join(distPath, 'styles');
// const cssFile = path.join(cssOutputPath, 'main.css');
const jsOutputPath = path.join(distPath, 'js');

console.log('🚀 Starting production build...');

try {
  // 3. Copy all [name].[hash].js* and [name].[hash].css* files to [name].js* and [name].css* for compatibility
  console.log(
    '🔗 Copying all [name].[hash].js* and [name].[hash].css* files to predictable names...'
  );

  // Helper to copy files for a given pattern
  function copyHashedFilesToNonHashed(dir, regex, extDesc) {
    const files = fs.readdirSync(dir).filter((f) => regex.test(f));
    if (files.length === 0) {
      console.warn(`⚠️  No ${extDesc} files found in ${dir}`);
      return;
    }
    files.forEach((file) => {
      // Extract the base name (e.g., main, vendor, chunk~foo)
      const match = file.match(/^(.*)\.[a-f0-9]+(\..+)?$/); // [name].[hash][.ext]
      if (!match) return;
      const base = match[1];
      const ext = file.replace(/^.*?\.[a-f0-9]+/, ''); // .js, .js.map, .js.gz, etc.
      // Prevent infinite loop: skip if base already ends with .js or .css
      if (base.endsWith('.js') || base.endsWith('.css')) return;
      const src = path.join(dir, file);
      const dest = path.join(dir, base + ext);
      // Prevent copying to self or to an already existing non-hashed file
      if (file === base + ext) return;
      fs.copyFileSync(src, dest);
      console.log(`✅ Copied ${file} to ${base + ext}`);
    });
  }

  // Copy JS files (including maps and gzipped)
  copyHashedFilesToNonHashed(
    jsOutputPath,
    /^([^.]+)\.[a-f0-9]+\.js(\..+)?$/,
    'JS'
  );

  // Copy CSS files (including maps and gzipped)
  if (fs.existsSync(cssOutputPath)) {
    copyHashedFilesToNonHashed(
      cssOutputPath,
      /^([^.]+)\.[a-f0-9]+\.css(\..+)?$/,
      'CSS'
    );
  }

  // 4. Copy static HTML files (privacy, terms, contact, settings) to dist
  const staticPages = [
    'privacy.html',
    'terms.html',
    'contact.html',
    'settings.html',
  ];
  staticPages.forEach((file) => {
    const src = path.join(__dirname, 'src', file);
    const dest = path.join(distPath, file);
    if (fs.existsSync(src)) {
      // Read the file, update stylesheet reference, and write to dist
      let html = fs.readFileSync(src, 'utf8');
      // Replace any hashed or non-hashed stylesheet reference with main.css
      html = html.replace(
        /<link\s+rel="stylesheet"\s+href="styles\/main(\.[a-f0-9]+)?\.css"\s*\/?>/gi,
        '<link rel="stylesheet" href="styles/main.css" />'
      );
      fs.writeFileSync(dest, html, 'utf8');
      console.log(`✅ Copied ${file} to dist/`);
    } else {
      console.warn(`⚠️  ${file} not found in src/`);
    }
  });

  // 4a. Copy .htaccess to dist
  const htaccessSrc = path.join(__dirname, 'src', 'public', '.htaccess');
  const htaccessDest = path.join(distPath, '.htaccess');
  if (fs.existsSync(htaccessSrc)) {
    fs.copyFileSync(htaccessSrc, htaccessDest);
    console.log('✅ Copied .htaccess to dist/');
  } else {
    console.warn('⚠️  .htaccess not found in src/public/');
  }

  // 4b. Copy audio files (alert sounds and all other files) to dist/audio
  const audioSrcDir = path.join(__dirname, 'src', 'public', 'audio');
  const audioDistDir = path.join(distPath, 'audio');
  if (fs.existsSync(audioSrcDir)) {
    if (!fs.existsSync(audioDistDir)) {
      fs.mkdirSync(audioDistDir, { recursive: true });
    }
    const audioFiles = fs.readdirSync(audioSrcDir);
    audioFiles.forEach((file) => {
      const src = path.join(audioSrcDir, file);
      const dest = path.join(audioDistDir, file);
      fs.copyFileSync(src, dest);
      console.log(`✅ Copied audio asset ${file} to dist/audio/`);
    });
  } else {
    console.warn('⚠️  No audio files found in src/public/audio/');
  }

  // 4c. Copy contact.js to dist/js
  const contactJsSrc = path.join(__dirname, 'src', 'js', 'contact.js');
  const contactJsDest = path.join(jsOutputPath, 'contact.js');
  if (fs.existsSync(contactJsSrc)) {
    fs.copyFileSync(contactJsSrc, contactJsDest);
    console.log(`✅ Copied contact.js to dist/js/`);
  } else {
    console.warn('⚠️  contact.js not found in src/js/');
  }

  // 4d. Copy service worker to dist
  const swSrc = path.join(__dirname, 'public', 'sw.js');
  const swDest = path.join(distPath, 'sw.js');
  if (fs.existsSync(swSrc)) {
    fs.copyFileSync(swSrc, swDest);
    console.log(`✅ Copied sw.js to dist/`);
  } else {
    console.warn('⚠️  sw.js not found in public/');
  }

  // 4e. Copy download script to dist
  const downloadScriptSrc = path.join(
    __dirname,
    'src',
    'public',
    'download-alert-sounds.sh'
  );
  const downloadScriptDest = path.join(distPath, 'download-alert-sounds.sh');
  if (fs.existsSync(downloadScriptSrc)) {
    fs.copyFileSync(downloadScriptSrc, downloadScriptDest);
    console.log(`✅ Copied download-alert-sounds.sh to dist/`);
  } else {
    console.warn('⚠️  download-alert-sounds.sh not found in src/public/');
  }

  // 5. Gzip assets for deployment
  console.log('🗜️ Compressing files...');
  execSync(
    'find dist -type f -name "*.js" -o -name "*.css" | xargs -I {} gzip -9 -f -k {}',
    { stdio: 'inherit' }
  );
  console.log('✅ Compression complete.');

  // Write build date to file (in EST, formatted for HTML)
  const buildDateFile = path.join(distPath, 'build-date.txt');
  try {
    const execSync = require('child_process').execSync;
    // Use date command to get formatted EST date for HTML
    const estDate = execSync(
      'TZ=America/New_York date +"%a %b %d, %Y %H:%M:%S %Z"',
      {
        encoding: 'utf8',
      }
    ).trim();
    fs.writeFileSync(buildDateFile, estDate + '\n');
    // Also update the built Call Center Helper index.html if it exists
    const cchIndex = path.join(distPath, 'index.html');
    if (fs.existsSync(cchIndex)) {
      let html = fs.readFileSync(cchIndex, 'utf8');
      html = html.replace(/(Last updated:)/, `$1 ${estDate}`);
      fs.writeFileSync(cchIndex, html, 'utf8');
      console.log(
        `✅ Updated build date in Call Center Helper index.html: ${estDate}`
      );
    }
  } catch {
    // Fallback to JS Date if shell command fails
    const estDate = new Date().toLocaleString('en-US', {
      timeZone: 'America/New_York',
      hour12: false,
    });
    fs.writeFileSync(buildDateFile, estDate + '\n');
  }

  console.log('\n🎉 Production build finished successfully!');
} catch (error) {
  console.error('\n❌ Build failed.');
  console.error(error.message);
  process.exit(1);
}
