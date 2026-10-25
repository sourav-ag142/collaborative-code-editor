# Collaborative Code Editor

A real-time collaborative code editor built for coding practice and mock interviews. Multiple users can join a room and work on the same code together, making it useful for interview practice, pair programming, and discussing coding problems.

**Live Demo:** https://collaborative-code-editor-ska-c128.vercel.app/

## What does this project do?

The idea behind this project was to build a coding environment where two people can work on the same code without having to share their screen.

Users can join an interview room, write code in the editor, and collaborate in real time. I also added a code execution feature so users can run their code and view the output directly in the editor.

## Features

- **Real-time collaboration:** Changes made in the editor are synchronized between users using Socket.IO.
- **Code editor:** Integrated Monaco Editor, the editor that powers VS Code.
- **Code execution:** Run code in supported languages, including C++, JavaScript, and Python, and view the output.
- **Interview rooms:** Users can join rooms using a room code.
- **Authentication and access control:** JWT-based cookie authentication and room access control.
- **Feedback:** Includes a feedback feature for interview sessions.
- **Deployed application:** Frontend hosted on Vercel and backend hosted on Render.

## Tech Stack

**Frontend**
- React
- Monaco Editor
- JavaScript
- CSS

**Backend**
- Node.js
- Express.js
- Socket.IO
- JWT and cookie-based authentication

**Code Execution**
- OnlineCompiler API

**Deployment**
- Vercel (frontend)
- Render (backend)

## How it works

1. A user opens the website and joins an interview room.
2. The frontend connects to the backend using Socket.IO.
3. When a user edits the code, the changes are shared with other users in the same room.
4. When the user clicks the Run Code button, the code is sent to the backend.
5. The backend forwards the code to the OnlineCompiler API and returns the execution result.
6. The result is displayed in the output panel.

## Running the project locally

### Prerequisites

Make sure you have Node.js and npm installed on your system.

### 1. Clone the repository

```bash
git clone https://github.com/sourav-ag142/collaborative-code-editor.git
cd collaborative-code-editor
```

### 2. Install backend dependencies

From the root directory, run:

```bash
npm install
```

### 3. Configure environment variables

Create a `.env` file inside the `backend` folder:

```env
CODE_API_KEY=your_api_key_here
```

Replace `your_api_key_here` with your own valid OnlineCompiler API key. Keep this file private and never commit it to GitHub.

### 4. Start the backend

From the root directory, run:

```bash
npm start
```

The backend should start on port `5001` locally, unless another port is configured.

### 5. Start the frontend

Open a new terminal and run:

```bash
cd frontend/vite-project
npm install
npm run dev
```

Open the local URL shown in the terminal, usually:

http://localhost:5173

For local development, make sure the frontend's API and Socket.IO URLs point to your local backend.

## Environment Variables

| Variable | Purpose |
|---|---|
| `CODE_API_KEY` | API key used by the backend for code execution |
| `CLIENT_URL` | Frontend URL allowed by the backend |
| `VITE_API_URL` | Backend URL used by the frontend for API requests |
| `VITE_SOCKET_URL` | Backend URL used for the Socket.IO connection |

The `VITE_` variables are frontend configuration values, so they should not contain private API keys.

## What I learned

While building this project, I got practical experience with real-time communication using Socket.IO, connecting a React frontend to a Node.js backend, integrating an external code execution API, managing room-based collaboration, and deploying a full-stack application.

I also learned how frontend and backend configuration differs between local development and production deployment.

## Future Improvements

- Improve the editor layout for mobile devices.
- Add more interview room features.
- Improve error handling for code execution.
- Add more options for interview feedback and session management.

## Live Project

Try it here: https://collaborative-code-editor-ska-c128.vercel.app/
