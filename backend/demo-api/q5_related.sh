#!/bin/bash
source "$(dirname "$0")/lib.sh"
echo "### Alerts with their asset (watch the server terminal: 2 queries, not 1 per alert)"
call GET "/alerts?limit=3" | head -30
