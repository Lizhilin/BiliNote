import { FC, useEffect, useState, lazy, Suspense } from 'react'
import HomeLayout from '@/layouts/HomeLayout.tsx'
import MobileHomeLayout from '@/layouts/MobileHomeLayout.tsx'
import NoteForm from '@/pages/HomePage/components/NoteForm.tsx'
import { useTaskStore } from '@/store/taskStore'
import History from '@/pages/HomePage/components/History.tsx'
import { useIsMobile } from '@/hooks/useIsMobile.ts'
import StepBar from '@/pages/HomePage/components/StepBar.tsx'

const MarkdownViewer = lazy(() => import('@/pages/HomePage/components/MarkdownViewer.tsx'))

type ViewStatus = 'idle' | 'loading' | 'success' | 'failed'

const steps = [
  { label: '解析链接', key: 'PARSING' },
  { label: '下载音频', key: 'DOWNLOADING' },
  { label: '转写文字', key: 'TRANSCRIBING' },
  { label: '总结内容', key: 'SUMMARIZING' },
  { label: '保存完成', key: 'SUCCESS' },
]

function PreviewPanel({ status, taskStatus }: { status: ViewStatus; taskStatus?: string }) {
  if (status === 'idle') {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center space-y-3 text-neutral-500 dark:text-neutral-400">
        <div className="text-center">
          <p className="text-lg font-bold dark:text-neutral-300">输入视频链接并点击"生成笔记"</p>
          <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">支持哔哩哔哩、YouTube 、抖音等视频平台</p>
        </div>
      </div>
    )
  }
  if (status === 'loading') {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center space-y-4 text-neutral-500 dark:text-neutral-400">
        <StepBar steps={steps} currentStep={taskStatus || 'PENDING'} />
        <div className="text-center text-sm">
          <p className="text-lg font-bold dark:text-neutral-300">正在生成笔记，请稍候…</p>
          <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">这可能需要几秒钟时间，取决于视频长度</p>
        </div>
      </div>
    )
  }
  return (
    <Suspense fallback={
      <div className="flex h-full w-full items-center justify-center text-sm text-neutral-400">加载中…</div>
    }>
      <MarkdownViewer status={status} />
    </Suspense>
  )
}

export const HomePage: FC = () => {
  const tasks = useTaskStore(state => state.tasks)
  const currentTaskId = useTaskStore(state => state.currentTaskId)
  const fetchHistory = useTaskStore(state => state.fetchHistory)
  const historyPage = useTaskStore(state => state.historyPage)

  useEffect(() => {
    if (historyPage === 0) fetchHistory(1)
  }, [])

  const currentTask = tasks.find(t => t.id === currentTaskId)

  const [status, setStatus] = useState<ViewStatus>('idle')

  useEffect(() => {
    if (!currentTask) {
      setStatus('idle')
    } else if (currentTask.status === 'SUCCESS') {
      setStatus('success')
    } else if (currentTask.status === 'FAILED') {
      setStatus('failed')
    } else {
      setStatus('loading')
    }
  }, [currentTask, currentTask?.status])

  const isMobile = useIsMobile()
  const Layout = isMobile ? MobileHomeLayout : HomeLayout

  return (
    <Layout
      NoteForm={<NoteForm />}
      Preview={<PreviewPanel status={status} taskStatus={currentTask?.status} />}
      History={<History />}
    />
  )
}
