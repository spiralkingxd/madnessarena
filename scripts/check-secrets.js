const fs = require("fs");
const path = require("path");

const buildDir = path.join(process.cwd(), ".next", "static");
const sensitivePatterns = [
  /eyJhbGciOiJIUzI1NiIsI[^"'\s]{20,}/g,
  /sk_live_[a-zA-Z0-9]{16,}/g,
  /sbp_[a-z0-9]{20,}/gi,
  /sb_secret_[a-z0-9]{20,}/gi,
  /(?:SUPABASE|DISCORD|TWITCH|BOT).*?(?:SECRET|TOKEN|PASS|PASSWORD)\s*[:=]\s*["'][^"'\s]{8,}["']/gi,
];

function walk(dir, onFile) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath, onFile);
      continue;
    }
    onFile(fullPath);
  }
}

function isScannable(filePath) {
  return /\.(js|mjs|cjs|html|css|map)$/i.test(filePath);
}

console.log("🛡️  Verificando bundle de produção em busca de segredos...");

if (!fs.existsSync(buildDir)) {
  console.log("ℹ️  Pasta .next/static não encontrada. Nada para escanear.");
  process.exit(0);
}

let found = false;
walk(buildDir, (filePath) => {
  if (!isScannable(filePath)) return;

  const content = fs.readFileSync(filePath, "utf8");
  for (const pattern of sensitivePatterns) {
    if (pattern.test(content)) {
      found = true;
      console.error(`❌ Possível segredo encontrado em ${filePath} com padrão ${pattern}`);
    }
  }
});

if (found) {
  console.error("\n🚨 BUILD BLOQUEADO: possível vazamento de segredo no bundle.");
  process.exit(1);
}

console.log("✅ Nenhum segredo sensível detectado no bundle de produção.");
