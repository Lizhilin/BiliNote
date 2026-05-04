import request from '@/utils/request'

const TOKEN_KEY = 'auth_token'

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token)
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY)
}

export async function login(username: string, password: string) {
  const res = await request.post('/auth/login', { username, password })
  return res as unknown as { token: string; username: string }
}

export async function checkAuth() {
  const res = await request.get('/auth/me')
  return res as unknown as { username: string; id: number }
}

export async function changePassword(oldPassword: string, newPassword: string) {
  const res = await request.post('/auth/change-password', { old_password: oldPassword, new_password: newPassword })
  return res as unknown as { msg: string }
}
