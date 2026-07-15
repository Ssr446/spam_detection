# Stage 1: Build the React frontend
FROM node:22-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# Stage 2: Setup Python environment and backend
FROM python:3.10-slim
WORKDIR /app/backend

# Install necessary system dependencies for NLTK/Scikit-Learn if needed
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy backend requirements and install
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Download NLTK data (stopwords) explicitly during build
RUN python -m nltk.downloader stopwords

# Copy backend source code
COPY backend/ ./

# Copy the built React app into the Flask static folder
COPY --from=frontend-builder /app/frontend/dist ./static

# Train the ML model at build time to bake the model.pkl into the image
RUN python train_model.py

# Expose port 5000
EXPOSE 5000

# Set environment variables
ENV FLASK_APP=app.py
ENV PORT=5000

# Run gunicorn
CMD ["gunicorn", "--bind", "0.0.0.0:5000", "app:app"]
