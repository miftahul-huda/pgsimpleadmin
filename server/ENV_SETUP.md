# Environment Setup

## Initial Setup

1. Copy the `.env.example` file to create your local `.env` file:

```bash
cd server
cp .env.example .env
```

2. Edit the `.env` file with your actual database credentials:

```bash
# Database Configuration
DB_HOST=your_database_host
DB_USER=your_database_user
DB_PASSWORD=your_database_password
DB_NAME=your_database_name
DB_PORT=5432

# JWT Secret (IMPORTANT: Change this in production!)
JWT_SECRET=your_secret_key_here

# Server Port
PORT=3001
```

3. Install dependencies:

```bash
npm install
```

4. Start the server:

```bash
node index.js
```

## Environment Variables

- `DB_HOST`: PostgreSQL database host
- `DB_USER`: PostgreSQL database username
- `DB_PASSWORD`: PostgreSQL database password
- `DB_NAME`: PostgreSQL database name
- `DB_PORT`: PostgreSQL database port (default: 5432)
- `JWT_SECRET`: Secret key for JWT token signing
- `PORT`: Server port (default: 3001)

## Security Notes

⚠️ **IMPORTANT**: Never commit the `.env` file to version control. It contains sensitive credentials.

The `.env` file is already included in `.gitignore` to prevent accidental commits.
