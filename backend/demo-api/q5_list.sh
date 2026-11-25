#!/bin/bash
source "$(dirname "$0")/lib.sh"
echo "### Filter + sort + paginate"
call GET "/assets?type=borewell&village=Rampur&sort=name&order=asc&page=1&limit=2"
echo; echo "### Asking for a huge page"
call GET "/assets?limit=100000"
