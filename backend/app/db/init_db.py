import os
from passlib.hash import bcrypt
from dotenv import load_dotenv

from app.db.models.models import Model
from app.db.models.providers import Provider
from app.db.models.video_tasks import VideoTask
from app.db.models.user import User
from app.db.engine import get_engine, get_db, Base

load_dotenv()


def _seed_user():
    """从环境变量读取用户名密码，仅首次创建用户，不覆盖已有密码"""
    username = os.getenv("AUTH_USERNAME", "admin")
    password = os.getenv("AUTH_PASSWORD", "")
    if not password:
        return

    db = next(get_db())
    try:
        user = db.query(User).filter(User.username == username).first()
        if not user:
            db.add(User(username=username, password_hash=bcrypt.hash(password)))
            db.commit()
    finally:
        db.close()


def init_db():
    engine = get_engine()

    Base.metadata.create_all(bind=engine)
    _seed_user()
