#!/usr/bin/env node
/**
 * Root deploy.js
 * Forwards to Call Center Help/deploy.js or runs full site deployment
 */
const path = require('path');
const fs = require('fs');

const callCenterDeploy = path.join(__dirname, 'Call Center Help/deploy.js');
if (fs.existsSync(callCenterDeploy)) {
  require(callCenterDeploy);
} else {
  const { spawnSync } = require('child_process');
  spawnSync('bash', [path.join(__dirname, 'deploy.sh')], { stdio: 'inherit' });
}
