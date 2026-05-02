import { ExternalLink } from 'lucide-react'
import type { AudioMeta } from '@/store/taskStore'

interface VideoBannerProps {
  audioMeta?: AudioMeta
  videoUrl?: string
}

/** 平台 label 映射 */
const platformLabel: Record<string, string> = {
  bilibili: '哔哩哔哩',
  youtube: 'YouTube',
  douyin: '抖音',
  xiaohongshu: '小红书',
}

export default function VideoBanner({ audioMeta, videoUrl }: VideoBannerProps) {
  if (!audioMeta) return null

  const rawCover = audioMeta.cover_url
  // 外部 URL 走代理，本地路径直接使用
  const coverUrl = rawCover
    ? rawCover.startsWith('http')
      ? `/api/image_proxy?url=${encodeURIComponent(rawCover)}`
      : rawCover
    : ''
  const title = audioMeta.title
  const uploader = audioMeta.raw_info?.uploader || ''
  const platform = platformLabel[audioMeta.platform] || audioMeta.platform || ''
  const originalUrl = videoUrl || audioMeta.raw_info?.webpage_url || ''

  return (
    <div className="relative mb-4 max-w-full overflow-hidden rounded-lg">
      {/* 模糊背景封面 */}
      <div className="absolute inset-0">
        {coverUrl ? (
          <img
            src={coverUrl}
            alt=""
            referrerPolicy="no-referrer"
            className="h-full w-full object-cover blur-md brightness-[0.4] scale-110"
          />
        ) : (
          <div className="h-full w-full bg-gradient-to-r from-blue-600 to-indigo-700" />
        )}
      </div>

      {/* 内容层 */}
      <div className="relative flex w-full min-w-0 flex-wrap items-center gap-3 px-3 py-3 md:gap-4 md:px-5 md:py-4">
        {/* 封面缩略图 */}
        {coverUrl && (
          <img
            src={coverUrl}
            alt={title}
            referrerPolicy="no-referrer"
            className="h-14 w-24 shrink-0 rounded-md object-cover shadow-md md:h-16 md:w-28"
          />
        )}

        {/* 文字信息 */}
        <div className="min-w-0 flex-1 max-w-full">
          <h2 className="line-clamp-2 break-words text-sm font-bold text-white md:line-clamp-none md:text-base" title={title}>
            {title}
          </h2>
          <div className="mt-1 flex flex-wrap items-center gap-1 text-xs text-white/70 md:gap-2 md:text-sm">
            {uploader && <span className="break-words">{uploader}</span>}
            {uploader && platform && <span className="text-white/40 shrink-0">·</span>}
            {platform && <span className="break-words">{platform}</span>}
          </div>
        </div>

        {/* 跳转原视频 */}
        {originalUrl && (
          <a
            href={originalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex shrink-0 items-center gap-1 rounded-full bg-white/15 px-2 py-1 text-xs font-medium text-white backdrop-blur-sm transition-colors hover:bg-white/25 md:gap-1.5 md:px-3 md:py-1.5"
          >
            <ExternalLink className="h-3 w-3 md:h-3.5 md:w-3.5" />
            <span className="hidden md:inline">原视频</span>
          </a>
        )}
      </div>
    </div>
  )
}
