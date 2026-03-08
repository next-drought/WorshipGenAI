#!/bin/sh
# Inject runtime environment variables into the app before nginx starts
cat > /usr/share/nginx/html/env-config.js << ENDOFFILE
window.__env = { GEMINI_API_KEY: "${GEMINI_API_KEY}" };
ENDOFFILE
exec nginx -g "daemon off;"
