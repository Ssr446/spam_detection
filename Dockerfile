# ──────────────────────────────────────────────
# Stage 1: Build the React frontend
# ──────────────────────────────────────────────
FROM node:22-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# ──────────────────────────────────────────────
# Stage 2: Final image with nginx + Python
# ──────────────────────────────────────────────
FROM python:3.10-slim

# Install nginx and build tools
RUN apt-get update && apt-get install -y --no-install-recommends \
    nginx \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# ── Python backend ──
WORKDIR /app/backend
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
RUN python -m nltk.downloader stopwords
COPY backend/ ./
RUN python train_model.py

# ── React frontend → nginx ──
COPY --from=frontend-builder /app/frontend/dist /usr/share/nginx/html

# ── nginx config ──
COPY nginx.conf /etc/nginx/conf.d/default.conf
# Remove the default nginx site
RUN rm -f /etc/nginx/sites-enabled/default

# ── Startup script ──
COPY start.sh /start.sh
RUN chmod +x /start.sh

# Render expects the app on port 10000
EXPOSE 10000

ENV FLASK_APP=app.py

CMD ["/start.sh"]
