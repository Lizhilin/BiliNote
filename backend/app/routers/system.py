from fastapi import APIRouter
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
