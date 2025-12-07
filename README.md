# PGSimple Admin

A lightweight, web-based database administration tool designed for simplicity and ease of use. Manage your PostgreSQL, MySQL, and SQL Server databases with a clean, modern interface.

## Features

-   **Multi-Database Support**: Connect to and manage PostgreSQL, MySQL, and Microsoft SQL Server databases.
-   **Connection Management**: Easily save, edit, and switch between multiple database connections.
-   **Data Explorer**: Browse tables, view data grid, and paginate through records.
-   **Query Tool**:
    -   Powerful SQL editor with syntax highlighting (CodeMirror).
    -   Execute raw SQL queries.
    -   Save queries for future use and organize them into folders.
    -   **Export Results**: Download query results as CSV or Excel (.xlsx) files.
-   **Data Import**: Import data from CSV or Excel files directly into your tables with a smart mapping interface.
-   **Modern UI**: Built with React and Lucide icons for a clean user experience.

## Tech Stack

-   **Frontend**: React, Vite, React Router, Lucide React, CodeMirror within UIW.
-   **Backend**: Node.js, Express, Sequelize (ORM), Multer (uploads).
-   **Database Drivers**: `pg`, `mysql2`, `mssql`, `sqlite3`.
-   **Utilities**: `xlsx` (sheet processing), `csv-parser`.

## Getting Started

### Prerequisites

-   Node.js (v18 or higher recommended)
-   npm

### Installation

1.  Clone the repository:
    ```bash
    git clone https://github.com/miftahul-huda/pgsimpleadmin.git
    cd pgsimpleadmin
    ```

2.  Install dependencies for both client and server:
    ```bash
    npm run install:all
    ```

    *This custom script installs dependencies in the root, `client/`, and `server/` directories.*

### Running the Application

Start both the backend server and the frontend client concurrently:

```bash
npm start
```

-   **Frontend**: http://localhost:5173
-   **Backend**: http://localhost:3000

## License

ISC
