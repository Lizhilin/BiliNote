import NoteHistory from '@/pages/HomePage/components/NoteHistory.tsx'
import { useTaskStore } from '@/store/taskStore'
import { Clock } from 'lucide-react'
const History = () => {
  const currentTaskId = useTaskStore(state => state.currentTaskId)
  const setCurrentTask = useTaskStore(state => state.setCurrentTask)
  return (
    <div className={'flex w-full flex-col gap-2 px-1 py-1'}>
      {/*生成历史*/}
      <div className="flex h-[40px] items-center gap-2">
        <Clock className="h-4 w-4 text-neutral-500" />
        <h2 className="text-base font-medium text-neutral-900">生成历史</h2>
      </div>
      <NoteHistory onSelect={setCurrentTask} selectedId={currentTaskId} />
    </div>
  )
}

export default History
