import { create } from 'zustand'
import { delete_task, generateNote, getTaskHistory, getTaskDetail, getTaskTranscript } from '@/services/note.ts'
import { v4 as uuidv4 } from 'uuid'
import toast from 'react-hot-toast'


export type TaskStatus = 'PENDING' | 'RUNNING' | 'SUCCESS' | 'FAILED'

export interface AudioMeta {
  cover_url: string
  duration: number
  file_path: string
  platform: string
  raw_info: unknown
  title: string
  video_id: string
}

export interface Segment {
  start: number
  end: number
  text: string
}

export interface Transcript {
  full_text: string
  language: string
  raw: unknown
  segments: Segment[]
}
export interface Markdown {
  ver_id: string
  content: string
  style: string
  model_name: string
  created_at: string
}

export interface Task {
  id: string
  markdown: string|Markdown [] //为了兼容之前的笔记
  transcript: Transcript
  status: TaskStatus
  audioMeta: AudioMeta
  createdAt: string
  formData: {
    video_url: string
    link: undefined | boolean
    screenshot: undefined | boolean
    platform: string
    quality: string
    model_name: string
    provider_id: string
    style: string
  }
}

interface TaskStore {
  tasks: Task[]
  currentTaskId: string | null
  historyPage: number
  historyHasMore: boolean
  isLoadingHistory: boolean
  searchKeyword: string
  addPendingTask: (taskId: string, platform: string, formData?: Record<string, unknown>) => void
  updateTaskContent: (id: string, data: Partial<Omit<Task, 'id' | 'createdAt'>>) => void
  removeTask: (id: string) => void
  clearTasks: () => void
  setCurrentTask: (taskId: string | null) => void
  getCurrentTask: () => Task | null
  retryTask: (id: string, payload?: Record<string, unknown>) => Promise<void>
  fetchHistory: (page?: number, search?: string) => Promise<void>
  fetchDetail: (taskId: string) => Promise<void>
  fetchTranscript: (taskId: string) => Promise<void>
}

export const useTaskStore = create<TaskStore>()((set, get) => ({
  tasks: [],
  currentTaskId: null,
  historyPage: 0,
  historyHasMore: false,
  isLoadingHistory: false,
  searchKeyword: '',

  addPendingTask: (taskId: string, platform: string, formData?: Record<string, unknown>) =>
    set(state => ({
      tasks: [
        {
          formData: (formData || {
            video_url: '',
            link: undefined,
            screenshot: undefined,
            platform: platform,
            quality: '',
            model_name: '',
            provider_id: '',
            style: '',
          }) as Task['formData'],
          id: taskId,
          status: 'PENDING' as TaskStatus,
          markdown: '',
          platform: platform,
          transcript: {
            full_text: '',
            language: '',
            raw: null,
            segments: [],
          },
          createdAt: new Date().toISOString(),
          audioMeta: {
            cover_url: '',
            duration: 0,
            file_path: '',
            platform: '',
            raw_info: null,
            title: '',
            video_id: '',
          },
        },
        ...state.tasks,
      ],
      currentTaskId: taskId,
    })),

  updateTaskContent: (id, data) =>
    set(state => ({
      tasks: state.tasks.map(task => {
        if (task.id !== id) return task

        if (task.status === 'SUCCESS' && data.status === 'SUCCESS') return task

        // 如果是 markdown 字符串，封装为版本
        if (typeof data.markdown === 'string') {
          const prev = task.markdown
          const newVersion: Markdown = {
            ver_id: `${task.id}-${uuidv4()}`,
            content: data.markdown,
            style: task.formData.style || '',
            model_name: task.formData.model_name || '',
            created_at: new Date().toISOString(),
          }

          let updatedMarkdown: Markdown[]
          if (Array.isArray(prev)) {
            updatedMarkdown = [newVersion, ...prev]
          } else {
            updatedMarkdown = [
              newVersion,
              ...(typeof prev === 'string' && prev
                  ? [{
                    ver_id: `${task.id}-${uuidv4()}`,
                    content: prev,
                    style: task.formData.style || '',
                    model_name: task.formData.model_name || '',
                    created_at: new Date().toISOString(),
                  }]
                  : []),
            ]
          }

          return {
            ...task,
            ...data,
            markdown: updatedMarkdown,
          }
        }

        return { ...task, ...data }
      }),
    })),

  getCurrentTask: () => {
    const currentTaskId = get().currentTaskId
    return get().tasks.find(task => task.id === currentTaskId) || null
  },

  retryTask: async (id: string, payload?: Record<string, unknown>) => {
    if (!id) {
      toast.error('任务不存在')
      return
    }
    const task = get().tasks.find(task => task.id === id)
    if (!task) return

    const newFormData = payload || task.formData
    await generateNote({
      ...newFormData,
      task_id: id,
      format: [],
      grid_size: [],
    } as Parameters<typeof generateNote>[0])

    set(state => ({
      tasks: state.tasks.map(t =>
          t.id === id
              ? { ...t, formData: newFormData as Task['formData'], status: 'PENDING' as TaskStatus }
              : t
      ),
    }))
  },

  removeTask: async (id: string) => {
    set(state => ({
      tasks: state.tasks.filter(t => t.id !== id),
      currentTaskId: state.currentTaskId === id ? null : state.currentTaskId,
    }))

    try {
      await delete_task({ task_id: id })
    } catch (e) {
      console.warn('服务端删除失败（本地已移除）:', e)
    }
  },

  clearTasks: () => set({ tasks: [], currentTaskId: null }),

  setCurrentTask: taskId => {
    set({ currentTaskId: taskId })
    // 从历史列表选中 SUCCESS 任务时懒加载详情
    if (taskId) {
      const task = get().tasks.find(t => t.id === taskId)
      if (task && task.status === 'SUCCESS' && !task.markdown) {
        get().fetchDetail(taskId)
      }
    }
  },

  fetchDetail: async (taskId: string) => {
    try {
      const res = await getTaskDetail(taskId)
      const data = res as unknown as { markdown?: string; transcript?: Transcript; audio_meta?: Record<string, unknown> }
      set(state => ({
        tasks: state.tasks.map(t =>
          t.id === taskId && t.status === 'SUCCESS'
            ? {
                ...t,
                markdown: data.markdown || '',
                transcript: data.transcript || t.transcript,
                audioMeta: data.audio_meta
                  ? {
                      ...t.audioMeta,
                      cover_url: (data.audio_meta.cover_url as string) || t.audioMeta.cover_url,
                      title: (data.audio_meta.title as string) || t.audioMeta.title,
                      platform: (data.audio_meta.platform as string) || t.audioMeta.platform,
                      video_id: (data.audio_meta.video_id as string) || t.audioMeta.video_id,
                    }
                  : t.audioMeta,
              }
            : t
        ),
      }))
    } catch (e) {
      console.warn('获取笔记详情失败:', e)
    }
  },

  fetchTranscript: async (taskId: string) => {
    try {
      const res = await getTaskTranscript(taskId)
      const transcript = res as unknown as Transcript
      if (!transcript || !transcript.segments) return
      set(state => ({
        tasks: state.tasks.map(t =>
          t.id === taskId ? { ...t, transcript } : t
        ),
      }))
    } catch (e) {
      console.warn('获取转写文本失败:', e)
    }
  },

  fetchHistory: async (page: number = 1, search: string = '') => {
    const state = get()

    // 翻页：搜索词变了就丢弃（过期并发翻页请求）
    if (page > 1 && search !== state.searchKeyword) return

    // 新搜索：重置分页并更新搜索词
    if (page === 1 && search !== state.searchKeyword) {
      set({ searchKeyword: search })
    }

    set({ isLoadingHistory: true })
    try {
      const res = await getTaskHistory(page, 20, search)

      // 请求返回时搜索词已变 → 丢弃过期结果
      if (search !== get().searchKeyword) return

      const { items, has_more } = res as unknown as {
        items: Record<string, unknown>[]
        total: number
        page: number
        page_size: number
        has_more: boolean
      }
      const historyTasks: Task[] = items.map((item: Record<string, unknown>) => ({
        id: item.task_id as string,
        platform: (item.platform as string) || '',
        markdown: '',
        status: 'SUCCESS' as TaskStatus,
        createdAt: (item.created_at as string) || new Date().toISOString(),
        audioMeta: {
          cover_url: (item.cover_url as string) || '',
          duration: 0,
          file_path: '',
          platform: (item.platform as string) || '',
          raw_info: null,
          title: (item.title as string) || '',
          video_id: (item.video_id as string) || '',
        },
        transcript: {
          full_text: '',
          language: '',
          raw: null,
          segments: [],
        },
        formData: {
          video_url: '',
          link: undefined,
          screenshot: undefined,
          platform: (item.platform as string) || '',
          quality: '',
          model_name: '',
          provider_id: '',
          style: '',
        },
      }))
      set(s => {
        const newIds = new Set(historyTasks.map(t => t.id))
        const pendingTasks = s.tasks.filter(t => t.status !== 'SUCCESS')
        if (page === 1) {
          // 第1页：替换全部历史
          return {
            tasks: [...historyTasks, ...pendingTasks],
            historyPage: page,
            historyHasMore: has_more,
            isLoadingHistory: false,
          }
        } else {
          // 第N页：追加，去重
          const existingHistory = s.tasks.filter(
            t => t.status === 'SUCCESS' && !newIds.has(t.id)
          )
          return {
            tasks: [...existingHistory, ...historyTasks, ...pendingTasks],
            historyPage: page,
            historyHasMore: has_more,
            isLoadingHistory: false,
          }
        }
      })
    } catch (e) {
      console.warn('获取历史笔记失败:', e)
      if (search === get().searchKeyword) {
        set({ isLoadingHistory: false })
      }
    }
  },
}))
