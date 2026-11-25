#!/bin/bash
source "$(dirname "$0")/lib.sh"
node "$HERE/reset-limits.js" 2>/dev/null | grep -v prisma:query
echo "### 7 wrong logins in a row from the same IP (limit: 5 per 15 minutes)"
for i in 1 2 3 4 5 6 7; do
  code=$(curl -s -o /tmp/jn_last.json -w "%{http_code}" -X POST "$BASE/auth/login" \
    -H "Content-Type: application/json" -d '{"email":"admin@jalnavigator.in","password":"guess'$i'"}')
  echo "attempt $i -> $code"
done
echo; echo "Last response:"; cat /tmp/jn_last.json; echo
