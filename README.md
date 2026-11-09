# HaulHub transport portal

The portal uses MySQL for company, driver, truck, and booking records. Demo records are inserted by `database/schema.sql`.

## Setup

1. Install Node.js and MySQL Server.
2. In this folder, install the Node.js packages:

   ```powershell
   npm.cmd install
   ```

3. Copy `.env.example` to `.env` and set your MySQL host, user, password, and database settings.
4. Create the database, tables, and demo records:

   ```powershell
   npm.cmd run db:init
   ```

   The MySQL user needs permission to create the `haulhub` database and its tables.
5. Start the portal and open `http://localhost:3000`:

   ```powershell
   npm.cmd start
   ```

Do not open `index.html` directly from the file system; the portal loads its data from the local API server. Database credentials belong in `.env`, which is excluded from Git.

## Database tables

- `companies`: company accounts and contact information.
- `drivers`: driver profiles and license numbers.
- `trucks`: truck/plate numbers, capacity, location, availability, and assigned driver.
- `bookings`: company load requests, route, weight, optional truck assignment, and status.

The API currently provides read endpoints for dashboard, trucks, drivers, companies, and bookings, plus `POST /api/bookings` to save a booking.

The map drawing is illustrative; real GPS coordinates and live tracking hardware are not connected in this demo.

No third-party API key is needed for the local MySQL database or this demo server. Map tiles, route calculations, SMS/OTP, and GPS tracking are separate optional integrations. Keep any provider keys in server-side environment variables and follow each provider's free-tier limits and usage policies.
