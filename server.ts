import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { Server as SocketIOServer } from "socket.io";
import http from "http";

// Types
interface Task {
  id: string;
  title: string;
  description: string;
  status: 'Pending' | 'In Progress' | 'Completed';
  due_date: string;
  created_at: string;
  owner: string;
  sharedWith: string[];
  attachments?: {name: string; type: string; data: string}[];
}

interface Notification {
  id: string;
  userId: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

// In-Memory Database Simulation
let tasks: Task[] = [];
let notifications: Notification[] = [];
let users: { id: string; username: string }[] = []; // In-memory users for sharing validation

async function startServer() {
  const app = express();
  const server = http.createServer(app);
  const io = new SocketIOServer(server, { cors: { origin: "*" } });
  
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' })); // Increased limit for attachments

  // Socket setup
  io.on('connection', (socket) => {
    socket.on('register', (userId) => {
      socket.join(`user_${userId}`);
    });
  });

  // Simple auth middleware simulation
  const getUserId = (req: any) => {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return null;
    try {
      const decoded = JSON.parse(Buffer.from(token, 'base64').toString());
      return decoded.id || "1";
    } catch(e) {
      return null;
    }
  };

  // Week 1 & 4 & 5: API Endpoints
  // GET /api/tasks: Fetch all tasks
  app.get("/api/tasks", (req, res) => {
    const userId = getUserId(req) || "1";
    const { search, status } = req.query;
    
    // Only fetch owned tasks or explicitly shared
    let filteredTasks = tasks.filter(t => t.owner === userId);

    if (search) {
      const q = (search as string).toLowerCase();
      filteredTasks = filteredTasks.filter(t => 
        t.title.toLowerCase().includes(q) || 
        t.description.toLowerCase().includes(q)
      );
    }
    
    if (status && status !== 'All') {
      filteredTasks = filteredTasks.filter(t => t.status === status);
    }

    filteredTasks.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    res.json(filteredTasks);
  });

  // GET /api/tasks/shared
  app.get("/api/tasks/shared", (req, res) => {
    const userId = getUserId(req) || "1";
    const sharedTasks = tasks.filter(t => t.sharedWith.includes(userId));
    res.json(sharedTasks);
  });

  // GET /api/tasks/:id: Fetch a single task by ID
  app.get("/api/tasks/:id", (req, res) => {
    const userId = getUserId(req) || "1";
    const task = tasks.find(t => t.id === req.params.id);
    if (!task) {
      return res.status(404).json({ error: "Task not found" });
    }
    if (task.owner !== userId && !task.sharedWith.includes(userId)) {
      return res.status(403).json({ error: "Forbidden" });
    }
    res.json(task);
  });

  // POST /api/tasks: Add a new task
  app.post("/api/tasks", (req, res) => {
    const userId = getUserId(req) || "1";
    const { title, description, status, due_date, attachments } = req.body;
    
    if (!title || !description || !status) {
      return res.status(400).json({ error: "Title, description, and status are required." });
    }

    const newTask: Task = {
      id: Date.now().toString(),
      title,
      description,
      status,
      due_date: due_date || "",
      created_at: new Date().toISOString(),
      owner: userId,
      sharedWith: [],
      attachments: attachments || []
    };

    tasks.push(newTask);
    res.status(201).json(newTask);
  });

  // PUT /api/tasks/:id: Update a task
  app.put("/api/tasks/:id", (req, res) => {
    const userId = getUserId(req) || "1";
    const { title, description, status, due_date, attachments } = req.body;
    const taskIndex = tasks.findIndex(t => t.id === req.params.id);
    
    if (taskIndex === -1) {
      return res.status(404).json({ error: "Task not found" });
    }

    const task = tasks[taskIndex];
    if (task.owner !== userId && !task.sharedWith.includes(userId)) {
      return res.status(403).json({ error: "Forbidden" });
    }

    if (!title || !description || !status) {
      return res.status(400).json({ error: "Title, description, and status are required." });
    }

    const oldStatus = task.status;
    
    tasks[taskIndex] = {
      ...task,
      title,
      description,
      status,
      due_date: due_date || task.due_date,
      attachments: attachments || task.attachments
    };

    // Week 4: Status update notification for shared tasks
    if (oldStatus !== status) {
      const notifyUsers = task.owner === userId ? task.sharedWith : [task.owner, ...task.sharedWith.filter(u => u !== userId)];
      notifyUsers.forEach(uId => {
        const notif: Notification = {
          id: Date.now().toString() + Math.random(),
          userId: uId,
          message: `Task "${title}" status updated to ${status}.`,
          isRead: false,
          createdAt: new Date().toISOString()
        };
        notifications.push(notif);
        io.to(`user_${uId}`).emit('notification', notif);
      });
    }

    res.json(tasks[taskIndex]);
  });

  // PUT /api/tasks/:id/share: Share tasks with other users
  app.put("/api/tasks/:id/share", (req, res) => {
    const userId = getUserId(req) || "1";
    const { username } = req.body;
    const taskIndex = tasks.findIndex(t => t.id === req.params.id);
    
    if (taskIndex === -1) return res.status(404).json({ error: "Task not found" });
    if (tasks[taskIndex].owner !== userId) return res.status(403).json({ error: "Only owner can share" });

    const targetUser = users.find(u => u.username === username);
    if (!targetUser) return res.status(404).json({ error: "User not found" });
    if (targetUser.id === userId) return res.status(400).json({ error: "Cannot share with yourself" });
    
    if (!tasks[taskIndex].sharedWith.includes(targetUser.id)) {
      tasks[taskIndex].sharedWith.push(targetUser.id);
      
      const notif: Notification = {
        id: Date.now().toString(),
        userId: targetUser.id,
        message: `Task "${tasks[taskIndex].title}" was shared with you.`,
        isRead: false,
        createdAt: new Date().toISOString()
      };
      notifications.push(notif);
      io.to(`user_${targetUser.id}`).emit('notification', notif);
    }
    
    res.json(tasks[taskIndex]);
  });

  // DELETE /api/tasks/:id: Delete a task
  app.delete("/api/tasks/:id", (req, res) => {
    const userId = getUserId(req) || "1";
    const taskIndex = tasks.findIndex(t => t.id === req.params.id);
    if (taskIndex === -1) return res.status(404).json({ error: "Task not found" });
    if (tasks[taskIndex].owner !== userId) return res.status(403).json({ error: "Forbidden" });

    tasks.splice(taskIndex, 1);
    res.status(204).send();
  });

  // GET /api/notifications
  app.get("/api/notifications", (req, res) => {
    const userId = getUserId(req) || "1";
    res.json(notifications.filter(n => n.userId === userId).sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
  });

  app.put("/api/notifications/:id/read", (req, res) => {
    const userId = getUserId(req) || "1";
    const notif = notifications.find(n => n.id === req.params.id && n.userId === userId);
    if (notif) notif.isRead = true;
    res.json({ success: true });
  });

  // GET /api/analytics/overview
  app.get("/api/analytics/overview", (req, res) => {
    const userId = getUserId(req) || "1";
    const userTasks = tasks.filter(t => t.owner === userId || t.sharedWith.includes(userId));
    res.json({
      total: userTasks.length,
      completed: userTasks.filter(t => t.status === "Completed").length,
      pending: userTasks.filter(t => t.status === "Pending").length,
      inProgress: userTasks.filter(t => t.status === "In Progress").length
    });
  });

  // GET /api/analytics/trends
  app.get("/api/analytics/trends", (req, res) => {
    const userId = getUserId(req) || "1";
    const userTasks = tasks.filter(t => t.owner === userId || t.sharedWith.includes(userId));
    
    const trends: Record<string, { completed: number, pending: number }> = {};
    userTasks.forEach(t => {
      const date = t.created_at.split('T')[0];
      if (!trends[date]) trends[date] = { completed: 0, pending: 0 };
      if (t.status === 'Completed') trends[date].completed++;
      else trends[date].pending++;
    });

    const result = Object.entries(trends).map(([date, data]) => ({ date, ...data }));
    res.json(result);
  });

  // Week 3: Authentication
  app.post("/api/auth/login", (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: "Email and password required" });
    
    let user = users.find(u => u.username === email);
    if (!user) {
      user = { id: Date.now().toString(), username: email };
      users.push(user);
    }
    
    const mockJwt = Buffer.from(JSON.stringify({ id: user.id, email })).toString("base64");
    res.json({ token: mockJwt, user });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
