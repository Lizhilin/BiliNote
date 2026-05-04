import { useState, FormEvent } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { LogIn, KeyRound } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { login, setToken, changePassword } from '@/services/auth'
import toast from 'react-hot-toast'
import logo from '/icon.svg'

export default function LoginPage() {
  const location = useLocation()
  const isChangePassword = location.pathname.includes('/change-password')

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await login(username, password)
      setToken(res.token)
      toast.success('登录成功')
      navigate('/', { replace: true })
    } catch {
      // 错误 toast 由 request.ts 拦截器统一处理
    } finally {
      setLoading(false)
    }
  }

  const handleChangePassword = async (e: FormEvent) => {
    e.preventDefault()
    if (newPassword !== confirmPassword) {
      toast.error('两次输入的新密码不一致')
      return
    }
    if (newPassword.length < 6) {
      toast.error('新密码至少 6 位')
      return
    }
    setLoading(true)
    try {
      await changePassword(password, newPassword)
      toast.success('密码修改成功')
      navigate('/settings/about', { replace: true })
    } catch {
      // 错误 toast 由 request.ts 拦截器统一处理
    } finally {
      setLoading(false)
    }
  }

  if (isChangePassword) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-neutral-50 to-neutral-100 dark:from-neutral-950 dark:to-neutral-900">
        <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-lg dark:bg-neutral-800">
          <div className="mb-8 flex flex-col items-center gap-3">
            <img src={logo} alt="logo" className="h-14 w-14 rounded-xl" />
            <h1 className="text-xl font-bold text-neutral-800 dark:text-neutral-100">修改密码</h1>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">输入旧密码和新密码</p>
          </div>

          <form onSubmit={handleChangePassword} className="flex flex-col gap-4">
            <input
              type="password"
              placeholder="旧密码"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="h-10 rounded-lg border border-neutral-300 bg-white px-3 text-sm outline-none transition-colors focus:border-blue-500 dark:border-neutral-600 dark:bg-neutral-700 dark:text-neutral-100"
              autoFocus
              required
            />
            <input
              type="password"
              placeholder="新密码"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              className="h-10 rounded-lg border border-neutral-300 bg-white px-3 text-sm outline-none transition-colors focus:border-blue-500 dark:border-neutral-600 dark:bg-neutral-700 dark:text-neutral-100"
              required
            />
            <input
              type="password"
              placeholder="确认新密码"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              className="h-10 rounded-lg border border-neutral-300 bg-white px-3 text-sm outline-none transition-colors focus:border-blue-500 dark:border-neutral-600 dark:bg-neutral-700 dark:text-neutral-100"
              required
            />
            <Button type="submit" disabled={loading} className="h-10 w-full gap-2">
              <KeyRound className="h-4 w-4" />
              {loading ? '修改中…' : '修改密码'}
            </Button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-neutral-50 to-neutral-100 dark:from-neutral-950 dark:to-neutral-900">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-lg dark:bg-neutral-800">
        <div className="mb-8 flex flex-col items-center gap-3">
          <img src={logo} alt="logo" className="h-14 w-14 rounded-xl" />
          <h1 className="text-xl font-bold text-neutral-800 dark:text-neutral-100">BiliNote</h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">请登录以继续</p>
        </div>

        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          <input
            type="text"
            placeholder="用户名"
            value={username}
            onChange={e => setUsername(e.target.value)}
            className="h-10 rounded-lg border border-neutral-300 bg-white px-3 text-sm outline-none transition-colors focus:border-blue-500 dark:border-neutral-600 dark:bg-neutral-700 dark:text-neutral-100"
            autoFocus
            required
          />
          <input
            type="password"
            placeholder="密码"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="h-10 rounded-lg border border-neutral-300 bg-white px-3 text-sm outline-none transition-colors focus:border-blue-500 dark:border-neutral-600 dark:bg-neutral-700 dark:text-neutral-100"
            required
          />
          <Button type="submit" disabled={loading} className="h-10 w-full gap-2">
            <LogIn className="h-4 w-4" />
            {loading ? '登录中…' : '登录'}
          </Button>
        </form>
      </div>
    </div>
  )
}
