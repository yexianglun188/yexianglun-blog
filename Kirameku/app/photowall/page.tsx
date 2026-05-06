"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Camera, Calendar } from "lucide-react";
import PhotoCard from "@/components/photos/PhotoCard";
import Lightbox from "@/components/photos/Lightbox";
import type { Photo } from "@/data/photos";
import { getAlbums, getAlbumPhotos } from "@/app/api";

interface PhotoDay {
  date: string;
  label: string;
  updatedAt: string;
  photos: Photo[];
}

export default function PhotoWallPage() {
  const [photoDays, setPhotoDays] = useState<PhotoDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [currentPhotos, setCurrentPhotos] = useState<Photo[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    async function fetchData() {
      try {
        const albums = await getAlbums();

        // 按更新时间倒序，最新的在前
        albums.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());

        const days: PhotoDay[] = await Promise.all(
          albums.map(async (album) => {
            const photos = await getAlbumPhotos(album.id);

            return {
              date: album.created_at,
              label: album.title,
              updatedAt: album.updated_at,
              photos: photos.reverse().map(p => ({
                id: String(p.id),
                url: p.url,
                caption: p.caption,
                orientation: (p.orientation as Photo["orientation"]) || "landscape"
              }))
            };
          })
        );

        setPhotoDays(days);
      } catch {
        setPhotoDays([]);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const openLightbox = (dayPhotos: Photo[], index: number) => {
    setCurrentPhotos(dayPhotos);
    setCurrentIndex(index);
    setLightboxOpen(true);
  };

  const handlePrev = () => {
    setCurrentIndex((i) => (i - 1 + currentPhotos.length) % currentPhotos.length);
  };

  const handleNext = () => {
    setCurrentIndex((i) => (i + 1) % currentPhotos.length);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* 页头 */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-12"
      >
        <div className="flex items-center gap-3 mb-2">
          <Camera className="w-7 h-7 text-sky-500" />
          <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100">
            照片墙
          </h1>
        </div>
        <p className="text-slate-600 dark:text-slate-300 ml-10">
          用照片记录生活的每一个瞬间
        </p>
      </motion.div>

      {/* 加载状态 */}
      {loading ? (
        <div className="flex items-center justify-center py-32">
          <div className="w-8 h-8 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : photoDays.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-32 text-slate-400">
          <Camera className="w-12 h-12 mb-4 opacity-40" />
          <p>暂无照片</p>
        </div>
      ) : (
        /* 时间线 */
        <div className="relative">
          {/* 时间线竖线 */}
          <div className="absolute left-4 md:left-8 top-0 bottom-0 w-px bg-gradient-to-b from-sky-400/40 via-sky-400/20 to-transparent" />

          {photoDays.map((day, dayIndex) => (
            <motion.div
              key={day.label}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: dayIndex * 0.15 }}
              className="relative mb-16 last:mb-0"
            >
              {/* 日期标记 */}
              <div className="flex items-center gap-4 mb-6">
                {/* 时间线圆点 */}
                <div className="relative z-10 flex items-center justify-center w-8 h-8 md:w-16 md:h-8">
                  <div className="w-3 h-3 rounded-full bg-sky-500 shadow-lg shadow-sky-500/30 ring-4 ring-sky-500/10" />
                </div>

                {/* 日期标签 */}
                <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-white/50 dark:bg-white/[0.12] backdrop-blur-2xl border border-white/30 dark:border-white/15 shadow-sm">
                  <Calendar className="w-4 h-4 text-sky-500" />
                  <span className="text-sm font-medium text-slate-800 dark:text-slate-200">
                    {day.label}
                  </span>
                  <span className="text-xs text-slate-600 dark:text-slate-300">
                    {day.photos.length} 张
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    更新于 {day.updatedAt.replace("T", " ").slice(0, 19)}
                  </span>
                </div>
              </div>

              {/* 照片网格 - 画框 */}
              <div className="ml-4 md:ml-16">
                <div className="p-4 md:p-6 rounded-3xl bg-white/40 dark:bg-white/[0.08] backdrop-blur-2xl border border-white/30 dark:border-white/15 shadow-sm">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6">
                    {day.photos.map((photo, photoIndex) => (
                      <PhotoCard
                        key={photo.id}
                        photo={photo}
                        index={photoIndex}
                        onClick={() => openLightbox(day.photos, photoIndex)}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* 灯箱 */}
      <Lightbox
        photos={currentPhotos}
        index={currentIndex}
        open={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        onPrev={handlePrev}
        onNext={handleNext}
      />
    </div>
  );
}
