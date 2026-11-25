#!/bin/bash
source "$(dirname "$0")/lib.sh"
KEY="demo-$(date +%s)-abcdef123456"
BODY='{"category":"No water supply","description":"No water in Rampur since yesterday","village":"Rampur"}'
echo "### Same POST sent twice with the same Idempotency-Key"
call POST /farmer/complaints "$BODY" "" "Idempotency-Key: $KEY"
call POST /farmer/complaints "$BODY" "" "Idempotency-Key: $KEY"
