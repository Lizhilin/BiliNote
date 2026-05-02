import {useTaskStore} from '@/store/taskStore'
import {Badge} from '@/components/ui/badge.tsx'
import {cn} from '@/lib/utils.ts'
import {Loader2, Trash} from 'lucide-react'
import {Button} from '@/components/ui/button.tsx'
import Fuse from 'fuse.js'

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip.tsx'
import LazyImage from "@/components/LazyImage.tsx";
import {FC, useState, useEffect, useMemo, useCallback, useRef} from 'react'

interface NoteHistoryProps {
  onSelect: (taskId: string) => void
  selectedId: string | null
}

const NoteHistory: FC<NoteHistoryProps> = ({ onSelect, selectedId }) => {
  const tasks = useTaskStore(state => state.tasks)
  const removeTask = useTaskStore(state => state.removeTask)
  const fetchHistory = useTaskStore(state => state.fetchHistory)
  const historyHasMore = useTaskStore(state => state.historyHasMore)
  const isLoadingHistory = useTaskStore(state => state.isLoadingHistory)
  const historyPage = useTaskStore(state => state.historyPage)
  // 图片代理走同源 /api/ 路径，兼容 localhost 和 IP 访问
  const proxyCover = (url: string) => `/api/image_proxy?url=${encodeURIComponent(url)}`
  const [rawSearch, setRawSearch] = useState('')
  const [search, setSearch] = useState('')
  const sentinelRef = useRef<HTMLDivElement>(null)
  const fuse = useMemo(() => new Fuse(tasks, {
    keys: ['audioMeta.title'],
    threshold: 0.4 // 匹配精度（越低越严格）
  }), [tasks])

  const loadMore = useCallback(() => {
    if (isLoadingHistory || !historyHasMore) return
    fetchHistory(historyPage + 1)
  }, [isLoadingHistory, historyHasMore, historyPage, fetchHistory])

  // IntersectionObserver 触底加载
  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) loadMore()
      },
      { rootMargin: '0px 0px 200px 0px' }
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [loadMore])

  useEffect(() => {
    const timer = setTimeout(() => {
      if (rawSearch === '') return
      setSearch(rawSearch)
    }, 300) // 300ms 防抖

    return () => clearTimeout(timer)
  }, [rawSearch])
  const filteredTasks = search.trim()
      ? fuse.search(search).map(result => result.item)
      : tasks

  // 首次加载中
  if (historyPage === 0) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-neutral-400" />
      </div>
    )
  }

  if (filteredTasks.length === 0) {
    return (
        <>
          <div className="mb-2">
            <input
                type="text"
                placeholder="搜索笔记标题..."
                className="w-full rounded border border-neutral-300 px-3 py-1 text-sm outline-none focus:border-primary"
                value={search}
                onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="rounded-md border border-neutral-200 bg-neutral-50 py-6 text-center">
            <p className="text-sm text-neutral-500">暂无记录</p>
          </div>
        </>

    )
  }


  return (
    <>
      <div className="mb-2">
        <input
            type="text"
            placeholder="搜索笔记标题..."
            className="w-full rounded border border-neutral-300 px-3 py-1 text-sm outline-none focus:border-primary"
            value={search}
            onChange={e => setSearch(e.target.value)}
        />
      </div>
      <div className="flex flex-col gap-2">
        {filteredTasks.map(task => (
          <div
            key={task.id}
            onClick={() => onSelect(task.id)}
            className={cn(
              'flex cursor-pointer flex-col rounded-md border border-neutral-200 p-3',
              selectedId === task.id && 'border-primary bg-primary-light'
            )}
          >
            <div
              className={cn('flex items-center gap-4')}
            >
              {/* 封面图 */}
              {task.audioMeta.cover_url ? (
                task.audioMeta.cover_url.startsWith('http') ? (
                  <LazyImage src={proxyCover(task.audioMeta.cover_url)} alt="封面" />
                ) : (
                  <img src={task.audioMeta.cover_url} alt="封面" className="h-10 w-12 rounded-md object-cover" />
                )
              ) : (
                <div className="flex h-10 w-12 shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-indigo-100 to-purple-200">
                  <svg className="h-5 w-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                  </svg>
                </div>
              )}

              {/* 标题 + 状态 */}

              <div className="flex w-full items-center justify-between gap-2">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="line-clamp-2 max-w-[180px] flex-1 overflow-hidden text-sm text-ellipsis">
                        {task.audioMeta.title || '未命名笔记'}
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{task.audioMeta.title || '未命名笔记'}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
            <div className={'mt-2 flex items-center justify-between text-[10px]'}>
              <div className="shrink-0">
                {task.status === 'SUCCESS' && (
                  <div className={'bg-primary w-10 rounded p-0.5 text-center text-white'}>
                    已完成
                  </div>
                )}
                {task.status !== 'SUCCESS' && task.status !== 'FAILED' ? (
                  <div className={'w-10 rounded bg-green-500 p-0.5 text-center text-white'}>
                    等待中
                  </div>
                ) : (
                  <></>
                )}
                {task.status === 'FAILED' && (
                  <div className={'w-10 rounded bg-red-500 p-0.5 text-center text-white'}>失败</div>
                )}
              </div>

              <div>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        size="small"
                        variant="ghost"
                        onClick={e => {
                          e.stopPropagation()
                          removeTask(task.id)
                        }}
                        className="shrink-0"
                      >
                        <Trash className="text-muted-foreground h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>删除</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              {/*<div className="shrink-0">*/}
              {/*  {task.status === 'SUCCESS' && <Badge variant="default">已完成</Badge>}*/}
              {/*  {task.status !== 'SUCCESS' && task.status === 'FAILED' && (*/}
              {/*    <Badge variant="outline">等待中</Badge>*/}
              {/*  )}*/}
              {/*  {task.status === 'FAILED' && <Badge variant="destructive">失败</Badge>}*/}
              {/*</div>*/}
            </div>
          </div>
        ))}
      </div>

      {/* 触底加载 sentinel */}
      <div ref={sentinelRef} className="h-4" />

      {/* 加载中 */}
      {isLoadingHistory && (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="h-5 w-5 animate-spin text-neutral-400" />
          <span className="ml-2 text-sm text-neutral-400">加载中…</span>
        </div>
      )}

      {/* 没有更多 */}
      {!historyHasMore && historyPage > 0 && filteredTasks.length > 0 && (
        <div className="py-4 text-center text-sm text-neutral-300">没有更多了</div>
      )}
    </>
  )
}

export default NoteHistory
