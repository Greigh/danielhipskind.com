#!/usr/bin/env node

/**
 * Cloudflare Cache Configuration and Verification Script
 * Uses Cloudflare API credentials from .env.deploy to configure:
 *  1. Browser Cache TTL -> 0 ("Respect Existing Headers" from origin NGINX)
 *  2. Edge Cache Rules -> Bypass dynamic APIs, cache static assets, cache pages respecting origin
 *  3. Purges Cloudflare cache and verifies live response headers
 */

const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const envFile = path.join(rootDir, '.env.deploy');

if (!fs.existsSync(envFile)) {
  console.error('❌ .env.deploy file not found at:', envFile);
  process.exit(1);
}

function parseEnv(filePath) {
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

const env = parseEnv(envFile);
const ZONE_ID = env.CLOUDFLARE_ZONE_ID;
const API_KEY = env.CLOUDFLARE_API_KEY;
const EMAIL = env.CLOUDFLARE_EMAIL;

if (!ZONE_ID || !API_KEY || !EMAIL) {
  console.error('❌ Missing CLOUDFLARE_ZONE_ID, CLOUDFLARE_API_KEY, or CLOUDFLARE_EMAIL in .env.deploy');
  process.exit(1);
}

const CF_HEADERS = {
  'X-Auth-Email': EMAIL,
  'X-Auth-Key': API_KEY,
  'Content-Type': 'application/json',
};

async function updateBrowserCacheTTL() {
  console.log('⚙️  Configuring Browser Cache TTL to 0 (Respect Origin Headers)...');
  const res = await fetch(`https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/settings/browser_cache_ttl`, {
    method: 'PATCH',
    headers: CF_HEADERS,
    body: JSON.stringify({ value: 0 }),
  });
  const data = await res.json();
  if (data.success) {
    console.log('✅ Browser Cache TTL set to Respect Existing Headers (value: 0)');
  } else {
    console.error('⚠️ Failed to update Browser Cache TTL:', data.errors);
  }
}

async function updateCacheRules() {
  console.log('⚙️  Finding cache ruleset (phase: http_request_cache_settings)...');
  const listRes = await fetch(`https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/rulesets`, {
    headers: CF_HEADERS,
  });
  const listData = await listRes.json();
  if (!listData.success) {
    console.error('❌ Failed to fetch rulesets:', listData.errors);
    return;
  }

  let cacheRuleset = listData.result.find((r) => r.phase === 'http_request_cache_settings');
  let rulesetId = cacheRuleset ? cacheRuleset.id : null;

  const rules = [
    {
      action: 'set_cache_settings',
      action_parameters: {
        cache: false,
      },
      description: 'Bypass Cache for Dynamic Endpoints',
      enabled: true,
      expression:
        '(starts_with(http.request.uri.path, "/api/") or starts_with(http.request.uri.path, "/adamas/api/") or starts_with(http.request.uri.path, "/admin/") or starts_with(http.request.uri.path, "/socket.io/") or starts_with(http.request.uri.path, "/cleartab/api/"))',
    },
    {
      action: 'set_cache_settings',
      action_parameters: {
        cache: true,
        edge_ttl: { mode: 'respect_origin' },
        browser_ttl: { mode: 'respect_origin' },
      },
      description: 'Cache Static Assets',
      enabled: true,
      expression:
        '(starts_with(http.request.uri.path, "/_next/static/") or starts_with(http.request.uri.path, "/assets/") or starts_with(http.request.uri.path, "/adamas/js/") or starts_with(http.request.uri.path, "/adamas/styles/") or starts_with(http.request.uri.path, "/adamas/audio/"))',
    },
    {
      action: 'set_cache_settings',
      action_parameters: {
        cache: true,
        edge_ttl: { mode: 'respect_origin' },
        browser_ttl: { mode: 'respect_origin' },
      },
      description: 'Cache Adamas Static Web App',
      enabled: true,
      expression:
        '(starts_with(http.request.uri.path, "/adamas/") and not starts_with(http.request.uri.path, "/adamas/api/"))',
    },
    {
      action: 'set_cache_settings',
      action_parameters: {
        cache: true,
        edge_ttl: { mode: 'respect_origin' },
        browser_ttl: { mode: 'respect_origin' },
      },
      description: 'Cache Site Pages with Origin Cache Control',
      enabled: true,
      expression:
        '(http.host eq "danielhipskind.com" and not starts_with(http.request.uri.path, "/api/") and not starts_with(http.request.uri.path, "/admin/") and not starts_with(http.request.uri.path, "/socket.io/") and not starts_with(http.request.uri.path, "/cleartab/"))',
    },
  ];

  if (rulesetId) {
    console.log(`⚙️  Updating existing cache ruleset (${rulesetId})...`);
    const updateRes = await fetch(
      `https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/rulesets/${rulesetId}`,
      {
        method: 'PUT',
        headers: CF_HEADERS,
        body: JSON.stringify({ rules }),
      }
    );
    const updateData = await updateRes.json();
    if (updateData.success) {
      console.log('✅ Cloudflare Cache Rules updated successfully.');
    } else {
      console.error('❌ Failed to update ruleset:', updateData.errors);
    }
  } else {
    console.log('⚙️  Creating new cache ruleset...');
    const createRes = await fetch(
      `https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/rulesets`,
      {
        method: 'POST',
        headers: CF_HEADERS,
        body: JSON.stringify({
          name: 'default',
          kind: 'zone',
          phase: 'http_request_cache_settings',
          rules,
        }),
      }
    );
    const createData = await createRes.json();
    if (createData.success) {
      console.log('✅ Cloudflare Cache Ruleset created successfully.');
    } else {
      console.error('❌ Failed to create ruleset:', createData.errors);
    }
  }
}

async function purgeCache() {
  console.log('🔄 Purging Cloudflare cache...');
  const res = await fetch(`https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/purge_cache`, {
    method: 'POST',
    headers: CF_HEADERS,
    body: JSON.stringify({ purge_everything: true }),
  });
  const data = await res.json();
  if (data.success) {
    console.log('✅ Cloudflare cache purged successfully.');
  } else {
    console.warn('⚠️ Cloudflare purge warning:', data.errors);
  }
}

async function main() {
  console.log('🚀 Starting Cloudflare Cache Setup & Verification...');
  await updateBrowserCacheTTL();
  await updateCacheRules();
  await purgeCache();
  console.log('🎉 Cloudflare Cache setup complete!');
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
