from fastapi import FastAPI
from fastapi import Depends

from .routers import note, provider, model, config, chat, auth, system
from .deps.auth import verify_token

_protected = [Depends(verify_token)]


def create_app(lifespan) -> FastAPI:
    app = FastAPI(title="BiliNote", lifespan=lifespan)

    # 公开路由：不需要登录
    app.include_router(auth.router, prefix="/api")
    app.include_router(system.router, prefix="/api")

    # 受保护路由：都需要登录
    app.include_router(note.router, prefix="/api", dependencies=_protected)
    app.include_router(provider.router, prefix="/api", dependencies=_protected)
    app.include_router(model.router, prefix="/api", dependencies=_protected)
    app.include_router(config.router, prefix="/api", dependencies=_protected)
    app.include_router(chat.router, prefix="/api", dependencies=_protected)

    return app
