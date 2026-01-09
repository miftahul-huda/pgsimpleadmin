#!/bin/bash

# Deploy pgsimpleadmin to Google Cloud Run
# Project: telkomsel-retail-intelligence
# Service: pgsimpleadmin

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}Starting deployment to Cloud Run...${NC}"

# Set project
echo -e "${BLUE}Setting GCloud project...${NC}"
gcloud config set project telkomsel-retail-intelligence

# Build and deploy
echo -e "${BLUE}Deploying to Cloud Run...${NC}"
gcloud run deploy pgsimpleadmin \
  --source . \
  --region asia-southeast2 \
  --platform managed \
  --allow-unauthenticated \
  --set-env-vars="DB_HOST=34.50.82.149,DB_USER=nodeuser,DB_PASSWORD=rotikeju98,DB_NAME=pgsimpleadmin,DB_PORT=5432,JWT_SECRET=supersecretkey_change_me_in_prod" \
  --memory 512Mi \
  --cpu 1 \
  --timeout 300 \
  --max-instances 10 \
  --min-instances 0

echo -e "${GREEN}Deployment complete!${NC}"
echo -e "${BLUE}Getting service URL...${NC}"
gcloud run services describe pgsimpleadmin --region asia-southeast2 --format='value(status.url)'
