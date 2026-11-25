#!/bin/bash
# Helper for the video demos: prints the curl command, then the status, key headers and JSON body.
BASE="${BASE:-http://localhost:3000/api/v1}"
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

call() {
  local method="$1" path="$2" body="$3" token="$4" extra="$5"
  local shown="curl -X $method $BASE$path"
  local args=(-s -i -X "$method" "$BASE$path" -c "$HERE/.cookies" -b "$HERE/.cookies")
  if [ -n "$body" ]; then args+=(-H "Content-Type: application/json" -d "$body"); shown="$shown -d '$body'"; fi
  if [ -n "$token" ]; then args+=(-H "Authorization: Bearer $token"); shown="$shown -H 'Authorization: Bearer <token>'"; fi
  if [ -n "$extra" ]; then args+=(-H "$extra"); shown="$shown -H '$extra'"; fi
  printf '\n\033[1;36m$ %s\033[0m\n' "$shown"
  curl "${args[@]}" | node "$HERE/pretty.js"
}

login() { # login <email> <password> <tokenfile>
  local raw
  raw=$(curl -s -X POST "$BASE/auth/login" -H "Content-Type: application/json" -c "$HERE/.cookies" \
    -d "{\"email\":\"$1\",\"password\":\"$2\"}")
  echo "$raw" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{try{process.stdout.write(JSON.parse(s).accessToken||'')}catch(e){}})" > "$HERE/$3"
}
