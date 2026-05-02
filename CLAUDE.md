# BiliNote AI Agent Map
> 给 AI 快速定位用的结构索引，不是给人看的文档

## 架构概览
Monorepo: 前端(React/Vite) + 后端(FastAPI) + Nginx，Docker Compose 部署

## 前端 BillNote_frontend/

### 入口与路由
- src/main.tsx → 挂载 App
- src/App.tsx → 路由定义 (/ → HomePage, /settings → SettingPage)
- src/pages/HomePage/Home.tsx → 主页面，useIsMobile 切换桌面/移动布局
- src/pages/SettingPage/ → 设置页（模型/API Key/提示词等）

### 布局 (src/layouts/)
- HomeLayout.tsx → 桌面端：ResizablePanelGroup 三栏 (NoteForm 23% | History 16% | Preview 61%)
- MobileHomeLayout.tsx → 移动端：三面板状态机 history/add/detail，CSS transform 滑入

### 状态管理 (src/store/)
- taskStore/ → 核心：tasks列表、currentTaskId、SSE轮询、CRUD操作
- configStore/ → 全局配置
- modelStore/ → 模型列表
- providerStore/ → AI Provider配置
- chatStore/ → 聊天问答

### API服务 (src/services/)
- note.ts → 笔记CRUD、SSE状态推送
- chat.ts → 聊天问答
- model.ts → 模型管理
- system.ts → 系统状态

### 主页组件 (src/pages/HomePage/components/)
- NoteForm.tsx → 输入表单(链接/模型/风格/参数)
- History.tsx → 历史列表容器
- NoteHistory.tsx → 历史条目渲染(搜索/删除/选中)
- MarkdownViewer.tsx → 笔记预览(核心大组件，含ReactMarkdown/版本切换/聊天)
- MarkdownHeader.tsx → 预览区工具栏(复制/下载/版本/聊天/转写)
- StepBar.tsx → 生成进度步骤条
- VideoBanner.tsx → 视频封面信息条
- ChatPanel.tsx → AI问答侧栏
- TranscriptViewer.tsx → 转写文本查看
- MarkmapComponent.tsx → 思维导图

### 工具与常量
- src/hooks/useIsMobile.ts → 768px断点响应式检测
- src/constant/note.ts → 笔记风格列表
- src/components/ui/ → shadcn/ui 组件库
- src/components/LazyImage.tsx → 懒加载图片(IntersectionObserver)
- src/components/Lottie/ → Lottie 动画(idle/loading/error)

### 构建与部署
- vite.config.ts → Vite配置，proxy /api → 后端
- index.html → HTML入口
- deploy/default.conf → Nginx配置模板
- Dockerfile → 前端容器构建

## 后端 backend/

### 入口
- main.py → FastAPI app 创建，挂载路由，生命周期管理

### 路由 (app/routers/)
- note.py → 核心路由：/api/notes (CRUD/SSE/重试/版本管理)
- chat.py → /api/chat 问答
- config.py → /api/config 全局配置
- model.py → /api/models 模型管理
- provider.py → /api/providers AI Provider管理

### 服务层 (app/services/) — 业务逻辑
- note.py → 核心业务：笔记生成全流程(解析→下载→转写→摘要→保存)，SSE推送，_with_retry重试
- chat_service.py → 聊天问答服务
- chat_tools.py → 聊天工具函数
- provider.py → Provider管理
- model.py → 模型管理
- cookie_manager.py → Cookie管理(跨子域名)
- vector_store.py → 向量存储(RAG)
- task_serial_executor.py → 任务串行执行器
- transcriber_config_manager.py → 转写器配置

### 下载器 (app/downloaders/) — 视频音频下载
- base.py → 下载器基类
- bilibili_downloader.py → B站下载(yt-dlp + cookiefile)，含超时重试
- youtube_downloader.py → YouTube下载
- douyin_downloader.py → 抖音下载
- kuaishou_downloader.py → 快手下载
- local_downloader.py → 本地文件上传
- youtube_subtitle.py → YouTube字幕提取

### GPT/AI (app/gpt/) — LLM集成
- gpt_factory.py → 工厂方法，按provider创建实例
- universal_gpt.py → 通用LLM调用(支持OpenAI兼容API)
- openai_gpt.py / deepseek_gpt.py / qwen_gpt.py → 各厂商适配
- prompt_builder.py → 提示词构建(风格/语言/章节)
- prompt.py → 提示词模板
- request_chunker.py → 长文本分块处理

### 转写 (app/transcriber/) — 语音转文字
- whisper相关 → faster-whisper/whisper模型推理

### 数据层
- app/db/ → SQLAlchemy模型+CRUD（Note/Chat/Config等）
- app/models/ → Pydantic请求/响应模型
- app/enmus/ → 枚举(任务状态等)
- app/validators/ → 请求校验
- app/exceptions/ → 自定义异常
- app/utils/ → 工具函数(文件/时间/代理等)
- app/decorators/ → 装饰器(日志等)

### 配置与数据
- config/downloader.json → 下载器配置
- .env / .env.example → 环境变量
- data/ → 运行时数据(note_results/视频帧等)

## 部署
- 详尽部署指南 → [服务器部署指南.md](./服务器部署指南.md)
- docker-compose.yml → 三容器：bilinote-backend + bilinote-frontend + bilinote-nginx
- 服务器: 10.3.104.112

## 关键数据流
1. 用户提交链接 → NoteForm → POST /api/notes
2. 后端创建任务 → SSE推送状态 → 前端taskStore轮询
3. 下载→转写→GPT摘要→保存 → 状态变为SUCCESS
4. 前端MarkdownViewer渲染结果，支持多版本切换
