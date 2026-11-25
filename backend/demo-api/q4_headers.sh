#!/bin/bash
source "$(dirname "$0")/lib.sh"
export HIDE_BODY=1
echo "### Security headers on every response"
SHOW_HEADERS=content-security-policy,strict-transport-security,x-content-type-options,x-frame-options,referrer-policy,x-powered-by call GET /dashboard
echo; echo "### CORS: request from an unknown website -> no Access-Control-Allow-Origin header, so the browser blocks it"
SHOW_HEADERS=access-control-allow-origin call GET /dashboard "" "" "Origin: https://evil.example"
echo; echo "### CORS: request from our own frontend -> allowed"
SHOW_HEADERS=access-control-allow-origin call GET /dashboard "" "" "Origin: http://localhost:5173"
