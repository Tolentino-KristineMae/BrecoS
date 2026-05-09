const fs = require('fs');
const s = fs.readFileSync('C:/xampp/htdocs/GiChe System/frontend/src/app/batch/page.tsx', 'utf8');
let inSingle = false, inDouble = false, inBacktick = false, inLine = false, inBlock = false;
for (let i = 0; i < s.length; i++) {
  const ch = s[i];
  if (inLine) { if (ch === '\n') inLine = false; continue; }
  if (inBlock) { if (ch === '*' && s[i+1] === '/') { inBlock = false; i++; } continue; }
  if (inBacktick) { if (ch === '`' && s[i-1] !== '\\') inBacktick = false; continue; }
  if (inSingle) { if (ch === "'" && s[i-1] !== '\\') inSingle = false; continue; }
  if (inDouble) { if (ch === '"' && s[i-1] !== '\\') inDouble = false; continue; }
  if (ch === '/' && s[i+1] === '/') { inLine = true; i++; continue; }
  if (ch === '/' && s[i+1] === '*') { inBlock = true; i++; continue; }
  if (ch === '`') { inBacktick = true; continue; }
  if (ch === "'") { inSingle = true; continue; }
  if (ch === '"') { inDouble = true; continue; }
}
console.log('End states:', { inBacktick, inSingle, inDouble, inLine, inBlock });

// Also check for mismatched parentheses/brackets in code portions (outside JSX)
const codePart = s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
let parenDepth = 0, braceDepth = 0, bracketDepth = 0;
for (let i = 0; i < codePart.length; i++) {
  const ch = codePart[i];
  if (ch === '(') parenDepth++;
  if (ch === ')') parenDepth--;
  if (ch === '{') braceDepth++;
  if (ch === '}') braceDepth--;
  if (ch === '[') bracketDepth++;
  if (ch === ']') bracketDepth--;
}
console.log('Depth remaining:', { parenDepth, braceDepth, bracketDepth });
