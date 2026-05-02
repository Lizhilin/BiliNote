import React, { FC, useState, useEffect } from 'react'
import { Plus, ArrowLeft, SlidersHorizontal } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useTaskStore } from '@/store/taskStore'
import { useModelStore } from '@/store/modelStore'
import logo from '@/assets/icon.svg'

type MobilePanel = 'history' | 'add' | 'detail'

interface IProps {
  NoteForm: React.ReactNode
  Preview: React.ReactNode
  History: React.ReactNode
}

const MobileHomeLayout: FC<IProps> = ({ NoteForm, Preview, History }) => {
  const [activePanel, setActivePanel] = useState<MobilePanel>('history')
  const currentTaskId = useTaskStore(state => state.currentTaskId)
  const tasks = useTaskStore(state => state.tasks)
  const setCurrentTask = useTaskStore(state => state.setCurrentTask)

  const loadEnabledModels = useModelStore(s => s.loadEnabledModels)

  // 切到添加面板时刷新模型列表
  useEffect(() => {
    if (activePanel === 'add') {
      loadEnabledModels()
    }
  }, [activePanel])

  // 当选中任务时自动打开详情面板
  useEffect(() => {
    if (currentTaskId) {
      setActivePanel('detail')
    }
  }, [currentTaskId])

  const currentTask = tasks.find(t => t.id === currentTaskId)
  const isGenerating = currentTask && !['SUCCESS', 'FAILED', undefined].includes(currentTask?.status)

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-white" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      {/* ========== 历史列表面板 (默认) ========== */}
      <div
        className={`absolute inset-0 z-10 flex flex-col bg-white transition-transform duration-300 ease-in-out ${
          activePanel === 'history' ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* 顶栏 */}
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-neutral-100 px-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-xl">
              <img src={logo} alt="logo" className="h-full w-full object-contain" />
            </div>
            <div className="text-xl font-bold text-gray-800">Note</div>
          </div>
          <Link to="/settings" className="rounded-lg p-2 hover:bg-neutral-100">
            <SlidersHorizontal className="h-5 w-5 text-neutral-500" />
          </Link>
        </header>

        {/* 历史列表 - 用原生滚动替代 ScrollArea，移动端触摸更流畅 */}
        <div className="flex-1 overflow-y-auto overscroll-contain">
          <div className="px-4 py-3">{History}</div>
        </div>
      </div>

      {/* 悬浮添加按钮 (外层定位，避免被面板裁切) */}
      <button
        onClick={() => setActivePanel('add')}
        className={`absolute bottom-8 right-6 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-white shadow-lg shadow-primary/30 transition-all active:scale-95 ${
          activePanel === 'history' ? 'translate-y-0 opacity-100' : 'translate-y-20 opacity-0 pointer-events-none'
        }`}
      >
        <Plus className="h-7 w-7" />
      </button>

      {/* ========== 添加面板 (左→右滑入) ========== */}
      <div
        className={`absolute inset-0 z-20 flex flex-col bg-white transition-transform duration-300 ease-in-out ${
          activePanel === 'add' ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* 顶栏 */}
        <header className="flex h-14 shrink-0 items-center gap-3 border-b border-neutral-100 px-4">
          <button
            onClick={() => setActivePanel('history')}
            className="rounded-lg p-2 hover:bg-neutral-100"
          >
            <ArrowLeft className="h-5 w-5 text-neutral-600" />
          </button>
          <h1 className="text-lg font-semibold text-gray-800">添加笔记</h1>
        </header>

        {/* 表单 - 用原生滚动替代 ScrollArea */}
        <div className="flex-1 overflow-y-auto overscroll-contain">
          <div className="p-4">{NoteForm}</div>
        </div>
      </div>

      {/* ========== 详情面板 (右→左滑入) ========== */}
      <div
        className={`absolute inset-0 z-20 flex flex-col bg-white transition-transform duration-300 ease-in-out ${
          activePanel === 'detail' ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* 顶栏 */}
        <header className="flex h-14 shrink-0 items-center gap-3 border-b border-neutral-100 px-4">
          <button
            onClick={() => {
              setCurrentTask(null)
              setActivePanel('history')
            }}
            className="rounded-lg p-2 hover:bg-neutral-100"
          >
            <ArrowLeft className="h-5 w-5 text-neutral-600" />
          </button>
          <h1 className="flex-1 truncate text-lg font-semibold text-gray-800">
            {isGenerating ? '生成中…' : currentTask?.audioMeta?.title || '笔记详情'}
          </h1>
        </header>

        {/* 内容 */}
        <div className="flex-1 overflow-hidden">
          {Preview}
        </div>
      </div>
    </div>
  )
}

export default MobileHomeLayout
