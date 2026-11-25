#!/bin/bash
source "$(dirname "$0")/lib.sh"
OP=$(cat "$HERE/.operator_token")
LAKHANPUR_ID=$(curl -s "$BASE/assets?village=Lakhanpur&limit=1" | node -pe "try { JSON.parse(require('fs').readFileSync(0)).data[0].id } catch (e) { '' }")
echo "### 1. No token -> 401"
call DELETE /assets/1
echo; echo "### 2. Logged in as operator, but deleting needs admin -> 403"
call DELETE /assets/1 "" "$OP"
echo; echo "### 3. Rampur operator editing a Lakhanpur asset -> 403"
call PUT /assets/$LAKHANPUR_ID '{"status":"Maintenance"}' "$OP"
