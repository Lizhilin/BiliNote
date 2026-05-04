from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from passlib.hash import bcrypt

from app.db.engine import get_db
from app.db.models.user import User
from app.deps.auth import create_token, verify_token
from app.utils.response import ResponseWrapper as R

router = APIRouter(tags=["auth"])


class LoginRequest(BaseModel):
    username: str
    password: str


@router.post("/auth/login")
def login(req: LoginRequest):
    db = next(get_db())
    try:
        user = db.query(User).filter(User.username == req.username).first()
        if not user or not bcrypt.verify(req.password, user.password_hash):
            return R.error("用户名或密码错误", code=401)
        token = create_token(user.username)
        return R.success({"token": token, "username": user.username})
    finally:
        db.close()


@router.get("/auth/me")
def me(current_user: User = Depends(verify_token)):
    return R.success({"username": current_user.username, "id": current_user.id})


class ChangePasswordRequest(BaseModel):
    old_password: str
    new_password: str


@router.post("/auth/change-password")
def change_password(req: ChangePasswordRequest, current_user: User = Depends(verify_token)):
    db = next(get_db())
    try:
        user = db.query(User).filter(User.id == current_user.id).first()
        if not user or not bcrypt.verify(req.old_password, user.password_hash):
            return R.error("旧密码错误", code=401)
        user.password_hash = bcrypt.hash(req.new_password)
        db.commit()
        return R.success(msg="密码修改成功")
    except Exception as e:
        db.rollback()
        return R.error(str(e))
    finally:
        db.close()
