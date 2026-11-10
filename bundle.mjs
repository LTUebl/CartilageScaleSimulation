import fs from 'fs';
import path from 'path';

const dir = 'c:/Users/emeyer/Documents/Work/Teaching/Mechanobiology/F2026/CartilageScaleSimulation';

const css = fs.readFileSync(path.join(dir, 'style.css'), 'utf-8');
const indexHtml = fs.readFileSync(path.join(dir, 'index.html'), 'utf-8');
let physicsJs = fs.readFileSync(path.join(dir, 'physics.js'), 'utf-8');
let rendererJs = fs.readFileSync(path.join(dir, 'renderer.js'), 'utf-8');
let appJs = fs.readFileSync(path.join(dir, 'app.js'), 'utf-8');

// Strip export/import statements so all modules run in a single standalone script scope
physicsJs = physicsJs
  .replace(/export\s+const\s+/g, 'const ')
  .replace(/export\s+let\s+/g, 'let ')
  .replace(/export\s+function\s+/g, 'function ')
  .replace(/export\s+class\s+/g, 'class ');

rendererJs = rendererJs
  .replace(/export\s+class\s+ConstructRenderer/g, 'class ConstructRenderer')
  .replace(/export\s+function\s+/g, 'function ')
  .replace(/export\s+const\s+/g, 'const ');

appJs = appJs.replace(/import\s+\{[\s\S]*?\}\s+from\s+['"][^'"]+['"];?/g, '');

const combinedJs = `
// ============================================================================
// Bundled Construct Scale, Oxygen Transport & MSC Chondrogenesis Simulator
// (Buckley, Meyer & Kelly 2012, Tissue Engineering Part A, 18(3-4), 382-396)
// ============================================================================
${physicsJs}

${rendererJs}

${appJs}
`;

// Replace <link rel="stylesheet" href="style.css"> with <style>...</style> using function replacer to prevent $ substitution
let standaloneHtml = indexHtml.replace(
  '<link rel="stylesheet" href="style.css">',
  () => `<style>\n${css}\n</style>`
);

// Replace <script type="module" src="app.js"></script> with <script>...</script> using function replacer
standaloneHtml = standaloneHtml.replace(
  '<script type="module" src="app.js"></script>',
  () => `<script>\n${combinedJs}\n</script>`
);

// Optionally embed EBLlogo.png as base64 data URI if present so standalone works 100% offline
const logoPath = path.join(dir, 'EBLlogo.png');
if (fs.existsSync(logoPath)) {
  const logoBase64 = fs.readFileSync(logoPath).toString('base64');
  standaloneHtml = standaloneHtml.replace(
    'src="EBLlogo.png"',
    () => `src="data:image/png;base64,${logoBase64}"`
  );
}

fs.writeFileSync(path.join(dir, 'index_standalone.html'), standaloneHtml, 'utf-8');
console.log('Successfully generated index_standalone.html');
