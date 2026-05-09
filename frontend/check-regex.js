const fs = require('fs');
const s = fs.readFileSync('C:/xampp/htdocs/GiChe System/frontend/src/app/batch/page.tsx', 'utf8');
const lines = s.split('\n');
// Look for lines that have a slash that might be a regex start
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  // Skip lines that are obviously comments or strings - hard to know perfectly
  // Simple: find lines containing '/' that are not '//' or '/*' or '*'
  if (line.trim().startsWith('//') || line.trim().startsWith('/*') || line.trim().startsWith('*')) continue;
  // Check if there is a '/' that is not part of '//' or '/*' or '/**' or '*/'
  // And not preceded by = or operator that indicates division
  for (let j = 0; j < line.length; j++) {
    if (line[j] === '/' && j + 1 < line.length) {
      if (line[j + 1] === '/') break; // comment, skip rest
      if (line[j + 1] === '*') break;
      // Could be regex or division
      // If it's regex, it will be like /.../ maybe with flags
      // Look ahead for closing /
      let k = j + 1;
      while (k < line.length && line[k] !== '/') k++;
      if (k === line.length) {
        // No closing slash on this line - could be multi-line regex? Rare but possible
        console.log('Possible unterminated regex at line', i + 1, ':', line.trim());
      }
      break; // only check first slash per line
    }
  }
}
