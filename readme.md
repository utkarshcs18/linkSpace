# linkSpace (STAMP) - Secure Chat App

An end-to-end encrypted, privacy-first chat application featuring a brutalist-themed aesthetic interface.

## Architecture

The project has been split into two entirely independent directories with zero overlapping code to ensure strict separation of concerns.

### 1. `/frontend`
Holds all client-side code, user interface, and static assets.
- **`index.js`**: The Express server that runs the frontend UI.
- **`views/`**: EJS templates (e.g., the 8 interactive STAMP UI effects).
- **`public/`**: Vanilla CSS (`styles.css`) and Vanilla JS (`script.js`) handling UI animations and aesthetics.

**To run the frontend:**
```bash
cd frontend
node index.js # Runs on http://localhost:3000
```

### 2. `/backend`
Holds all server-side architecture, APIs, authentication, real-time WebSockets, and database interactions.
- **`index.js`**: The Express API entry point.
- **`config/`, `controllers/`, `middleware/`, `models/`, `routes/`**: Standard MVC layout for backend business logic.
- **`prisma/`**: Database schema and ORM setup.
- **`.env`**: Database URIs and JWT secrets.

**To run the backend:**
```bash
cd backend
node index.js # Runs on http://localhost:5000
```

## Aesthetic & Design
The frontend uses an **interactive brutalism** design.
- **Typography:** Archivo Black (Headers), IBM Plex Mono (Body).
- **Colors:** Deep Black (`#0A0A0A`), Off-White (`#F5F5F0`), Safety-Vest Orange (`#FF4D00`).
- **Styling:** Zero border radius, thick solid black borders, and hard offset shadows. Faint `linkSpace` watermark in the background.

## Future Development
- Implement E2E encryption using Signal Protocol or MLS in the backend.
- Connect Socket.IO for real-time messaging between frontend clients.
- Establish Prisma connection for storing user identity keys and offline messages.
