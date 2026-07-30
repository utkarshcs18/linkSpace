# linkSpace (STAMP) - Secure Chat App

An end-to-end encrypted, privacy-first chat application featuring a brutalist-themed aesthetic interface.

## Architecture: Monolithic Server

This project uses a **Monolithic Architecture** powered by a single Express.js server (`index.js`) at the root. This server is responsible for both rendering the frontend user interface and handling the backend API routing.

### Directory Structure
- **`index.js`**: The unified Express server (handles both `/` for UI and `/api/*` for the backend).
- **`views/`**: Frontend EJS templates (UI components).
- **`public/`**: Frontend static assets (Vanilla CSS in `styles.css`, Vanilla JS in `script.js`).
- **`config/`, `controllers/`, `middleware/`, `models/`, `routes/`**: Backend business logic and MVC architecture.
- **`prisma/`**: Database schema and ORM setup.
- **`.env`**: Global environment variables for the entire app.

### How to Run
Since everything is consolidated, you only need to start one server:

```bash
npm start
# OR
node index.js
```
The server will run on `http://localhost:3000`.
- Open `http://localhost:3000` in your browser to see the Frontend UI.
- Access `http://localhost:3000/api/status` to hit the Backend API.

## Aesthetic & Design
The frontend uses an **interactive brutalism** design.
- **Typography:** Archivo Black (Headers), IBM Plex Mono (Body).
- **Colors:** Deep Black (`#0A0A0A`), Off-White (`#F5F5F0`), Safety-Vest Orange (`#FF4D00`).
- **Styling:** Zero border radius, thick solid black borders, and hard offset shadows. Faint `linkSpace` watermark in the background.

## Future Development
- Implement E2E encryption using Signal Protocol or MLS in the backend.
- Connect Socket.IO for real-time messaging between frontend clients.
- Establish Prisma connection for storing user identity keys and offline messages.
