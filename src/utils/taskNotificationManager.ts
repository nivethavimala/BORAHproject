import { Task } from '../types';

class TaskNotificationManager {
  private notifiedTaskIds = new Set<string>();
  private audioCtx: AudioContext | null = null;
  private intervalId: number | null = null;
  private listeners: Array<(task: Task) => void> = [];

  constructor() {
    // Restore notified IDs from sessionStorage to prevent spam across reloads
    try {
      const stored = sessionStorage.getItem('borah_notified_task_ids');
      if (stored) {
        const ids = JSON.parse(stored);
        ids.forEach((id: string) => this.notifiedTaskIds.add(id));
      }
    } catch {
      // Ignore storage errors
    }
  }

  /**
   * Check if the browser supports the Notification API
   */
  public isNotificationSupported(): boolean {
    return typeof window !== 'undefined' && 'Notification' in window;
  }

  /**
   * Current notification permission state
   */
  public getPermission(): NotificationPermission | 'unsupported' {
    if (!this.isNotificationSupported()) return 'unsupported';
    return Notification.permission;
  }

  /**
   * Request permission from the user
   */
  public async requestPermission(): Promise<boolean> {
    if (!this.isNotificationSupported()) return false;
    try {
      const res = await Notification.requestPermission();
      return res === 'granted';
    } catch (err) {
      console.warn('Notification permission request error:', err);
      return false;
    }
  }

  /**
   * Play a gentle, soothing double-tone chime using the Web Audio API
   */
  public playTaskChime(): void {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;

      if (!this.audioCtx || this.audioCtx.state === 'suspended') {
        this.audioCtx = new AudioContextClass();
      }

      const ctx = this.audioCtx;
      const now = ctx.currentTime;

      // Note 1: 880Hz (A5)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(880, now);
      gain1.gain.setValueAtTime(0, now);
      gain1.gain.linearRampToValueAtTime(0.18, now + 0.05);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.7);

      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.7);

      // Note 2: 1318.5Hz (E6) - higher sparkling chime
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(1318.5, now + 0.15);
      gain2.gain.setValueAtTime(0, now + 0.15);
      gain2.gain.linearRampToValueAtTime(0.22, now + 0.2);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 1.2);

      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.15);
      osc2.stop(now + 1.2);
    } catch (e) {
      console.debug('Web Audio chime could not play:', e);
    }
  }

  /**
   * Show a system notification
   */
  public showNotification(title: string, body: string): void {
    if (this.isNotificationSupported() && Notification.permission === 'granted') {
      try {
        new Notification(title, {
          body,
          icon: '/favicon.ico',
        });
      } catch (err) {
        console.debug('System notification error, fallback to in-app sound:', err);
      }
    }
  }

  /**
   * Remind user about a specific task immediately
   */
  public triggerTaskReminder(task: Task, reason = 'Task reminder'): void {
    this.playTaskChime();
    this.showNotification(`Task Reminder: ${task.title}`, `${reason} - ${task.category || 'General'}`);
    this.notifiedTaskIds.add(task.id);
    this.persistNotifiedIds();
    this.notifyListeners(task);
  }

  /**
   * Check list of tasks and notify for upcoming / due / overdue tasks
   */
  public checkTasks(tasks: Task[]): void {
    const today = new Date().toISOString().split('T')[0];
    const now = new Date();
    const currentHours = now.getHours();
    const currentMinutes = now.getMinutes();
    const currentTimeStr = `${String(currentHours).padStart(2, '0')}:${String(currentMinutes).padStart(2, '0')}`;

    for (const task of tasks) {
      if (task.completed) continue;
      if (this.notifiedTaskIds.has(task.id)) continue;

      if (task.due_date === today) {
        if (task.due_time) {
          // Compare times
          const [tHour, tMin] = task.due_time.split(':').map(Number);
          const taskMinutes = tHour * 60 + tMin;
          const currentTotalMinutes = currentHours * 60 + currentMinutes;

          // Remind if within 15 minutes before or exactly on time
          if (currentTotalMinutes >= taskMinutes - 15 && currentTotalMinutes <= taskMinutes + 30) {
            this.triggerTaskReminder(task, `Scheduled for ${task.due_time} today`);
            break;
          }
        } else {
          // Due today with high priority
          if (task.priority === 'high' && currentHours >= 9) {
            this.triggerTaskReminder(task, 'High priority task scheduled for today');
            break;
          }
        }
      }
    }
  }

  /**
   * Start periodic background check
   */
  public startReminderLoop(getTasks: () => Promise<Task[]> | Task[]): void {
    if (this.intervalId) return;

    // Run every 45 seconds
    this.intervalId = window.setInterval(async () => {
      try {
        const tasks = await getTasks();
        if (Array.isArray(tasks)) {
          this.checkTasks(tasks);
        }
      } catch (err) {
        console.debug('Error in reminder loop check:', err);
      }
    }, 45000);
  }

  public stopReminderLoop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  public subscribe(listener: (task: Task) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notifyListeners(task: Task): void {
    this.listeners.forEach((l) => l(task));
  }

  public resetNotified(taskId?: string): void {
    if (taskId) {
      this.notifiedTaskIds.delete(taskId);
    } else {
      this.notifiedTaskIds.clear();
    }
    this.persistNotifiedIds();
  }

  private persistNotifiedIds(): void {
    try {
      sessionStorage.setItem('borah_notified_task_ids', JSON.stringify(Array.from(this.notifiedTaskIds)));
    } catch {
      // Ignore
    }
  }
}

export const taskNotificationManager = new TaskNotificationManager();
