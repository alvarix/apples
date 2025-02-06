# Backend – api/server.js
-	Framework & Libraries: Uses Fastify for the server, pg to interact with a PostgreSQL database, and dotenv to load environment variables.
-	Database Connection:
Establishes a connection to PostgreSQL using a connection string from environment variables.
-	Static File Serving:
Serves files from the public directory using Fastify’s static plugin.
-	API Endpoints:
-	GET /api/expenses: Fetches and returns all expense transactions from the database.
-	GET /api/balance: Calculates and returns the net balance between two payers (Adam and Eve) by summing transactions.
-	GET /api/debug-env: Exposes debugging information (specifically the database URL).
-	Fallback Routes:
Both the root route (/) and a custom 404 handler serve index.html to support a single-page application (SPA) setup.
-	Deployment Integration: Exports an async function to allow the server to be integrated as a Vercel serverless function.
#	Frontend – public/index.html
- UI & Interactivity:
A simple HTML page titled “Expense Tracker” that uses htmx to perform dynamic API requests:
-	A form to add new expenses (submits via hx-post to /api/add-expense).
-	An auto-updating list of expenses (fetched via hx-get from /api/expenses).
-	A balance display that refreshes every 5 seconds (using hx-get from /api/balance).
#	Other Configuration Files
- .gitignore:
Standard rules to exclude node modules, environment files, build outputs, logs, and temporary files.
-	nodemon.json:
Configured to watch api/server.js for changes and automatically restart the server during development.
-	package.json:
Specifies project dependencies (Fastify, pg, dotenv, etc.), scripts for starting the server (start and dev), and project metadata.
-	test-db.js:
A simple script to test database connectivity by attempting to connect to PostgreSQL.
-	vercel.json:
Defines deployment settings for Vercel, mapping API routes to the server file and serving static files from the public directory.
