import { useState, useEffect } from "react";
import { PlusCircle, Search, LogOut, Bell, LayoutDashboard, Share2, Moon, Sun, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { io } from "socket.io-client";
import { Task, User, Notification } from "../types";
import { TaskForm } from "../components/TaskForm";
import { ShareTaskModal } from "../components/ShareTaskModal";
import { AnalyticsDashboard } from "../components/AnalyticsDashboard";
import { useTheme } from "../hooks/useTheme";

export function DashboardPage({ user, onLogout }: { user: User, onLogout: () => void }) {
  const { theme, toggleTheme } = useTheme();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [sharedTasks, setSharedTasks] = useState<Task[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | undefined>(undefined);
  const [sharingTask, setSharingTask] = useState<Task | null>(null);
  const [view, setView] = useState<'tasks' | 'shared' | 'analytics'>('tasks');
  
  // Notifications
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  const [toastMsg, setToastMsg] = useState("");

  const fetchTasks = async () => {
    try {
      const url = new URL('/api/tasks', window.location.origin);
      if (search) url.searchParams.append('search', search);
      if (statusFilter !== 'All') url.searchParams.append('status', statusFilter);
      
      const response = await fetch(url.toString(), {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('taskflow_token')}`
        }
      });
      const data = await response.json();
      setTasks(data);
    } catch (err) { console.error("Error fetching tasks", err); }
  };

  const fetchSharedTasks = async () => {
    try {
      const response = await fetch('/api/tasks/shared', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('taskflow_token')}` }
      });
      const data = await response.json();
      setSharedTasks(data);
    } catch (err) { console.error("Error fetching shared tasks", err); }
  };

  const fetchNotifications = async () => {
    try {
      const response = await fetch('/api/notifications', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('taskflow_token')}` }
      });
      const data = await response.json();
      setNotifications(data);
    } catch (err) { console.error("Error fetching notifications", err); }
  };

  useEffect(() => {
    if (view === 'tasks') fetchTasks();
    if (view === 'shared') fetchSharedTasks();
  }, [user.id, search, statusFilter, view]);

  useEffect(() => {
    fetchNotifications();
    const socket = io(window.location.origin);
    
    socket.emit('register', user.id);
    
    socket.on('notification', (newNotif: Notification) => {
      setNotifications(prev => [newNotif, ...prev]);
      setToastMsg(newNotif.message);
      setTimeout(() => setToastMsg(""), 4000);
      // Refresh tasks if needed
      if (view === 'tasks') fetchTasks();
      if (view === 'shared') fetchSharedTasks();
    });

    return () => {
      socket.disconnect();
    };
  }, [user.id, view]);

  const markNotificationRead = async (id: string) => {
    try {
      await fetch(`/api/notifications/${id}/read`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('taskflow_token')}` }
      });
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    } catch (err) {}
  };

  const handleDelete = async (id: string) => {
    try {
      await fetch(`/api/tasks/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('taskflow_token')}`
        }
      });
      fetchTasks();
    } catch (err) { console.error(err); }
  };

  const getProgress = () => {
    if (tasks.length === 0) return 0;
    const completed = tasks.filter(t => t.status === "Completed").length;
    return Math.round((completed / tasks.length) * 100);
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 pb-12 transition-colors">
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-30 shadow-sm relative transition-colors">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold text-xl shadow-md">
              ✓
            </div>
            <h1 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-white">TaskFlow</h1>
          </div>
          <div className="flex items-center gap-2 sm:gap-4 relative">
            <button 
              onClick={toggleTheme}
              className="text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 p-2 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-colors p-2 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 relative"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full"></span>}
              </button>
              
              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg z-50 overflow-hidden">
                  <div className="p-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-medium text-sm flex justify-between items-center">
                    Notifications
                    {unreadCount > 0 && <span className="text-xs bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-400 px-2 py-0.5 rounded-full">{unreadCount} new</span>}
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="p-4 text-center text-sm text-slate-500 dark:text-slate-400">No notifications</div>
                    ) : (
                      notifications.map(n => (
                        <div key={n.id} onClick={() => markNotificationRead(n.id)} className={`p-3 border-b border-slate-100 dark:border-slate-800 text-sm cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors ${!n.isRead ? 'bg-indigo-50/50 dark:bg-indigo-900/10' : ''}`}>
                          <p className={`text-slate-700 dark:text-slate-300 ${!n.isRead ? 'font-medium' : ''}`}>{n.message}</p>
                          <span className="text-xs text-slate-400 dark:text-slate-500 mt-1 block">{format(new Date(n.createdAt), 'MMM d, h:mm a')}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="hidden sm:block text-sm text-slate-500 dark:text-slate-400 ml-2 border-l border-slate-200 dark:border-slate-700 pl-4">
              Welcome, <span className="font-medium text-slate-900 dark:text-slate-200">{user.username}</span>
            </div>
            <button
              onClick={onLogout}
              className="text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-colors p-2 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 ml-1"
              title="Logout"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Global Toast */}
      {toastMsg && (
        <div className="fixed bottom-4 right-4 bg-slate-900 text-white px-4 py-3 rounded-lg shadow-xl z-50 flex items-center gap-3 animate-in slide-in-from-bottom-5">
          <AlertCircle className="w-5 h-5 text-indigo-400" />
          <span className="text-sm font-medium">{toastMsg}</span>
        </div>
      )}

      <main className="max-w-5xl mx-auto px-4 py-8">
        
        {/* Navigation Tabs */}
        <div className="flex gap-2 mb-8 bg-slate-100 dark:bg-slate-900 p-1 rounded-xl w-fit">
          <button 
            onClick={() => setView('tasks')}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${view === 'tasks' ? 'bg-white dark:bg-slate-800 shadow-sm text-slate-900 dark:text-slate-100' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'}`}
          >
            My Tasks
          </button>
          <button 
            onClick={() => setView('shared')}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all flex items-center gap-2 ${view === 'shared' ? 'bg-white dark:bg-slate-800 shadow-sm text-slate-900 dark:text-slate-100' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'}`}
          >
            Shared with me
          </button>
          <button 
            onClick={() => setView('analytics')}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all flex items-center gap-2 ${view === 'analytics' ? 'bg-white dark:bg-slate-800 shadow-sm text-indigo-600 dark:text-indigo-400' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'}`}
          >
            <LayoutDashboard className="w-4 h-4" /> Analytics
          </button>
        </div>

        {view === 'analytics' ? (
          <AnalyticsDashboard />
        ) : (
          <>
            {view === 'tasks' && (
              <section className="bg-white dark:bg-slate-900 transition-colors rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm mb-8 relative overflow-hidden">
                <div className="relative z-10 flex justify-between items-end mb-2">
                  <div>
                    <h2 className="text-lg font-medium text-slate-800 dark:text-slate-100">Your Progress</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Track your completed tasks</p>
                  </div>
                  <span className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{getProgress()}%</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-3 rounded-full overflow-hidden relative z-10">
                  <div 
                    className="bg-indigo-600 h-full transition-all duration-500 ease-out rounded-full"
                    style={{ width: `${getProgress()}%` }}
                  />
                </div>
              </section>
            )}

            {/* Controls Section */}
            <section className="flex flex-col sm:flex-row gap-4 justify-between items-center mb-6">
              <div className="flex-1 w-full max-w-md relative">
                <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search tasks..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all bg-white dark:bg-slate-900 shadow-sm dark:text-slate-100"
                />
              </div>
              <div className="flex gap-4 w-full sm:w-auto">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors bg-white dark:bg-slate-900 shadow-sm font-medium text-slate-700 dark:text-slate-200"
                >
                  <option value="All">All Status</option>
                  <option value="Pending">Pending</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Completed">Completed</option>
                </select>
                {view === 'tasks' && (
                  <button
                    onClick={() => {
                      setEditingTask(undefined);
                      setIsFormOpen(true);
                    }}
                    className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium shadow-sm transition-colors cursor-pointer"
                  >
                    <PlusCircle className="w-5 h-5" />
                    New Task
                  </button>
                )}
              </div>
            </section>

            {/* Task List Section */}
            <section className="grid gap-4">
              {(view === 'tasks' ? tasks : sharedTasks).length === 0 ? (
                <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 border-dashed text-slate-500 dark:text-slate-400">
                  <p className="text-lg">No tasks found.</p>
                  <p className="text-sm mt-1">{view === 'tasks' ? 'Create a new task or adjust your filters.' : 'No tasks have been shared with you.'}</p>
                </div>
              ) : (
                (view === 'tasks' ? tasks : sharedTasks).map(task => (
                  <div key={task.id} className="bg-white dark:bg-slate-900 transition-colors border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-[0_2px_8px_-4px_rgba(0,0,0,0.05)] dark:shadow-none hover:border-slate-300 dark:hover:border-slate-700 flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className={`text-lg font-semibold ${task.status === 'Completed' ? 'line-through text-slate-400 dark:text-slate-500' : 'text-slate-800 dark:text-slate-100'}`}>
                          {task.title}
                        </h3>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${
                          task.status === 'Completed' ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800' :
                          task.status === 'In Progress' ? 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800' :
                          'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                        }`}>
                          {task.status}
                        </span>
                        {task.attachments && task.attachments.length > 0 && (
                          <span className="text-xs bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded-full font-medium">📎 {task.attachments.length}</span>
                        )}
                        {task.sharedWith && task.sharedWith.length > 0 && view === 'tasks' && (
                          <span className="text-xs bg-sky-50 dark:bg-sky-900/30 text-sky-600 dark:text-sky-400 px-2 py-0.5 rounded-full font-medium">Shared</span>
                        )}
                      </div>
                      <div className="space-y-3 mt-2">
                        {task.description && (
                          <p className="text-slate-600 dark:text-slate-400 text-sm line-clamp-2">{task.description}</p>
                        )}
                        
                        {task.due_date && (
                          <div className="text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 border dark:border-slate-700 px-2 py-1 rounded inline-block">
                            Due: {format(new Date(task.due_date), 'MMM d, yyyy')}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-wrap sm:flex-col gap-2 w-full sm:w-auto mt-2 sm:mt-0">
                      {view === 'tasks' && (
                        <button 
                          onClick={() => setSharingTask(task)}
                          className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 text-sm font-medium text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-900 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-md transition-colors"
                        >
                          <Share2 className="w-3.5 h-3.5" /> Share
                        </button>
                      )}
                      <button 
                        onClick={() => { setEditingTask(task); setIsFormOpen(true); }}
                        className="flex-1 sm:flex-none px-3 py-1.5 text-sm font-medium text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-md transition-colors"
                      >
                        Edit
                      </button>
                      {view === 'tasks' && (
                        <button 
                          onClick={() => handleDelete(task.id)}
                          className="flex-1 sm:flex-none px-3 py-1.5 text-sm font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 rounded-md transition-colors"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </section>
          </>
        )}
      </main>

      {isFormOpen && (
        <TaskForm 
          task={editingTask} 
          user={user}
          onClose={() => setIsFormOpen(false)} 
          onSave={() => {
            setIsFormOpen(false);
            if (view === 'tasks') fetchTasks();
            if (view === 'shared') fetchSharedTasks();
          }} 
        />
      )}

      {sharingTask && (
        <ShareTaskModal 
          taskId={sharingTask.id}
          taskName={sharingTask.title}
          onClose={() => setSharingTask(null)}
          onShareSuccess={() => {
            setSharingTask(null);
            fetchTasks();
          }}
        />
      )}
    </div>
  );
}
