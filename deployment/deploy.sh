#!/bin/bash
# CivicLens AI - Google Cloud Run deployment script

PROJECT_ID=$1
REGION=${2:-"us-central1"}

if [ -z "$PROJECT_ID" ]; then
    echo "Usage: ./deploy.sh <GCP_PROJECT_ID> [REGION]"
    exit 1
fi

echo "=========================================================="
echo "🚀 Deploying CivicLens AI to Google Cloud Run"
echo "=========================================================="
echo "Project ID: $PROJECT_ID"
echo "Region: $REGION"

# Configure gcloud
gcloud config set project $PROJECT_ID

# Enable GCP Services
echo "Step 1: Enabling necessary APIs..."
gcloud services enable \
  run.googleapis.com \
  sqladmin.googleapis.com \
  storage.googleapis.com \
  cloudbuild.googleapis.com \
  artifactregistry.googleapis.com \
  secretmanager.googleapis.com

# Create Artifact Registry Repository if not exists
echo "Step 2: Configuring Artifact Registry..."
gcloud artifacts repositories create civiclens-repo \
    --repository-format=docker \
    --location=$REGION \
    --description="Docker repository for CivicLens AI" 2>/dev/null || true

# Build and Push Backend Image
echo "Step 3: Building and pushing backend Docker image..."
gcloud builds submit --tag gcr.io/$PROJECT_ID/civiclens-backend:latest ./backend

# Build and Push Frontend Image
echo "Step 4: Building and pushing frontend Docker image..."
gcloud builds submit --tag gcr.io/$PROJECT_ID/civiclens-frontend:latest ./frontend

# Deploy Backend to Cloud Run
echo "Step 5: Deploying Backend to Cloud Run..."
gcloud run deploy civiclens-backend \
    --image=gcr.io/$PROJECT_ID/civiclens-backend:latest \
    --region=$REGION \
    --platform=managed \
    --allow-unauthenticated \
    --port=8000 \
    --set-env-vars="DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/community_hero,APP_ENV=production"

# Get backend URL
BACKEND_URL=$(gcloud run services describe civiclens-backend --region=$REGION --format="value(status.url)")
echo "Backend URL: $BACKEND_URL"

# Deploy Frontend to Cloud Run with Backend URL
echo "Step 6: Deploying Frontend to Cloud Run..."
gcloud run deploy civiclens-frontend \
    --image=gcr.io/$PROJECT_ID/civiclens-frontend:latest \
    --region=$REGION \
    --platform=managed \
    --allow-unauthenticated \
    --port=3000 \
    --set-env-vars="NEXT_PUBLIC_API_URL=$BACKEND_URL/api/v1"

FRONTEND_URL=$(gcloud run services describe civiclens-frontend --region=$REGION --format="value(status.url)")

echo "=========================================================="
echo "🎉 Deployment Completed Successfully!"
echo "=========================================================="
echo "Frontend URL: $FRONTEND_URL"
echo "Backend URL: $BACKEND_URL"
echo "=========================================================="
