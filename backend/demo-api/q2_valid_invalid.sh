#!/bin/bash
source "$(dirname "$0")/lib.sh"
echo "### VALID request"
call POST /complaints '{"title":"No water since morning","category":"No water supply","description":"The Rampur tank tap has been dry since 6 AM."}'
echo; echo "### INVALID request (description too short)"
call POST /complaints '{"title":"No water","description":"dry"}'
