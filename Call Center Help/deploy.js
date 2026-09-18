#!/usr/bin/env node

/**
 * Adamas (Call Center Help) Deployment Script
 * Builds and deploys the Call Center Help app to https://danielhipskind.com/adamas/
 */

const fs = require('fs');
const path = require('path');
const { execSync, spawnSync } = require('child_process');

const ANSI = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
};

function log(msg, color = ANSI.cyan) {
  console.log(`${color}${msg}${ANSI.reset}`);
}

function error(msg) {
  console.error(`${ANSI.red}❌ ${msg}${ANSI.reset}`);
}

function success(msg) {
  console.log(`${ANSI.green}✅ ${msg}${ANSI.reset}`);
}

// Locate key directories
function resolvePaths() {
  const currentDir = process.cwd();
  const scriptDir = __dirname;

  const candidates = [
    path.resolve(scriptDir),
    path.resolve(scriptDir, 'client'),
    path.resolve(scriptDir, 'Call Center Help/client'),
    path.resolve(currentDir),
    path.resolve(currentDir, 'client'),
    path.resolve(currentDir, 'Call Center Help/client'),
  ];

  let clientDir = null;
  for (const dir of candidates) {
    if (fs.existsSync(path.join(dir, 'package.json'))) {
      const pkg = JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf8'));
      if (pkg.name === 'adamas' || (pkg.scripts && pkg.scripts['build:webpack'])) {
        clientDir = dir;
        break;
      }
    }
  }

  if (!clientDir) {
    clientDir = path.resolve(__dirname, 'client');
    if (!fs.existsSync(clientDir)) {
      clientDir = path.resolve(__dirname, 'Call Center Help/client');
    }
  }

  const rootRepoDir = path.resolve(clientDir, '../..');
  return { clientDir, rootRepoDir };
}

function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const content = fs.readFileSync(filePath, 'utf8');
  const env = {};
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx !== -1) {
      const key = trimmed.slice(0, eqIdx).trim();
      let val = trimmed.slice(eqIdx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      env[key] = val;
    }
  }
  return env;
}

async function purgeCloudflare(zoneId, email, apiKey) {
  if (!zoneId || !apiKey || !email) return;
  log('🔄 Purging Cloudflare cache for danielhipskind.com...');
  try {
    const response = await fetch(`https://api.cloudflare.com/client/v4/zones/${zoneId}/purge_cache`, {
      method: 'POST',
      headers: {
        'X-Auth-Email': email,
        'X-Auth-Key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ purge_everything: true }),
    });
    const data = await response.json();
    if (data.success) {
      success('Cloudflare cache purged successfully.');
    } else {
      console.warn('⚠️ Cloudflare purge warning:', data.errors || data);
    }
  } catch (err) {
    console.warn('⚠️ Cloudflare purge request failed:', err.message);
  }
}

async function verifyDeployment(url) {
  log(`🔍 Verifying deployment at ${url}...`);
  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (res.ok) {
      success(`Site is live and responding with HTTP ${res.status}`);
      // Check build date
      try {
        const dateRes = await fetch(`${url.replace(/\/?$/, '/')}build-date.txt`, { cache: 'no-store' });
        if (dateRes.ok) {
          const dateText = (await dateRes.text()).trim();
          log(`🕒 Remote build date: ${dateText}`, ANSI.yellow);
        }
      } catch (_) {}
    } else {
      console.warn(`⚠️ Site responded with HTTP ${res.status}`);
    }
  } catch (e) {
    console.warn(`⚠️ Verification check failed: ${e.message}`);
  }
}

async function main() {
  const args = process.argv.slice(2);
  const skipBuild = args.includes('--skip-build');
  const fullDeploy = args.includes('--full');

  log('🚀 Starting deployment for Call Center Help (Adamas)...', ANSI.bold + ANSI.blue);

  const { clientDir, rootRepoDir } = resolvePaths();
  log(`📁 Client directory: ${clientDir}`);
  log(`📁 Root repo directory: ${rootRepoDir}`);

  if (fullDeploy) {
    log('🌐 Running full site deployment via deploy.sh...');
    const deploySh = path.join(rootRepoDir, 'deploy.sh');
    if (!fs.existsSync(deploySh)) {
      error(`deploy.sh not found at ${deploySh}`);
      process.exit(1);
    }
    const result = spawnSync('bash', [deploySh], { cwd: rootRepoDir, stdio: 'inherit' });
    process.exit(result.status || 0);
  }

  // Load environment configurations
  const rootEnv = parseEnvFile(path.join(rootRepoDir, '.env.deploy'));
  const clientEnv = parseEnvFile(path.join(clientDir, '.env'));

  const vpsHost = rootEnv.SSH_HOST || '82.25.91.225';
  const vpsUser = rootEnv.SSH_USER || 'root';
  const vpsPass = rootEnv.SSH_PASSWORD || clientEnv.ssh_password;
  const remotePath = rootEnv.PROJECT_PATH
    ? `${rootEnv.PROJECT_PATH}/adamas`
    : '/var/www/danielhipskind.com/adamas';

  if (!vpsPass) {
    error('SSH password not found in .env.deploy or client/.env');
    process.exit(1);
  }

  // Step 1: Build client
  if (!skipBuild) {
    log('🏗️  Building Call Center Help client (npm run build)...');
    try {
      execSync('npm run build', { cwd: clientDir, stdio: 'inherit' });
      success('Build completed successfully.');
    } catch (e) {
      error(`Build failed: ${e.message}`);
      process.exit(1);
    }
  } else {
    log('⏩ Skipping build as requested.');
  }

  const distDir = path.join(clientDir, 'dist');
  if (!fs.existsSync(distDir)) {
    error(`dist directory not found at ${distDir}`);
    process.exit(1);
  }

  // Update build-date.txt
  const now = new Date();
  const dateStr = now.toLocaleString('en-US', {
    timeZone: 'America/New_York',
    dateStyle: 'full',
    timeStyle: 'medium',
  }) + ' EDT';
  fs.writeFileSync(path.join(distDir, 'build-date.txt'), dateStr);
  log(`🕒 Build timestamp: ${dateStr}`, ANSI.yellow);

  // Compress static assets
  log('🗜️  Compressing static assets with gzip...');
  try {
    execSync('find dist -type f \\( -name "*.js" -o -name "*.css" \\) -exec gzip -9 -f -k {} +', {
      cwd: clientDir,
      stdio: 'pipe',
    });
  } catch (_) {}

  // Step 2: Upload dist/ to server
  log(`📤 Uploading dist/ to ${vpsUser}@${vpsHost}:${remotePath}/...`);
  const rsyncDist = spawnSync(
    'sshpass',
    [
      '-e',
      'rsync',
      '-avz',
      '--exclude=client',
      '--exclude=popups',
      `${distDir}/`,
      `${vpsUser}@${vpsHost}:${remotePath}/`,
    ],
    {
      env: { ...process.env, SSHPASS: vpsPass },
      stdio: 'inherit',
    }
  );

  if (rsyncDist.status !== 0) {
    error('Failed to upload dist files to VPS.');
    process.exit(1);
  }
  success('dist/ files uploaded successfully.');

  // Step 3: Upload client support files (excluding node_modules, dist, git)
  log(`📤 Uploading client support files to ${vpsUser}@${vpsHost}:${remotePath}/client/...`);
  const rsyncClient = spawnSync(
    'sshpass',
    [
      '-e',
      'rsync',
      '-az',
      '--exclude=dist',
      '--exclude=node_modules',
      '--exclude=.git',
      '--exclude=.parcel-cache',
      '--exclude=*.log',
      `${clientDir}/`,
      `${vpsUser}@${vpsHost}:${remotePath}/client/`,
    ],
    {
      env: { ...process.env, SSHPASS: vpsPass },
      stdio: 'inherit',
    }
  );

  if (rsyncClient.status !== 0) {
    console.warn('⚠️ Warning: Uploading client support files had non-zero exit.');
  } else {
    success('Client support files synced.');
  }

  // Step 4: Purge Cloudflare Cache
  await purgeCloudflare(
    rootEnv.CLOUDFLARE_ZONE_ID,
    rootEnv.CLOUDFLARE_EMAIL,
    rootEnv.CLOUDFLARE_API_KEY
  );

  // Step 5: Flush local DNS cache
  if (rootEnv.SUDO_PASSWORD) {
    try {
      execSync(
        `echo '${rootEnv.SUDO_PASSWORD}' | sudo -S dscacheutil -flushcache && echo '${rootEnv.SUDO_PASSWORD}' | sudo -S killall -HUP mDNSResponder`,
        { stdio: 'pipe' }
      );
      success('Local DNS cache cleared.');
    } catch (_) {}
  }

  // Step 6: Verify Deployment
  await verifyDeployment('https://danielhipskind.com/adamas/');

  log('\n🎉 Adamas (Call Center Help) successfully deployed to production!', ANSI.bold + ANSI.green);
  log('🌐 Live URL: https://danielhipskind.com/adamas/', ANSI.cyan);
}

main().catch((err) => {
  error(`Deployment error: ${err.message}`);
  process.exit(1);
});
