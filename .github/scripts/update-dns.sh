#!/bin/bash
# Try to update DNS via Cloud DNS or document the manual steps
set -e

echo "$FIREBASE_SERVICE_ACCOUNT" > /tmp/firebase-sa.json
cd $GITHUB_WORKSPACE
npm install jsonwebtoken --no-save 2>&1 | tail -1

ACCESS_TOKEN=$(node -e "
const sa = JSON.parse(require('fs').readFileSync('/tmp/firebase-sa.json'));
const jwt = require('jsonwebtoken');
const now = Math.floor(Date.now()/1000);
const token = jwt.sign(
  { iss: sa.client_email, scope: 'https://www.googleapis.com/auth/cloud-platform', aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 },
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

echo "Got access token"

# Try to find the DNS zone for viralata.app in Cloud DNS
echo "=== List Cloud DNS managed zones ==="
ZONES=$(curl -s -H "Authorization: Bearer $ACCESS_TOKEN" \
  "https://dns.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/managedZones")
echo "$ZONES" | head -50

# Try to get records for viralata.app
echo ""
echo "=== Resource records for viralata.app ==="
ZONE_NAME=$(echo "$ZONES" | python3 -c "
import json, sys
d = json.load(sys.stdin)
for z in d.get('managedZones', []):
    if 'viralata' in z.get('dnsName', ''):
        print(z['name'])
        break
" 2>/dev/null)

if [ -n "$ZONE_NAME" ]; then
  echo "Found zone: $ZONE_NAME"
  curl -s -H "Authorization: Bearer $ACCESS_TOKEN" \
    "https://dns.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/managedZones/${ZONE_NAME}/rrsets"
else
  echo "No Cloud DNS zone found for viralata.app"
  echo ""
  echo "DOMAIN IS NOT MANAGED BY GOOGLE CLOUD DNS"
  echo "=========================================="
  echo ""
  echo "MANUAL DNS CONFIGURATION NEEDED at registrar (Hostinger):"
  echo ""
  echo "1. REMOVE these records (Hostinger):"
  echo "   A     viralata.app → 147.79.79.175"
  echo "   A     viralata.app → 88.223.87.193"
  echo "   AAAA  viralata.app → 2a02:4780:4b:781e:8b4d:a052:83e1:3691"
  echo "   AAAA  viralata.app → 2a02:4780:4c:1da7:295a:9ca:2ee6:d5ab"
  echo ""
  echo "2. ADD these records:"
  echo "   A     viralata.app                  → 199.36.158.100"
  echo "   TXT   viralata.app                  → 'hosting-site=viralata'"
  echo "   TXT   _acme-challenge.viralata.app → 'Uvqsuuts4mdwJgoFGeKiMmAYiOF2FR-vbaEVtA1mIGc'"
  echo ""
fi
