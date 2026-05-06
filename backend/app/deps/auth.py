import os
from datetime import datetime, timedelta, timezone

from jose import jwt, JWTError
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv

from app.db.engine import get_db
from app.db.models.user import User

load_dotenv()

_jwt = os.getenv("JWT_SECRET", "").strip()
# 如果 JWT_SECRET 为空或过短（<16），生成随机 key 并尝试写回 .env
# 注意：Docker 部署下写回会失败（容器层不持久），需手动在宿主机 .env 配置
SECRET_KEY = _jwt if len(_jwt) >= 16 else os.urandom(32).hex()
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_HOURS = 24

if len(_jwt) < 16:
    _env_path = os.path.join(os.path.dirname(__file__), "..", "..", ".env")
    try:
        with open(_env_path, "a") as f:
            f.write(f'\nJWT_SECRET={SECRET_KEY}\n')
    except OSError:
        pass

bearer_scheme = HTTPBearer(auto_error=False)


def create_token(username: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(hours=ACCESS_TOKEN_EXPIRE_HOURS)
    payload = {"sub": username, "exp": expire}
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


async def verify_token(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> User:
    if credentials is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="未登录")

    token = credentials.credentials
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub", "")
        if not username:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="token 无效")
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="token 无效或已过期")

    db = next(get_db())
    try:
        user = db.query(User).filter(User.username == username).first()
        if user is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="用户不存在")
        return user
    finally:
        db.close()
