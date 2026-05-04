# app/routers/note.py
import json
import os
import uuid
from datetime import datetime
from pathlib import Path
from typing import Optional
from urllib.parse import urlparse

from fastapi import APIRouter, HTTPException, BackgroundTasks, UploadFile, File, Query
from pydantic import BaseModel, validator, field_validator
from dataclasses import asdict

from app.db.video_task_dao import get_task_by_video, delete_task_by_video, insert_video_task
from app.db.engine import get_db
from app.db.models.video_tasks import VideoTask
from app.enmus.note_enums import DownloadQuality
from app.exceptions.note import NoteError
from app.services.note import NoteGenerator, logger
from app.services.task_serial_executor import task_serial_executor
from app.utils.response import ResponseWrapper as R
from app.utils.url_parser import extract_video_id
from app.validators.video_url_validator import is_supported_video_url
from fastapi import APIRouter, Request, HTTPException
from fastapi.responses import StreamingResponse
import httpx
from app.enmus.task_status_enums import TaskStatus

# from app.services.downloader import download_raw_audio
# from app.services.whisperer import transcribe_audio

router = APIRouter()


class RecordRequest(BaseModel):
    video_id: str
    platform: str


class DeleteRequest(BaseModel):
    task_id: str


class VideoRequest(BaseModel):
    video_url: str
    platform: str
    quality: DownloadQuality
    screenshot: Optional[bool] = False
    link: Optional[bool] = False
    model_name: str
    provider_id: str
    task_id: Optional[str] = None
    format: Optional[list] = []
    style: str = None
    extras: Optional[str]=None
    video_understanding: Optional[bool] = False
    video_interval: Optional[int] = 0
    grid_size: Optional[list] = []

    @field_validator("video_url")
    def validate_supported_url(cls, v):
        url = str(v)
        parsed = urlparse(url)
        if parsed.scheme in ("http", "https"):
            # 是网络链接，继续用原有平台校验
            if not is_supported_video_url(url):
                raise NoteError(code=NoteErrorEnum.PLATFORM_NOT_SUPPORTED.code,
                                message=NoteErrorEnum.PLATFORM_NOT_SUPPORTED.message)

        return v


NOTE_OUTPUT_DIR = os.getenv("NOTE_OUTPUT_DIR", "note_results")
UPLOAD_DIR = "uploads"


def save_note_to_file(task_id: str, note):
    os.makedirs(NOTE_OUTPUT_DIR, exist_ok=True)
    with open(os.path.join(NOTE_OUTPUT_DIR, f"{task_id}.json"), "w", encoding="utf-8") as f:
        json.dump(asdict(note), f, ensure_ascii=False, indent=2)


def run_note_task(task_id: str, video_url: str, platform: str, quality: DownloadQuality,
                  link: bool = False, screenshot: bool = False, model_name: str = None, provider_id: str = None,
                  _format: list = None, style: str = None, extras: str = None, video_understanding: bool = False,
                  video_interval=0, grid_size=[]
                  ):

    if not model_name or not provider_id:
        raise HTTPException(status_code=400, detail="请选择模型和提供者")

    def _execute_note_task():
        return NoteGenerator().generate(
            video_url=video_url,
            platform=platform,
            quality=quality,
            task_id=task_id,
            model_name=model_name,
            provider_id=provider_id,
            link=link,
            _format=_format,
            style=style,
            extras=extras,
            screenshot=screenshot,
            video_understanding=video_understanding,
            video_interval=video_interval,
            grid_size=grid_size,
        )

    logger.info(f"任务进入执行队列 (task_id={task_id})")
    note = task_serial_executor.run(_execute_note_task)
    logger.info(f"Note generated: {task_id}")
    if not note or not note.markdown:
        logger.warning(f"任务 {task_id} 执行失败，跳过保存")
        return
    save_note_to_file(task_id, note)

    # 自动建立向量索引（用于 AI 问答），失败不影响笔记生成
    try:
        from app.services.vector_store import VectorStoreManager
        VectorStoreManager().index_task(task_id)
    except Exception as e:
        logger.warning(f"向量索引失败（不影响笔记）: {e}")


@router.post('/delete_task')
def delete_task(data: DeleteRequest):
    try:
        task_id = data.task_id

        # 删除 note_results 下的所有相关文件
        deleted = 0
        for f in os.listdir(NOTE_OUTPUT_DIR):
            if f.startswith(task_id):
                os.remove(os.path.join(NOTE_OUTPUT_DIR, f))
                deleted += 1

        # 从数据库删除
        db = next(get_db())
        try:
            db.query(VideoTask).filter_by(task_id=task_id).delete()
            db.commit()
        finally:
            db.close()

        logger.info(f"删除任务成功: task_id={task_id}, 删除{deleted}个文件")
        return R.success(msg='删除成功')
    except Exception as e:
        logger.error(f"删除任务失败: {e}")
        return R.error(msg=str(e))


@router.post("/upload")
async def upload(file: UploadFile = File(...)):
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    file_location = os.path.join(UPLOAD_DIR, file.filename)

    with open(file_location, "wb+") as f:
        f.write(await file.read())

    # 假设你静态目录挂载了 /uploads
    return R.success({"url": f"/uploads/{file.filename}"})


@router.post("/generate_note")
def generate_note(data: VideoRequest, background_tasks: BackgroundTasks):
    try:

        video_id = extract_video_id(data.video_url, data.platform)
        # if not video_id:
        #     raise HTTPException(status_code=400, detail="无法提取视频 ID")
        # existing = get_task_by_video(video_id, data.platform)
        # if existing:
        #     return R.error(
        #         msg='笔记已生成，请勿重复发起',
        #
        #     )
        if data.task_id:
            # 如果传了task_id，说明是重试！
            task_id = data.task_id
            logger.info(f"重试模式，复用已有 task_id={task_id}")
        else:
            # 正常新建任务
            task_id = str(uuid.uuid4())

        # 统一先写入 PENDING，表示已进入队列等待串行执行
        NoteGenerator()._update_status(task_id, TaskStatus.PENDING)

        background_tasks.add_task(run_note_task, task_id, data.video_url, data.platform, data.quality, data.link,
                                  data.screenshot, data.model_name, data.provider_id, data.format, data.style,
                                  data.extras, data.video_understanding, data.video_interval, data.grid_size)
        return R.success({"task_id": task_id})
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/task_status/{task_id}")
def get_task_status(task_id: str):
    status_path = os.path.join(NOTE_OUTPUT_DIR, f"{task_id}.status.json")
    result_path = os.path.join(NOTE_OUTPUT_DIR, f"{task_id}.json")

    # 优先读状态文件
    if os.path.exists(status_path):
        with open(status_path, "r", encoding="utf-8") as f:
            status_content = json.load(f)

        status = status_content.get("status")
        message = status_content.get("message", "")

        if status == TaskStatus.SUCCESS.value:
            # 成功状态的话，继续读取最终笔记内容
            if os.path.exists(result_path):
                with open(result_path, "r", encoding="utf-8") as rf:
                    result_content = json.load(rf)
                return R.success({
                    "status": status,
                    "result": result_content,
                    "message": message,
                    "task_id": task_id
                })
            else:
                # 理论上不会出现，保险处理
                return R.success({
                    "status": TaskStatus.PENDING.value,
                    "message": "任务完成，但结果文件未找到",
                    "task_id": task_id
                })

        if status == TaskStatus.FAILED.value:
            return R.error(message or "任务失败", code=500)

        # 处理中状态
        return R.success({
            "status": status,
            "message": message,
            "task_id": task_id
        })

    # 没有状态文件，但有结果
    if os.path.exists(result_path):
        with open(result_path, "r", encoding="utf-8") as f:
            result_content = json.load(f)
        return R.success({
            "status": TaskStatus.SUCCESS.value,
            "result": result_content,
            "task_id": task_id
        })

    # 什么都没有，默认PENDING
    return R.success({
        "status": TaskStatus.PENDING.value,
        "message": "任务排队中",
        "task_id": task_id
    })


@router.get("/task_history")
def get_task_history(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: str = Query("", max_length=100),
):
    """获取历史笔记列表（分页），支持按标题搜索"""
    if not os.path.isdir(NOTE_OUTPUT_DIR):
        return R.success({"items": [], "total": 0, "page": page, "page_size": page_size, "has_more": False})

    # ① 收集所有有效文件及 mtime
    entries: list[tuple[str, float]] = []
    for fname in os.listdir(NOTE_OUTPUT_DIR):
        if not (fname.endswith(".json") and not fname.endswith("_audio.json")
                and not fname.endswith("_transcript.json")
                and not fname.endswith(".status.json")):
            continue
        fpath = os.path.join(NOTE_OUTPUT_DIR, fname)
        try:
            mtime = os.path.getmtime(fpath)
            entries.append((fname, mtime))
        except OSError:
            continue

    # ② 按 mtime 降序
    entries.sort(key=lambda x: x[1], reverse=True)

    # ③ 读取所有条目，按标题搜索过滤，再分页
    all_items = []
    for fname, mtime in entries:
        task_id = fname.replace(".json", "")
        try:
            with open(os.path.join(NOTE_OUTPUT_DIR, fname), "r", encoding="utf-8") as f:
                data = json.load(f)
            audio_meta = data.get("audio_meta", {})
            title = audio_meta.get("title", "")

            # 搜索过滤（大小写不敏感）
            if search:
                if search.lower() not in title.lower():
                    continue

            status_path = os.path.join(NOTE_OUTPUT_DIR, f"{task_id}.status.json")
            status = "UNKNOWN"
            if os.path.exists(status_path):
                with open(status_path, "r", encoding="utf-8") as f:
                    st = json.load(f)
                status = st.get("status", "UNKNOWN")
            created_at = datetime.fromtimestamp(mtime).isoformat()
            all_items.append({
                "task_id": task_id,
                "title": title,
                "platform": audio_meta.get("platform", ""),
                "video_id": audio_meta.get("video_id", ""),
                "cover_url": audio_meta.get("cover_url", ""),
                "status": status,
                "created_at": created_at,
                "markdown": data.get("markdown", ""),
            })
        except Exception as e:
            logger.warning(f"读取历史笔记 {fname} 失败: {e}")
            continue

    total = len(all_items)
    has_more = page * page_size < total
    start = (page - 1) * page_size
    page_items = all_items[start: start + page_size]

    return R.success({
        "items": page_items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "has_more": has_more,
    })


@router.get("/task_detail/{task_id}")
def get_task_detail(task_id: str):
    """获取单条笔记的完整内容"""
    result_path = os.path.join(NOTE_OUTPUT_DIR, f"{task_id}.json")
    if not os.path.exists(result_path):
        return R.error("笔记不存在", code=404)
    try:
        with open(result_path, "r", encoding="utf-8") as f:
            data = json.load(f)
        return R.success(data)
    except Exception as e:
        return R.error(str(e), code=500)


@router.get("/image_proxy")
async def image_proxy(request: Request, url: str):
    headers = {
        "Referer": "https://www.bilibili.com/",
        "User-Agent": request.headers.get("User-Agent", ""),
    }

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(url, headers=headers)

            if resp.status_code != 200:
                raise HTTPException(status_code=resp.status_code, detail="图片获取失败")

            content_type = resp.headers.get("Content-Type", "image/jpeg")
            return StreamingResponse(
                resp.aiter_bytes(),
                media_type=content_type,
                headers={
                    "Cache-Control": "public, max-age=86400",  #  缓存一天
                    "Content-Type": content_type,
                }
            )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
