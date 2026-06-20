# TaskFlow - Collaborative Task Management System

TaskFlow is a modern, full-stack collaborative task management application built with React, Vite, Express, and Socket.IO. It empowers users to create, manage, and share tasks while providing real-time notifications and detailed analytics.

## Features

- **Task Management**: Create, read, update, and delete tasks with statuses (Pending, In Progress, Completed) and due dates.
- **Collaboration**: Share tasks with other users seamlessly.
- **Real-Time Notifications**: Get notified instantly via Socket.IO when a task is shared with you or its status changes.
- **Advanced Analytics**: Interactive dashboard with Recharts showing weekly trends, completion rates, and status distributions.
- **Attachments Support**: Attach files and images to tasks (base64 encoded).
- **Dark Mode**: Fully implemented dark mode with persistent user preferences.
- **Responsive UI**: Tailwind CSS styled single-page application that works beautifully across mobile and desktop devices.
- **Authentication**: JWT-based mock authentication for prototype scope.

## Setup Instructions

### Prerequisites
- Node.js (v18+)
- npm or yarn

### Installation
1. Clone the repository.
   ```bash
   git clone <repository-url>
   cd taskflow
   ```
2. Install dependencies.
   ```bash
   npm install
   ```
3. Start the application in development mode (spins up both Express backend and Vite frontend).
   ```bash
   npm run dev
   ```
4. Access the application at `http://localhost:3000`.

### Production Build
1. Build the application (compiles frontend via Vite and backend via esbuild to `dist/`).
   ```bash
   npm run build
   ```
2. Start the production server.
   ```bash
   npm run start
   ```

## API Documentation

### Authentication
- `POST /api/auth/login`
  - Body: `{ "email": "user@demo.com", "password": "password" }`
  - Returns: `{ "token": "base64_jwt", "user": { "id": "uuid", "username": "email" } }`

### Tasks
- `GET /api/tasks` (Supports query params: `search`, `status`)
  - Description: Fetch all tasks owned by the authenticated user.
- `GET /api/tasks/shared`
  - Description: Fetch all tasks shared with the authenticated user.
- `GET /api/tasks/:id`
  - Description: Fetch a single task by ID.
- `POST /api/tasks`
  - Body: `{ "title": "...", "description": "...", "status": "Pending", "due_date": "YYYY-MM-DD", "attachments": [] }`
- `PUT /api/tasks/:id`
  - Body: Updates task fields.
- `DELETE /api/tasks/:id`
  - Description: Deletes a task.

### Collaboration & Notifications
- `PUT /api/tasks/:id/share`
  - Body: `{ "username": "target_user_email" }`
  - Description: Shares a task with another user and triggers a real-time notification.
- `GET /api/notifications`
  - Description: Gets all notifications for the authenticated user.
- `PUT /api/notifications/:id/read`
  - Description: Marks a notification as read.

### Analytics
- `GET /api/analytics/overview`
  - Returns KPI data: `{ "total": 10, "completed": 5, "pending": 3, "inProgress": 2 }`
- `GET /api/analytics/trends`
  - Returns trend array: `[{ "date": "2023-10-01", "completed": 2, "pending": 1 }]`

## Database Structure (In-Memory Prototype)
- `Task`: `id`, `owner`, `title`, `description`, `status`, `due_date`, `created_at`, `sharedWith[]`, `attachments[]`
- `Notification`: `id`, `userId`, `message`, `isRead`, `createdAt`
- `User`: `id`, `username`
