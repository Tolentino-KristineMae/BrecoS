const fs = require('fs');
const s = fs.readFileSync('C:/xampp/htdocs/GiChe System/frontend/src/app/batch/page.tsx', 'utf8');
// Track stack of opening positions
const parenStack = [], braceStack = [], bracketStack = [];
let inString = null, inComment = null;
for (let i = 0; i < s.length; i++) {
  const ch = s[i];
  if (inString) {
    if (ch === inString && s[i - 1] !== '\\') inString = null;
    continue;
  }
  if (inComment === '/*') {
    if (ch === '*' && s[i + 1] === '/') { inComment = null; i++; }
    continue;
  }
  if (inComment === '//') {
    if (ch === '\n') inComment = null;
    continue;
  }
  if (ch === '"' || ch === "'" || ch === '`') { inString = ch; continue; }
  if (ch === '/' && s[i + 1] === '*') { inComment = '/*'; i++; continue; }
  if (ch === '/' && s[i + 1] === '/') { inComment = '//'; i++; continue; }

  if (ch === '(') parenStack.push(i);
  if (ch === ')') { if (parenStack.length) parenStack.pop(); else console.log('Extra ) at', i); }
  if (ch === '{') braceStack.push(i);
  if (ch === '}') { if (braceStack.length) braceStack.pop(); else console.log('Extra } at', i); }
  if (ch === '[') bracketStack.push(i);
  if (ch === ']') { if (bracketStack.length) bracketStack.pop(); else console.log('Extra ] at', i); }
}
console.log('Unclosed ( positions (last 5):', parenStack.slice(-5));
console.log('Unclosed { positions (last 5):', braceStack.slice(-5));
// Show context around last unclosed {
if (braceStack.length > 0) {
  const pos = braceStack[braceStack.length - 1];
  console.log('Last unclosed { at', pos, ':', s.slice(Math.max(0, pos - 100), pos + 100));
}
if (parenStack.length > 0) {
  const pos = parenStack[parenStack.length - 1];
  console.log('Last unclosed ( at', pos, ':', s.slice(Math.max(0, pos - 100), pos + 100));
}
