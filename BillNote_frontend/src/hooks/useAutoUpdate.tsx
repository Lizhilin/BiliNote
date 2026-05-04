import { useEffect, useRef } from 'react'
import toast from 'react-hot-toast'

const CHECK_INTERVAL = 30000
const SCRIPT_REGEX = /<script[^>]+src=["']([^"']+)["']/g

function getCurrentScripts(): string[] {
  return Array.from(document.querySelectorAll('script[src]')).map(s => (s as HTMLScriptElement).src)
}

async function fetchLatestScripts(): Promise<string[]> {
  const res = await fetch('/?t=' + Date.now())
  const html = await res.text()
  const urls: string[] = []
  let match: RegExpExecArray | null
  while ((match = SCRIPT_REGEX.exec(html)) !== null) {
    urls.push(match[1])
  }
  return urls
}

function hasChanged(current: string[], latest: string[]): boolean {
  if (current.length !== latest.length) return true
  return current.some((url, i) => {
    const a = url.split('/').pop() || url
    const b = latest[i].split('/').pop() || latest[i]
    return a !== b
  })
}

export function useAutoUpdate() {
  const scriptsRef = useRef<string[]>([])

  useEffect(() => {
    scriptsRef.current = getCurrentScripts()
    if (scriptsRef.current.length === 0) return

    const timer = setInterval(async () => {
      try {
        const latest = await fetchLatestScripts()
        if (hasChanged(scriptsRef.current, latest)) {
          clearInterval(timer)
          toast.custom(
            t => (
              <div
                className="flex items-center gap-4 rounded-lg border border-neutral-200 bg-white px-4 py-3 shadow-lg dark:border-neutral-700 dark:bg-neutral-800"
              >
                <span className="text-sm text-neutral-800 dark:text-neutral-200">
                  发现新版本
                </span>
                <button
                  onClick={() => {
                    toast.dismiss(t.id)
                    window.location.reload()
                  }}
                  className="rounded-md bg-primary px-3 py-1 text-sm text-white hover:bg-primary/90"
                >
                  刷新
                </button>
              </div>
            ),
            { duration: Infinity }
          )
        }
      } catch {
        // 忽略 fetch 失败，下次再试
      }
    }, CHECK_INTERVAL)

    return () => clearInterval(timer)
  }, [])
}
