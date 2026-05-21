const fs = require('fs');
const path = require('path');
const dir = path.join(__dirname, 'components', 'landing');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.tsx'));

const replacements = [
  { regex: /text-blue-400/g, replacement: 'text-[#3ECF8E]' },
  { regex: /text-blue-500/g, replacement: 'text-[#3ECF8E]' },
  { regex: /text-blue-600/g, replacement: 'text-[#3ECF8E]' },
  { regex: /bg-blue-400/g, replacement: 'bg-[#3ECF8E]' },
  { regex: /bg-blue-500/g, replacement: 'bg-[#3ECF8E]' },
  { regex: /bg-blue-600/g, replacement: 'bg-[#3ECF8E]' },
  { regex: /border-blue-400/g, replacement: 'border-[#3ECF8E]' },
  { regex: /border-blue-500/g, replacement: 'border-[#3ECF8E]' },
  { regex: /border-blue-600/g, replacement: 'border-[#3ECF8E]' },
  { regex: /from-blue-400/g, replacement: 'from-[#3ECF8E]' },
  { regex: /from-blue-500/g, replacement: 'from-[#3ECF8E]' },
  { regex: /from-blue-600/g, replacement: 'from-[#3ECF8E]' },
  { regex: /to-blue-400/g, replacement: 'to-[#3ECF8E]' },
  { regex: /to-blue-500/g, replacement: 'to-[#3ECF8E]' },
  { regex: /to-blue-600/g, replacement: 'to-[#3ECF8E]' },
  { regex: /via-blue-500/g, replacement: 'via-[#3ECF8E]' },
  { regex: /shadow-\[0_0_[0-9]+px_rgba\(59,130,246,[0-9.]+\)\]/g, replacement: 'shadow-[0_0_24px_rgba(62,207,142,0.2)]' },
  { regex: /shadow-\[0_0_[0-9]+px_rgba\(99,102,241,[0-9.]+\)\]/g, replacement: 'shadow-[0_0_24px_rgba(62,207,142,0.2)]' },
  { regex: /shadow-\[0_0_[0-9]+px_rgba\(6,182,212,[0-9.]+\)\]/g, replacement: 'shadow-[0_0_24px_rgba(62,207,142,0.2)]' }
];

let changedCount = 0;
files.forEach(file => {
  const filepath = path.join(dir, file);
  let content = fs.readFileSync(filepath, 'utf8');
  let originalContent = content;

  replacements.forEach(({ regex, replacement }) => {
    content = content.replace(regex, replacement);
  });

  if (content !== originalContent) {
    fs.writeFileSync(filepath, content, 'utf8');
    changedCount++;
    console.log('Updated', file);
  }
});
console.log('Total files updated:', changedCount);
