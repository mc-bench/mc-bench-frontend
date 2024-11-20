# MC-Bench

MC-Bench is a benchmarking platform for evaluating and comparing model performance.

## Project Structure

- `mc-bench-backend/`: Python backend services including API and workers
- `mc-bench-frontend/`: React+TypeScript frontend application

## Prerequisites

- Python 3.12.7
- Bun
- Docker and Docker Compose
- Access to Github OAuth Client ID and Secret (see [Setting Up Oauth Pre-Reqs](docs/setup_oauth_prereqs.md).

## Quick Start

1. Clone both repositories:
```bash
# Clone backend
git clone https://github.com/mc-bench/mc-bench-backend.git
cd mc-bench-backend

# Clone frontend
git clone https://github.com/mc-bench/mc-bench-frontend.git
```

2. Set up the backend:
```bash
cd mc-bench-backend
# Create and activate a Python virtual environment (see backend README for options)
cp .env.template .env
pip install -e .[dev,api,worker]
```
Be sure to copy over the Github Client ID and Client Secret from the pre-requisites into your new .env file


3. Set up the frontend:
```bash
cd mc-bench-frontend
cp .env.template .env
bun install
```
Be sure to copy over the Github Client ID from the pre-requisites into your new .env file

4. Start the services:
```bash
cd mc-bench-backend
docker-compose up -d
```

This will start:
- PostgreSQL database
- Redis for message queuing
- MinIO for object storage
- API services
- Worker services

5. Start the frontend development server:
```bash
cd mc-bench-frontend
source .env-local
bun run dev
```

The application will be available at:
- Frontend: http://localhost:5173
- Main API: http://localhost:8000
- Admin API: http://localhost:8001
