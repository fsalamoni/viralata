// Usage: node get_access_token.cjs <scope>
const fs = require('fs');
const { google } = require('google-auth-library');
const key = JSON.parse(fs.readFileSync('/tmp/sa.json', 'utf8'));
const scope = process.argv[2] || 'https://www.googleapis.com/auth/cloud-platform';
const c = new google.auth.JWT({
  email: key.client_email,
  key: key.private_key,
  scopes: [scope],
});
c.authorize().then(() => c.getAccessToken().then(t => {
  process.stdout.write(t.token);
  process.exit(0);
})).catch(e => {
  process.stderr.write('ERR: ' + e.message);
  process.exit(2);
});
