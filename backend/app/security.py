import secrets

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.orm import Session

from .database import get_db
from .models import AuthSession, User

# Real SMS nahi bhejte, verification ke liye fixed OTP use hota hai
FIXED_OTP = "123456"

bearer_scheme = HTTPBearer(auto_error=False)


def create_session(db: Session, user: User) -> str:
    # Random token banake sessions table mein save karte hain (logout pe delete ho jayega)
    token = secrets.token_hex(32)
    db.add(AuthSession(token=token, user_id=user.id))
    db.commit()
    return token


def get_user_by_token(db: Session, token: str) -> User | None:
    session = db.scalar(select(AuthSession).where(AuthSession.token == token))
    return session.user if session else None


def get_current_session(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> AuthSession:
    if credentials is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Not logged in")
    session = db.scalar(select(AuthSession).where(AuthSession.token == credentials.credentials))
    if session is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Session expired, please log in again")
    return session


def get_current_user(session: AuthSession = Depends(get_current_session)) -> User:
    return session.user
