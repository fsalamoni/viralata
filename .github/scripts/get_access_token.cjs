const fs = require('fs');
const { google } = require('google-auth-library');
const key = JSON.parse(fs.readFileSync('/tmp/sa.json', 'utf8'));
const c = new google.auth.JWT({
  email: key.client_email,
  key: key.private_key,
  scopes: ['https://www.googleapis.com/auth/cloud-platform'],
});
c.authorize().then(() => c.getAccessToken().then(t => {
  process.stdout.write(t.token);
  process.exit(0);
}));
