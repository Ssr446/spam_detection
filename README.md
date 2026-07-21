# SpamGuard AI - Spam Detection System

**Live Demo:** [https://spam-detection-1dzb.onrender.com/](https://spam-detection-1dzb.onrender.com/)

A multi-platform Spam Detection System with an ML backend (Flask, Scikit-learn, NLTK) and a modern, beautiful frontend (React, Vite). It classifies messages as 'spam' or 'ham' across SMS, Email, and Call Transcripts.

## About This Project
SpamGuard AI is a full-stack application designed to showcase modern machine learning integration within a React architecture. 
Unlike static ML models, SpamGuard features **Immediate Incremental Learning**. When users correct a misclassification via the UI, the feedback is instantly committed to a SQLite database. The Flask backend immediately extracts this new data, merges it with the original dataset, and dynamically rebuilds the Scikit-Learn `TfidfVectorizer` and `LogisticRegression` pipeline in milliseconds. This allows the model to learn and adapt to edge cases in real-time.

The frontend is built with React and Vite, featuring a sleek, responsive glassmorphism UI with dynamic loading states, visual data charts, and a real-time history feed of past classifications.

## Features
- **TF-IDF + Logistic Regression Classifier**: Fast, lightweight, and capable of outputting confidence probabilities.
- **Flask REST API**: Handles classification, feedback collection, and history/stats aggregation.
- **React UI**: A sleek glassmorphism-inspired SPA for interacting with the API.
- **Model Baked into Image**: The ML model is trained during the Docker build process, ensuring fast startup times on free hosting platforms without downloading large models at runtime.

---

## Deployment Instructions

### A. Single Deploy (Render / Hugging Face Spaces)
*Deploys the Flask API and the React frontend together using the Dockerfile.*

**Deploying on Render (Free Tier)**
1. Fork or push this repository to your GitHub account.
2. Go to [Render Dashboard](https://dashboard.render.com/) and click **New > Web Service**.
3. Select your repository.
4. Render will automatically detect the `render.yaml` file (or select "Docker" as the environment).
5. Click **Create Web Service**. 
6. Render will build the Docker image (training the model and building React in the process) and deploy it.

**Deploying on Hugging Face Spaces (Free Tier)**
1. Go to [Hugging Face Spaces](https://huggingface.co/spaces) and click **Create new Space**.
2. Set the Space name and choose **Docker** as the Space SDK.
3. Choose **Blank** template.
4. Clone the space repository locally, copy the contents of this project into it, and push to HF.
5. Hugging Face will build the Docker image and expose port 5000 automatically.

---

### B. Split Deploy (API on Render/HF, Frontend on Vercel/Netlify)
*Deploys the backend and frontend separately for better edge delivery of the SPA.*

**1. Deploy the API (Backend)**
Follow the "Single Deploy" steps above to deploy the Docker container to Render or Hugging Face. Once deployed, copy the backend URL (e.g., `https://spam-api.onrender.com`).

**2. Deploy the Frontend (Vercel/Netlify)**
1. Fork or push this repository to GitHub.
2. Go to [Vercel](https://vercel.com/) or [Netlify](https://www.netlify.com/).
3. Create a new site from your repository, and set the **Root Directory** to `frontend`.
4. Add an Environment Variable:
   - Key: `VITE_API_URL`
   - Value: `https://your-backend-url.com` (from step 1).
5. Build Command: `npm run build`
   Publish Directory: `dist`
6. Click **Deploy**. The `vercel.json` and `netlify.toml` files will handle SPA routing automatically.
