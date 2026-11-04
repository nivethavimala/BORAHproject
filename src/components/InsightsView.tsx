import React, { useState, useEffect } from 'react';
import { api } from '../api';
import {
  BarChart2,
  Sparkles,
  BookOpen,
  Camera,
  CheckCircle2,
  Smile,
  RefreshCw,
  Heart,
  Calendar,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';

interface InsightsViewProps {
  onOpenSevenDayChallenge: () => void;
  onNavigateToJournal: () => void;
}

export const InsightsView: React.FC<InsightsViewProps> = ({
  onOpenSevenDayChallenge,
  onNavigateToJournal,
}) => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    journalCount: 0,
    memoryCount: 0,
    tasksCount: 0,
    tasksCompleted: 0,
    moodsCount: 0,
    topMood: 'Calm',
  });
  const [aiSummary, setAiSummary] = useState<any>(null);
  const [aiPrompts, setAiPrompts] = useState<string[]>([]);
  const [aiLoading, setAiLoading] = useState(false);

  const loadData = async () => {
    try {
      const [jRes, mRes, tRes, mdRes] = await Promise.all([
        api.getJournals().catch(() => ({ success: false, entries: [] })),
        api.getMemories().catch(() => ({ success: false, memories: [] })),
        api.getTasks().catch(() => ({ success: false, tasks: [] })),
        api.getMoods().catch(() => ({ success: false, moods: [] })),
      ]);

      const jCount = jRes.success ? jRes.entries.length : 0;
      const mCount = mRes.success ? mRes.memories.length : 0;
      const tList = tRes.success ? tRes.tasks : [];
      const tCompleted = tList.filter((t: any) => t.completed).length;
      const mdList = mdRes.success ? mdRes.moods : [];

      setStats({
        journalCount: jCount,
        memoryCount: mCount,
        tasksCount: tList.length,
        tasksCompleted: tCompleted,
        moodsCount: mdList.length,
        topMood: mdList[0]?.mood || 'Calm',
      });
    } catch (err) {
      console.error('Error loading insight statistics:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateSummary = async () => {
    setAiLoading(true);
    try {
      const [sumRes, prmRes] = await Promise.all([
        api.getAiSummary(),
        api.getAiPrompts(),
      ]);
      if (sumRes.success) setAiSummary(sumRes.summary);
      if (prmRes.success) setAiPrompts(prmRes.prompts);
    } catch (err) {
      console.error('AI summary error:', err);
    } finally {
      setAiLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    handleGenerateSummary();
  }, []);

  const completionRate = stats.tasksCount > 0 ? Math.round((stats.tasksCompleted / stats.tasksCount) * 100) : 0;

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-800 dark:text-slate-100 font-serif flex items-center gap-2">
            <span>Personal Insights & Reflection</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Discover your habits, emotional trends, and weekly self-growth.
          </p>
        </div>

        <button
          type="button"
          onClick={handleGenerateSummary}
          disabled={aiLoading}
          className="px-4 py-2 rounded-2xl text-xs font-semibold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800 hover:bg-purple-100 transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${aiLoading ? 'animate-spin' : ''}`} />
          <span>{aiLoading ? 'Synthesizing...' : 'Refresh Reflections'}</span>
        </button>
      </div>

      {/* Numerical Metrics Cards (with tabular numbers) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="flex items-center gap-2 text-slate-400 text-xs mb-2">
            <BookOpen className="w-4 h-4 text-amber-500" />
            <span>Journal Pages</span>
          </div>
          <div className="text-2xl font-bold text-slate-800 dark:text-slate-100 font-mono tabular-nums">
            {stats.journalCount}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Reflections written</div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="flex items-center gap-2 text-slate-400 text-xs mb-2">
            <Camera className="w-4 h-4 text-rose-500" />
            <span>Memory Albums</span>
          </div>
          <div className="text-2xl font-bold text-slate-800 dark:text-slate-100 font-mono tabular-nums">
            {stats.memoryCount}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Milestones preserved</div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="flex items-center gap-2 text-slate-400 text-xs mb-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <span>Task Completion</span>
          </div>
          <div className="text-2xl font-bold text-slate-800 dark:text-slate-100 font-mono tabular-nums">
            {completionRate}%
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            {stats.tasksCompleted} of {stats.tasksCount} done
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="flex items-center gap-2 text-slate-400 text-xs mb-2">
            <Smile className="w-4 h-4 text-purple-500" />
            <span>Mood Check-ins</span>
          </div>
          <div className="text-2xl font-bold text-slate-800 dark:text-slate-100 font-mono tabular-nums">
            {stats.moodsCount}
          </div>
          <div className="text-[11px] text-slate-400 mt-1 capitalize">Primary tone: {stats.topMood}</div>
        </div>
      </div>

      {/* AI Smart Summary Card (Gemini 3.8 Flash) */}
      <div className="bg-gradient-to-br from-purple-50/70 via-violet-50/40 to-indigo-50/30 dark:from-slate-900 dark:to-purple-950/20 rounded-3xl p-6 sm:p-8 border border-purple-200/80 dark:border-purple-900/60 shadow-xs space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-xs">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800 dark:text-slate-100 font-serif">
                Weekly Reflection Summary
              </h2>
              <span className="text-[11px] text-purple-700 dark:text-purple-400">
                AI-assisted observations · Strictly non-clinical
              </span>
            </div>
          </div>
          <span className="text-xs text-purple-600 dark:text-purple-400 font-serif">Gemini 3.8 Flash</span>
        </div>

        {aiLoading ? (
          <div className="py-8 text-center text-xs text-purple-600">
            <span className="inline-block w-5 h-5 border-2 border-purple-600 border-t-transparent rounded-full animate-spin mb-2" />
            <p>Synthesizing your peaceful weekly reflection...</p>
          </div>
        ) : aiSummary ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl bg-white/70 dark:bg-slate-800/70 border border-purple-100 dark:border-purple-900/40 space-y-1">
              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                ✨ Highlights & Small Victories
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-300 font-serif leading-relaxed">
                {aiSummary.highlights}
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-white/70 dark:bg-slate-800/70 border border-purple-100 dark:border-purple-900/40 space-y-1">
              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                🌸 Moments of Quiet Joy
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-300 font-serif leading-relaxed">
                {aiSummary.positiveMoments}
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-white/70 dark:bg-slate-800/70 border border-purple-100 dark:border-purple-900/40 space-y-1">
              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                🌱 Gentle Growth for Next Week
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-300 font-serif leading-relaxed">
                {aiSummary.growthAreas}
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-white/70 dark:bg-slate-800/70 border border-purple-100 dark:border-purple-900/40 space-y-1">
              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                💜 Pattern Observation
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-300 font-serif leading-relaxed italic">
                "{aiSummary.patternObservation}"
              </p>
            </div>
          </div>
        ) : null}
      </div>

      {/* Gentle Reflection Questions Carousel & 7-Day Challenge Launcher */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Reflection Prompts */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Gentle Questions to Consider</span>
          </div>

          <div className="space-y-2.5">
            {aiPrompts.slice(0, 3).map((prompt, i) => (
              <div
                key={i}
                onClick={onNavigateToJournal}
                className="p-3.5 rounded-2xl bg-amber-50/40 dark:bg-slate-800/60 border border-amber-100/60 dark:border-slate-700 hover:border-amber-300 cursor-pointer transition-colors group flex items-center justify-between"
              >
                <p className="text-xs text-slate-700 dark:text-slate-300 font-serif italic">
                  "{prompt}"
                </p>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-amber-600 transition-colors shrink-0 ml-2" />
              </div>
            ))}
          </div>
        </div>

        {/* 7 Days of Me Challenge Card */}
        <div className="bg-gradient-to-br from-purple-100/60 to-rose-100/50 dark:from-slate-900 dark:to-purple-950/40 rounded-3xl p-6 border border-purple-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-purple-700 dark:text-purple-400 uppercase tracking-wider">
              <span>🌸 Guided Challenge</span>
            </div>
            <h3 className="text-lg font-bold font-serif text-slate-800 dark:text-slate-100">
              7 Days of Me Reflection
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-serif">
              A seven-day gentle journey touching upon smile, learning, appreciation, dreams, cherished memories, improvement, and your future letter.
            </p>
          </div>

          <button
            type="button"
            onClick={onOpenSevenDayChallenge}
            className="mt-6 w-full py-2.5 px-4 rounded-xl text-xs font-semibold text-white bg-purple-600 hover:bg-purple-700 transition-all shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
          >
            <span>Open 7-Day Guide</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
