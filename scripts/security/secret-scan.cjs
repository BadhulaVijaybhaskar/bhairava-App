#!/usr/bin/env node
/**
 * Lightweight secret / hygiene scan for Bhairava (no external gitleaks required).
 * Scans tracked files only. Exit 1 if high-severity findings.
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const tracked = execSync('git ls-files', { cwd: ROOT, encoding: 'utf8' })
  .split(/\r?\n/)
  .filter(Boolean);

const patterns = [
  { id: 'aws-key', re: /AKIA[0-9A-Z]{16}/, severity: 'high' },
  { id: 'private-key', re: /-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----/, severity: 'high' },
  { id: 'jwt-literal', re: /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/, severity: 'high' },
  { id: 'generic-secret-assign', re: /(api[_-]?key|secret|password|token)\s*[:=]\s*['"][^'"]{12,}['"]/i, severity: 'medium' },
  { id: 'demo-password-runtime', re: /Demo@12345/, severity: 'medium' },
  { id: 'minio-default-prod', re: /minioadmin/, severity: 'low' },
  { id: 'change-me-secret', re: /change-me-(access|refresh)/, severity: 'low' },
];

const allowPath = (p) => {
  if (p.endsWith('.example') || p.includes('.env.example')) return true;
  if (p.includes('docs/')) return true;
  if (p.includes('seed.ts') || p.includes('bootstrap/')) return true;
  if (p.includes('secret-scan') || p.includes('SECURITY') || p.includes('RELEASE_')) return true;
  if (p.includes('notifications.stub.spec')) return true;
  if (p.includes('.spec.ts') || p.includes('.test.ts')) return true;
  if (p.startsWith('archive/')) return true;
  if (p.startsWith('MAIN')) return true; // legacy reference
  return false;
};

const findings = [];
for (const file of tracked) {
  if (!/\.(ts|tsx|js|jsx|mjs|cjs|json|yml|yaml|env|md|sh|ps1|prisma)$/i.test(file)) continue;
  if (file.includes('node_modules') || file.includes('package-lock')) continue;
  let text;
  try {
    text = fs.readFileSync(path.join(ROOT, file), 'utf8');
  } catch {
    continue;
  }
  for (const pat of patterns) {
    if (pat.re.test(text)) {
      const allowed = allowPath(file) && (pat.id === 'demo-password-runtime' || pat.id === 'change-me-secret' || pat.id === 'minio-default-prod' || pat.severity !== 'high');
      // Demo password only allowed in seed + docs explicitly mentioning it
      let ok = false;
      if (pat.id === 'demo-password-runtime') {
        ok = /seed\.ts$|seed\/|docs\/|README|RELEASE_|SECURITY|UAT|ENVIRONMENT|bootstrap|scripts\/e2e\/|secret-scan|env\.schema/.test(file);
      } else if (pat.severity === 'low' || pat.severity === 'medium') {
        ok = allowPath(file);
      }
      findings.push({
        file,
        id: pat.id,
        severity: pat.severity,
        allowed: ok,
      });
    }
  }
}

const blocked = findings.filter((f) => !f.allowed && (f.severity === 'high' || f.id === 'demo-password-runtime'));
const report = {
  scannedFiles: tracked.length,
  findingCount: findings.length,
  blockedCount: blocked.length,
  findings,
  blocked,
  note: 'Demo@12345 allowed only in seed/docs. Production runtime must not embed it.',
};
const outPath = path.join(ROOT, 'artifacts', 'secret-scan-report.json');
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(report, null, 2));
console.log(JSON.stringify({ ok: blocked.length === 0, blockedCount: blocked.length, findingCount: findings.length, outPath }, null, 2));
if (blocked.length) {
  console.error('BLOCKED findings:');
  for (const b of blocked) console.error(`  [${b.severity}] ${b.id} @ ${b.file}`);
  process.exit(1);
}
