#!/bin/sh
# Start Flask/gunicorn on internal port 5001
gunicorn --bind 127.0.0.1:5001 --workers 1 --timeout 120 app:app &

# Start nginx on the external port Render expects (10000)
nginx -g "daemon off;"
