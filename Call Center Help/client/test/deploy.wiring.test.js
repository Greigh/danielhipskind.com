/**
 * @jest-environment node
 */
const fs = require('fs');
const path = require('path');

describe('unified deploy wiring', () => {
  test('package.json deploy uses deploy-with-site.sh', () => {
    const pkg = JSON.parse(
      fs.readFileSync(path.resolve(__dirname, '../package.json'), 'utf8')
    );
    expect(pkg.scripts.deploy).toMatch(/deploy-with-site\.sh/);
  });

  test('deploy-with-site.sh requires site root and sets ADAMS_SRC', () => {
    const script = fs.readFileSync(
      path.resolve(__dirname, '../scripts/deploy-with-site.sh'),
      'utf8'
    );
    expect(script).toMatch(/ADAMS_SRC/);
    expect(script).toMatch(/REQUIRE_ADAMAS_SRC/);
    expect(script).toMatch(/resolve_site_root/);
    expect(script).toMatch(/npm test/);
  });

  test('lib/security.js is required by server.js', () => {
    const server = fs.readFileSync(
      path.resolve(__dirname, '../server.js'),
      'utf8'
    );
    expect(server).toMatch(/require\('\.\/lib\/security'\)/);
  });
});
