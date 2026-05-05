import {useTaskStore} from '@/store/taskStore'
import {cn} from '@/lib/utils.ts'
import {Loader2, Trash, X} from 'lucide-react'
import {Button} from '@/components/ui/button.tsx'

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip.tsx'
import LazyImage from "@/components/LazyImage.tsx";
import {FC, useState, useEffect, useCallback, useRef} from 'react'

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
  const [search, setSearch] = useState('')
  const [isComposing, setIsComposing] = useState(false)
  const sentinelRef = useRef<HTMLDivElement>(null)
  const isInitialMount = useRef(true)

  // 搜索时请求第 1 页（初始 mount 跳过，由 Home.tsx 负责首次加载）
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false
      return
    }
    if (isComposing) return
    const timer = setTimeout(() => {
      fetchHistory(1, search)
    }, 300)
    return () => clearTimeout(timer)
  }, [search, isComposing])

  const loadMore = useCallback(() => {
    if (isLoadingHistory || !historyHasMore) return
    fetchHistory(historyPage + 1, search)
  }, [isLoadingHistory, historyHasMore, historyPage, fetchHistory, search])

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

  if (historyPage === 0) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-neutral-400 dark:text-neutral-500" />
      </div>
    )
  }

  const successTasks = tasks.filter(t => t.status === 'SUCCESS')

  return (
    <>
      {/* 搜索输入框 - 始终在同一个位置渲染，避免失焦 */}
      <div className="relative mb-2">
        <input
            type="text"
            placeholder="搜索笔记标题..."
            className="w-full rounded border border-neutral-300 px-3 py-1 pr-7 text-sm outline-none focus:border-primary dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-200"
            value={search}
            onChange={e => setSearch(e.target.value)}
            onCompositionStart={() => setIsComposing(true)}
            onCompositionEnd={e => {
              setIsComposing(false)
              setSearch((e.target as HTMLInputElement).value)
            }}
        />
        {search && (
          <button
            type="button"
            onClick={() => setSearch('')}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {successTasks.length > 0 ? (
        <>
          <div className="flex flex-col gap-2">
            {successTasks.map(task => (
              <div
                key={task.id}
                onClick={() => onSelect(task.id)}
                className={cn(
                  'flex cursor-pointer flex-col rounded-md border border-neutral-200 p-3 dark:border-neutral-700 dark:bg-neutral-800',
                  selectedId === task.id && 'border-primary bg-primary-light dark:border-primary dark:bg-primary/20'
                )}
              >
                <div
                  className={cn('flex items-center gap-4')}
                >
                  {/* 封面图 */}
                  {task.audioMeta.cover_url ? (
                    task.audioMeta.cover_url.startsWith('http') ? (
                      <LazyImage
                        src={import.meta.env.VITE_IMAGE_PROXY_ENABLED === 'true'
                          ? `/api/image_proxy?url=${encodeURIComponent(task.audioMeta.cover_url)}`
                          : task.audioMeta.cover_url
                        }
                        alt="封面"
                        fallbackSrc={task.audioMeta.cover_url.startsWith('http')
                          ? `/api/image_proxy?url=${encodeURIComponent(task.audioMeta.cover_url)}`
                          : undefined
                        }
                      />
                    ) : (
                      <img src={task.audioMeta.cover_url} alt="封面" className="h-10 w-12 rounded-md object-cover" />
                    )
                  ) : (
                    <div className="flex h-10 w-12 shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-indigo-100 to-purple-200 dark:from-indigo-900/60 dark:to-purple-900/60">
                      <svg className="h-5 w-5 text-indigo-400 dark:text-indigo-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                      </svg>
                    </div>
                  )}

                  {/* 标题 + 状态 */}

                  <div className="flex w-full items-center justify-between gap-2">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="line-clamp-2 flex-1 overflow-hidden text-sm text-ellipsis text-neutral-900 dark:text-neutral-100">
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
                            size="sm"
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

          {/* 没有更多 */}
          {!historyHasMore && historyPage > 0 && (
            <div className="py-4 text-center text-sm text-neutral-300 dark:text-neutral-600">没有更多了</div>
          )}
        </>
      ) : isLoadingHistory ? (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="h-5 w-5 animate-spin text-neutral-400 dark:text-neutral-500" />
          <span className="ml-2 text-sm text-neutral-400 dark:text-neutral-500">加载中…</span>
        </div>
      ) : (
        <div className="rounded-md border border-neutral-200 bg-neutral-50 py-6 text-center dark:border-neutral-700 dark:bg-neutral-800">
          <p className="text-sm text-neutral-500 dark:text-neutral-400">暂无记录</p>
        </div>
      )}
    </>
  )
}

export default NoteHistory
