const fs = require('fs');
const s = fs.readFileSync('C:/xampp/htdocs/GiChe System/frontend/src/app/batch/page.tsx', 'utf8');
let paren = 0, brace = 0, bracket = 0;
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

  if (ch === '(') paren++;
  if (ch === ')') paren--;
  if (ch === '{') brace++;
  if (ch === '}') brace--;
  if (ch === '[') bracket++;
  if (ch === ']') bracket--;

  if (paren < 0 || brace < 0 || bracket < 0) {
    console.log('NEGATIVE DEPTH at position', i, 'char:', ch);
    console.log('Context:', s.slice(Math.max(0, i - 50), i + 50));
    break;
  }
}
console.log('Paren:', paren, 'Brace:', brace, 'Bracket:', bracket);
