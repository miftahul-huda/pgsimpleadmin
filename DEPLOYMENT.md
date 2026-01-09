# Cloud Run Deployment

## Service Information

- **Service Name**: pgsimpleadmin
- **Project**: telkomsel-retail-intelligence
- **Region**: asia-southeast2
- **Service URL**: https://pgsimpleadmin-6hzeuxd5qa-et.a.run.app
- **Current Revision**: pgsimpleadmin-00006-hkq

## Environment Variables

The following environment variables are configured in Cloud Run:

- `DB_HOST`: 34.50.82.149
- `DB_USER`: nodeuser
- `DB_PASSWORD`: rotikeju98
- `DB_NAME`: pgsimpleadmin
- `DB_PORT`: 5432
- `JWT_SECRET`: supersecretkey_change_me_in_prod

## Configuration

- **Memory**: 512Mi
- **CPU**: 1
- **Timeout**: 300 seconds
- **Max Instances**: 10
- **Min Instances**: 0
- **Authentication**: Allow unauthenticated

## Deployment

To deploy updates, run:

```bash
./deploy.sh
```

Or manually:

```bash
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
```

## Verification

✅ Service is running and accessible:
- Ping endpoint: `curl https://pgsimpleadmin-6hzeuxd5qa-et.a.run.app/api/ping`
- Login works with admin/admin123
- All database connections preserved

## Admin Access

- **Username**: admin
- **Password**: admin123
- **Login URL**: https://pgsimpleadmin-6hzeuxd5qa-et.a.run.app
