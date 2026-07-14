const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    if (isDirectory) {
      walkDir(dirPath, callback);
    } else if (dirPath.endsWith('.tsx') || dirPath.endsWith('.ts')) {
      callback(dirPath);
    }
  });
}

const frontendDir = path.join(__dirname, 'components');
const appDir = path.join(__dirname, 'app');

const replacements = [
  { regex: /text-\[\#3ECF8E\]/g, replacement: 'text-brand-400' },
  { regex: /bg-\[\#3ECF8E\]/g, replacement: 'bg-brand-400' },
  { regex: /border-\[\#3ECF8E\]/g, replacement: 'border-brand-400' },
  { regex: /from-\[\#3ECF8E\]/g, replacement: 'from-brand-400' },
  { regex: /to-\[\#3ECF8E\]/g, replacement: 'to-brand-400' },
  { regex: /via-\[\#3ECF8E\]/g, replacement: 'via-brand-400' },
  { regex: /text-\[\#050505\]/g, replacement: 'text-surface-0' },
  { regex: /bg-\[\#050505\]/g, replacement: 'bg-surface-0' },
  { regex: /border-\[\#050505\]/g, replacement: 'border-surface-0' },
];

let changedCount = 0;

function processFile(filepath) {
  let content = fs.readFileSync(filepath, 'utf8');
  let originalContent = content;

  replacements.forEach(({ regex, replacement }) => {
    content = content.replace(regex, replacement);
  });

  if (content !== originalContent) {
    fs.writeFileSync(filepath, content, 'utf8');
    changedCount++;
    console.log('Updated', filepath);
  }
}

walkDir(frontendDir, processFile);
walkDir(appDir, processFile);

console.log('Total files cleaned of hardcoded colors:', changedCount);
