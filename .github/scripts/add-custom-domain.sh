#!/bin/bash
# Add custom domain to Firebase Hosting via API
set -e

echo "$FIREBASE_SERVICE_ACCOUNT" > /tmp/firebase-sa.json
npm install jsonwebtoken --no-save 2>&1 | tail -1

# Get access token
ACCESS_TOKEN=$(node -e "
const sa = JSON.parse(require('fs').readFileSync('/tmp/firebase-sa.json'));
const jwt = require('jsonwebtoken');
const now = Math.floor(Date.now()/1000);
const token = jwt.sign(
  { iss: sa.client_email, scope: 'https://www.googleapis.com/auth/firebase', aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 },
  sa.private_key, { algorithm: 'RS256' }
);
const https = require('https');
const querystring = require('querystring');
const data = querystring.stringify({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: token });
const req = https.request({ hostname: 'oauth2.googleapis.com', path: '/token', method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }, (res) => {
  let body = '';
  res.on('data', c => body += c);
  res.on('end', () => process.stdout.write(JSON.parse(body).access_token));
});
req.write(data);
req.end();
")

echo "Got access token (length: ${#ACCESS_TOKEN})"

# List existing custom domains
echo "=== Existing custom domains ==="
curl -s -H "Authorization: Bearer $ACCESS_TOKEN" \
  "https://firebasehosting.googleapis.com/v1beta1/projects/${FIREBASE_PROJECT_ID}/sites/${SITE}/customDomains"
echo ""

# Add the custom domain
echo "=== Adding $DOMAIN to $SITE ==="
curl -s -X POST \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  "https://firebasehosting.googleapis.com/v1beta1/projects/${FIREBASE_PROJECT_ID}/sites/${SITE}/customDomains?customDomainId=${DOMAIN//\./_}" \
  -d "{\"hostName\": \"$DOMAIN\"}"
echo ""
