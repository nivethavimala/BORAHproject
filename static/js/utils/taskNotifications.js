class TaskNotificationManager {
  constructor() {
    this.notifiedTaskIds = new Set();
    this.audioCtx = null;
    this.intervalId = null;
    this.listeners = [];
    try {
      const stored = sessionStorage.getItem('borah_notified_task_ids');
      if (stored) {
        JSON.parse(stored).forEach((id) => this.notifiedTaskIds.add(id));
      }
    } catch {
      // Ignore storage errors
    }
  }

  isNotificationSupported() {
    return typeof window !== 'undefined' && 'Notification' in window;
  }

  getPermission() {
    if (!this.isNotificationSupported()) return 'unsupported';
    return Notification.permission;
  }

  async requestPermission() {
    if (!this.isNotificationSupported()) return false;
    try {
      const res = await Notification.requestPermission();
      return res === 'granted';
    } catch {
      return false;
    }
  }

  playTaskChime() {
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return;
      if (!this.audioCtx || this.audioCtx.state === 'suspended') {
        this.audioCtx = new AudioContextClass();
      }
      const ctx = this.audioCtx;
      const now = ctx.currentTime;

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
    } catch {
      // Ignore audio restrictions
    }
  }

  showNotification(title, body) {
    if (this.isNotificationSupported() && Notification.permission === 'granted') {
      try {
        new Notification(title, { body });
      } catch {
        // Ignore system notification fallback
      }
    }
  }

  triggerTaskReminder(task, reason = 'Task reminder') {
    this.playTaskChime();
    this.showNotification(`Task Reminder: ${task.title}`, `${reason} - ${task.category || 'General'}`);
    this.notifiedTaskIds.add(task.id);
    this.persistNotifiedIds();
    this.listeners.forEach((l) => l(task));
  }

  checkTasks(tasks) {
    const today = new Date().toISOString().split('T')[0];
    const now = new Date();
    const currentHours = now.getHours();
    const currentMinutes = now.getMinutes();

    for (const task of tasks) {
      if (task.completed || this.notifiedTaskIds.has(task.id)) continue;
      if (task.due_date === today) {
        if (task.due_time) {
          const [tHour, tMin] = task.due_time.split(':').map(Number);
          const taskMinutes = tHour * 60 + tMin;
          const currentTotalMinutes = currentHours * 60 + currentMinutes;
          if (currentTotalMinutes >= taskMinutes - 15 && currentTotalMinutes <= taskMinutes + 30) {
            this.triggerTaskReminder(task, `Scheduled for ${task.due_time} today`);
            break;
          }
        } else if (task.priority === 'high' && currentHours >= 9) {
          this.triggerTaskReminder(task, 'High priority task scheduled for today');
          break;
        }
      }
    }
  }

  startReminderLoop(getTasks) {
    if (this.intervalId) return;
    this.intervalId = window.setInterval(async () => {
      try {
        const tasks = await getTasks();
        if (Array.isArray(tasks)) this.checkTasks(tasks);
      } catch {
        // Ignore
      }
    }, 45000);
  }

  stopReminderLoop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  subscribe(listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  resetNotified(taskId) {
    if (taskId) this.notifiedTaskIds.delete(taskId);
    else this.notifiedTaskIds.clear();
    this.persistNotifiedIds();
  }

  persistNotifiedIds() {
    try {
      sessionStorage.setItem('borah_notified_task_ids', JSON.stringify(Array.from(this.notifiedTaskIds)));
    } catch {
      // Ignore
    }
  }
}

export const taskNotificationManager = new TaskNotificationManager();
