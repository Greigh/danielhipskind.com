const fs = require('fs');
const path = require('path');

console.log('🧹 Cleaning all build artifacts...');

const artifacts = ['dist', '.parcel-cache', '.sass-cache'];

artifacts.forEach((artifact) => {
  const artifactPath = path.join(__dirname, artifact);
  if (fs.existsSync(artifactPath)) {
    console.log(`Removing ${artifact}...`);
    fs.rmSync(artifactPath, { recursive: true, force: true });
  }
});

console.log('✅ Cleaning complete.');
