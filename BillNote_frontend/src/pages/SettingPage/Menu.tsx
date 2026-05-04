import {
  BotMessageSquare,
  Captions,
  HardDriveDownload,
  Info,
  Activity,
  KeyRound,
  LogOut,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import MenuBar, { IMenuProps } from '@/pages/SettingPage/components/menuBar.tsx'
import { clearToken } from '@/services/auth'

const Menu = () => {
  const navigate = useNavigate()

  const handleLogout = () => {
    clearToken()
    navigate('/login', { replace: true })
  }

  const menuList: IMenuProps[] = [
    {
      id: 'model',
      name: 'AI 模型设置',
      icon: <BotMessageSquare />,
      path: '/settings/model',
    },
    {
      id: 'transcriber',
      name: '音频转写配置',
      icon: <Captions />,
      path: '/settings/transcriber',
    },
    {
      id: 'download',
      name: '下载配置',
      icon: <HardDriveDownload />,
      path: '/settings/download',
    },
    // //其他配置
    // {
    //   id: 'prompt',
    //   name: '提示词设置',
    //   icon: <SquareChevronRight />,
    //   path: '/settings/prompt',
    // },
    {
      id: 'monitor',
      name: '部署监控',
      icon: <Activity />,
      path: '/settings/monitor',
    },
    {
      id: 'about',
      name: '关于',
      icon: <Info />,
      path: '/settings/about',
    },
    {
      id: 'change-password',
      name: '修改密码',
      icon: <KeyRound />,
      path: '/settings/change-password',
    },
    // {
    //   id: 'other',
    //   name: '其他配置',
    //   icon: <Wrench />,
    //   path: '/settings/other',
    // },
  ]
  return (
    <div className="flex h-full flex-col">
      <div className={'flex w-full flex-col gap-2'}>
        <div className="text-2xl font-medium">设置</div>
        <div className="text-sm font-light text-gray-800">全局配置与模型设置</div>
      </div>
      <div className="mt-6 flex-1">
        {menuList &&
          menuList.map(item => {
            return <MenuBar key={item.id} menuItem={item} />
          })}
        <div
          onClick={handleLogout}
          className="flex h-12 w-full cursor-pointer items-center gap-1 rounded px-2 text-red-500 hover:bg-[#F0F0F0]"
        >
          <div className="h-6 w-6">
            <LogOut className="h-5 w-5" />
          </div>
          <div className="text-[16px]">退出登录</div>
        </div>
      </div>
    </div>
  )
}
export default Menu
