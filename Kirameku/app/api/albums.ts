import { request } from "./client";

export interface AlbumItem {
  id: number;
  title: string;
  description: string;
  cover: string;
  photo_count: number;
  sort: number;
  created_at: string;
  updated_at: string;
}

export interface PhotoItem {
  id: number;
  album_id: number;
  url: string;
  caption: string;
  orientation: string;
  sort: number;
  created_at: string;
}

/** 前端展示用照片类型（由后端 PhotoItem 转换而来） */
export interface Photo {
  id: string;
  url: string;
  caption: string;
  orientation: "landscape" | "portrait" | "square";
}

export function getAlbums() {
  return request<AlbumItem[]>("/api/albums");
}

export function getAlbumById(albumId: number) {
  return request<AlbumItem>(`/api/albums/${albumId}`);
}

export function getAlbumPhotos(albumId: number) {
  return request<PhotoItem[]>(`/api/albums/${albumId}/photos`);
}
