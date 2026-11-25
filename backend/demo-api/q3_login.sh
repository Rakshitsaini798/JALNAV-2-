#!/bin/bash
source "$(dirname "$0")/lib.sh"
node "$HERE/reset-limits.js" > /dev/null 2>&1   # start the demo with fresh rate-limit counters
echo "### Admin logs in"
call POST /auth/login '{"email":"admin@jalnavigator.in","password":"Admin@12345"}'
login admin@jalnavigator.in Admin@12345 .admin_token
login operator.rampur@jalnavigator.in Operator@12345 .operator_token
