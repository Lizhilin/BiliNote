from fastapi import APIRouter, Request, HTTPException
from fastapi.responses import StreamingResponse, FileResponse
import httpx
import hashlib
import os
import asyncio
from app.utils.response import ResponseWrapper as R
from ffmpeg_helper import ensure_ffmpeg_or_raise

router = APIRouter(tags=["system"])

CACHE_DIR = "static/cover_cache"
os.makedirs(CACHE_DIR, exist_ok=True)


def _cache_path(url: str) -> tuple[str, str | None]:
    """返回 (缓存文件路径, 扩展名)"""
    h = hashlib.sha256(url.encode()).hexdigest()[:16]
    for f in os.listdir(CACHE_DIR):
        if f.startswith(h):
            ext = f[len(h):]
            return os.path.join(CACHE_DIR, f), ext
    return os.path.join(CACHE_DIR, h), None


def _ext_from_content_type(content_type: str) -> str:
    return {
        "image/jpeg": ".jpg",
        "image/png": ".png",
        "image/webp": ".webp",
        "image/gif": ".gif",
    }.get(content_type.split(";")[0].strip(), ".jpg")


@router.get("/sys_health")
async def sys_health():
    try:
        ensure_ffmpeg_or_raise()
        return R.success()
    except EnvironmentError:
        return R.error(msg="系统未安装 ffmpeg 请先进行安装")


@router.get("/sys_check")
async def sys_check():
    return R.success()


@router.get("/image_proxy")
async def image_proxy(request: Request, url: str):
    # 检查缓存
    cache_path, ext = _cache_path(url)
    if ext and os.path.exists(cache_path):
        content_type = {
            ".jpg": "image/jpeg",
            ".png": "image/png",
            ".webp": "image/webp",
            ".gif": "image/gif",
        }.get(ext, "image/jpeg")
        return FileResponse(cache_path, media_type=content_type, headers={
            "Cache-Control": "public, max-age=86400",
        })

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
            ext = _ext_from_content_type(content_type)
            cache_path_full = cache_path + ext

            body = await resp.aread()
            # 异步写入缓存（不阻塞返回）
            loop = asyncio.get_event_loop()
            loop.run_in_executor(None, _write_cache, cache_path_full, body)

            return StreamingResponse(
                iter([body]),
                media_type=content_type,
                headers={
                    "Cache-Control": "public, max-age=86400",
                    "Content-Type": content_type,
                }
            )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


def _write_cache(path: str, data: bytes):
    try:
        with open(path, "wb") as f:
            f.write(data)
    except Exception:
        pass
