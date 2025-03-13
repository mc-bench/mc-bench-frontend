# Getting Started

This will guide you through getting the front end of MC-bench up and running

## Prerequisites
- [git](https://git-scm.com/downloads)
- [bun](https://bun.sh/)

# Quick Start

_it is recommended to complete [backend setup ](https://github.com/mc-bench/mc-bench-backend/blob/main/docs/getting-started/docker-guide.md)first_

## 0. Clone front end repository

```bash
git clone https://github.com/mc-bench/mc-bench-frontend.git
```

## 1. Setup secrets
Copy the `.env` template
```bash
cp .env.template .env
```
Populate the `.env` with the values


## 2. Setup Github auth app
Instructions [here](docs/setup_oauth_prereqs.md)

Once you have completed that setup, update the values in the `.env`
```bash
export VITE_GITHUB_CLIENT_ID="your_client_id"
```

Make sure to copy over the Github Client ID from the pre-requisites into your new .env file

## 3. Build frontend
Install the dependecies with `bun`
```bash
bun install
```
## 4. Backend Services running
In a new shell nagivate to your `mc-bench-backend` folder
```bash
docker-compose up -d --build
```

## 5. Start the frontend development server:

```bash
source .env
bun run dev
```

The application will be available at:
- Frontend (this repo): http://localhost:5173
- Main API(backend): http://localhost:8000
- Admin API(backend): http://localhost:8001


## Common issues
[Debugging guide](docs/debugging-issues.md)
