/**
 * BORAH — ARMY_EASTER_EGG_LAYER
 * Reusable AchievementManager Module
 *
 * Tracks secret comfort badges:
 * - 🌙 Night Writer (Journal entry after 10 PM)
 * - ⭐ Seven Stars (7 special memories created)
 * - 💜 Purple Heart (7 journal entries written)
 * - 📸 Memory Keeper (10 memories preserved)
 * - 🌱 New Beginning (Active on 7 days)
 */

export interface AchievementBadge {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlockedAt?: string;
  isSecret: boolean;
}

const BADGES_DEFINITIONS: AchievementBadge[] = [
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
  /**
   * Get all badges with their unlocked status
   */
  public getBadges(): AchievementBadge[] {
    if (typeof window === 'undefined') return BADGES_DEFINITIONS;
    const unlockedMap = this.getUnlockedMap();

    return BADGES_DEFINITIONS.map((b) => ({
      ...b,
      unlockedAt: unlockedMap[b.id] || undefined,
    }));
  }

  /**
   * Check conditions and unlock if qualified
   */
  public checkAndUnlock(
    type: 'journal_count' | 'memory_count' | 'special_memories_count' | 'night_entry' | 'days_active',
    value: number
  ): AchievementBadge | null {
    if (typeof window === 'undefined') return null;

    let targetBadgeId: string | null = null;

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
      localStorage.setItem(STORAGE_KEY, JSON.stringify(unlockedMap));

      const badge = BADGES_DEFINITIONS.find((b) => b.id === targetBadgeId);
      if (badge) {
        window.dispatchEvent(
          new CustomEvent('borah:badge-unlocked', { detail: { badge } })
        );
        return badge;
      }
    }

    return null;
  }

  private getUnlockedMap(): Record<string, string> {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }
}

export const AchievementManager = new AchievementManagerService();
