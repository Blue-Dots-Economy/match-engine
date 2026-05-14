# DPG Agent Interface

API gateway for external agents to interact with DPG (Distributed Personal Graph).

## Quick Start

```bash
# Install dependencies
pnpm install

# Start with Docker (app + PostgreSQL)
docker compose up --build -d

# Or start locally with PostgreSQL via Docker
docker compose up -d postgres
pnpm dev
```

Server runs at `http://localhost:3001`

## Running with Docker

Build and start all services (app + PostgreSQL):

```bash
docker compose up --build -d
```

Stop all services:

```bash
docker compose down
```

Stop and remove volumes (clean slate):

```bash
docker compose down -v
```

View logs:

```bash
docker compose logs -f dpg-agent-interface
```

Server runs at `http://localhost:3001`
Swagger docs at `http://localhost:3001/docs`

## Environment Variables

Create a `.env` file in the project root (copy from `.env.example`):

```bash
cp .env.example .env
```

Configure the following variables:

```env
# PostgreSQL
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=agent_interface
POSTGRES_PORT=5433

# DPG Database (separate)
DPG_DATABASE_URL=postgresql://user:password@host:port/dbname

# DPG Instance
DPG_INSTANCE_URL=https://ubi-backend.onest.dhiway.net
SCHEMA_BASE_URL=https://raw.githubusercontent.com/dhiway/dpg-monorepo/refs/heads/main/examples/schemas

# App
APP_PORT=3001
```

**Note:** The `docker-compose.yaml` uses `env_file: .env`. Ensure a `.env` file exists before running `docker compose up`.

## API Endpoints

### Authentication
- `POST /auth/register` - Register agent
- `POST /auth/login` - Login, get API key

### User
- `POST /api/v1/user/upsert` - Create or update user

### Items
- `POST /api/v1/item/create` - Create item in DPG
- `POST /api/v1/item/fetch` - Fetch items by phone
- `PATCH /api/v1/item/:itemId` - Update item

### Network (Public)
- `POST /api/v1/network/item/fetch-all` - Fetch all items across the DPG network (aggregated from all instances)

### Actions
- `POST /api/v1/action/create` - Perform action between items
- `POST /api/v1/action/fetch` - Fetch actions by phone

### Events
- `POST /api/v1/event/store` - Store action event
- `POST /api/v1/event/fetch` - Fetch events by phone

## Documentation

Visit `http://localhost:3001/docs` for Swagger UI with all endpoints and schemas.

## Scripts

```bash
pnpm dev          # Start development server
pnpm build        # Build for production
pnpm typecheck    # Run TypeScript checks
```