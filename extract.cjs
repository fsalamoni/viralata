const fs = require('fs');
const content = fs.readFileSync('claude design/Viralata (standalone).html', 'utf8');
const scriptStart = '<script type="__bundler/template">';
const jsonStr = content.split(scriptStart)[1].split('</script>')[0].trim();
const html = JSON.parse(jsonStr);
fs.writeFileSync('extracted.html', html);
console.log('Extracted to extracted.html');