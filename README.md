# DPG Agent Interface

API gateway for external agents to interact with DPG (Distributed Personal Graph).

## Quick Start

```bash
# Install dependencies
pnpm install

# Start PostgreSQL via Docker
docker compose up -d

# Start development server
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
docker compose logs -f app
```

Server runs at `http://localhost:3001`

## Environment Variables

Copy `.env.example` to `.env` and configure:

```env
# PostgreSQL
POSTGRES_HOST=localhost
POSTGRES_PORT=5433
POSTGRES_DB=agent_interface
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres

# DPG Database (separate)
DPG_DATABASE_URL=postgresql://user:password@host:port/dbname

# DPG Instance
DPG_INSTANCE_URL=http://localhost:2742
SCHEMA_BASE_URL=https://raw.githubusercontent.com/dhiway/dpg-monorepo/refs/heads/main/examples/schemas

# App
APP_HOST=0.0.0.0
APP_PORT=3001
NODE_ENV=development
```

## API Endpoints

### Authentication
- `POST /auth/register` - Register agent
- `POST /auth/login` - Login, get API key

### User
- `POST /api/v1/user/upsert` - Create or update user

### Items
- `POST /api/v1/item/create` - Create item in DPG
- `GET /api/v1/item/fetch` - Fetch items by phone
- `PATCH /api/v1/item/:itemId` - Update item

### Actions
- `POST /api/v1/action/create` - Perform action between items
- `GET /api/v1/action/fetch` - Fetch actions by phone

### Events
- `POST /api/v1/event/store` - Store action event
- `GET /api/v1/event/fetch` - Fetch events by phone

## Documentation

Visit `http://localhost:3001/docs` for Swagger UI with all endpoints and schemas.

## Scripts

```bash
pnpm dev          # Start development server
pnpm build        # Build for production
pnpm typecheck    # Run TypeScript checks
```