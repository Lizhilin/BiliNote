from fastapi import APIRouter, Request, HTTPException
from fastapi.responses import StreamingResponse
import httpx
from app.utils.response import ResponseWrapper as R
from ffmpeg_helper import ensure_ffmpeg_or_raise

router = APIRouter(tags=["system"])


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
                    "Cache-Control": "public, max-age=86400",
                    "Content-Type": content_type,
                }
            )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
