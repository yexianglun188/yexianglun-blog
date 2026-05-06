"use client";

import GlassCard from "@/components/ui/GlassCard";
import { MessageSquare } from "lucide-react";

export default function ChatterPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <GlassCard>
        <div className="flex items-center gap-3 mb-6">
          <MessageSquare className="w-6 h-6 text-purple-500" />
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-200">
            杂谈
          </h1>
        </div>
        <p className="text-slate-600 dark:text-slate-400">
          杂谈列表将在这里显示...
        </p>
      </GlassCard>
    </div>
  );
}
