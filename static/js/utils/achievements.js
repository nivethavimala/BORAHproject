const BADGES_DEFINITIONS = [
  {
    id: 'purple_heart',
    title: 'Purple Heart',
    description: 'Wrote seven thoughtful diary entries in your sanctuary.',
    icon: '💜',
    isSecret: true,
  },
  {
    id: 'seven_stars',
    title: 'Seven Stars',
    description: 'Marked seven precious memories as special milestones.',
    icon: '⭐',
    isSecret: true,
  },
  {
    id: 'night_writer',
    title: 'Night Writer',
    description: 'Recorded quiet evening thoughts after 10:00 PM.',
    icon: '🌙',
    isSecret: true,
  },
  {
    id: 'memory_keeper',
    title: 'Memory Keeper',
    description: 'Preserved ten cherished life memories in your album.',
    icon: '📸',
    isSecret: false,
  },
  {
    id: 'new_beginning',
    title: 'New Beginning',
    description: 'Visited your sanctuary across seven separate days.',
    icon: '🌱',
    isSecret: false,
  },
];

const STORAGE_KEY = 'borah_unlocked_badges';

class AchievementManagerService {
  getUnlockedMap() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }

  getBadges() {
    const unlockedMap = this.getUnlockedMap();
    return BADGES_DEFINITIONS.map((b) => ({
      ...b,
      unlockedAt: unlockedMap[b.id] || undefined,
    }));
  }

  checkAndUnlock(type, value) {
    let targetBadgeId = null;
    if (type === 'journal_count' && value >= 7) {
      targetBadgeId = 'purple_heart';
    } else if (type === 'special_memories_count' && value >= 7) {
      targetBadgeId = 'seven_stars';
    } else if (type === 'night_entry' && value > 0) {
      targetBadgeId = 'night_writer';
    } else if (type === 'memory_count' && value >= 10) {
      targetBadgeId = 'memory_keeper';
    } else if (type === 'days_active' && value >= 7) {
      targetBadgeId = 'new_beginning';
    }

    if (!targetBadgeId) return null;

    const unlockedMap = this.getUnlockedMap();
    if (!unlockedMap[targetBadgeId]) {
      unlockedMap[targetBadgeId] = new Date().toISOString();
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(unlockedMap));
      } catch {
        // Ignore storage quota errors
      }
      const badge = BADGES_DEFINITIONS.find((b) => b.id === targetBadgeId);
      if (badge) {
        window.dispatchEvent(new CustomEvent('borah:badge-unlocked', { detail: { badge } }));
        return badge;
      }
    }
    return null;
  }
}

export const AchievementManager = new AchievementManagerService();
