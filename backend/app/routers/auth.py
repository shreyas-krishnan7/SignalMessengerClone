import random

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import AuthSession, User
from ..schemas import AuthResponse, OtpRequest, VerifyOtpRequest
from ..security import FIXED_OTP, create_session, get_current_session
from ..serializers import user_out
from ..services import AVATAR_COLORS

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/request-otp")
def request_otp(payload: OtpRequest):
    # Asli app SMS bhejta, hum bas fixed OTP ka hint wapas bhej dete hain
    return {"message": f"Verification code sent to {payload.phone}", "dev_otp": FIXED_OTP}


@router.post("/verify-otp", response_model=AuthResponse)
def verify_otp(payload: VerifyOtpRequest, db: Session = Depends(get_db)):
    if payload.otp != FIXED_OTP:
        raise HTTPException(400, "Incorrect code, please try again")

    # Number pehli baar aaya hai to naya user bana do (register), warna login
    user = db.scalar(select(User).where(User.phone == payload.phone))
    if user is None:
        user = User(phone=payload.phone, avatar_color=random.choice(AVATAR_COLORS))
        db.add(user)
        db.commit()
        db.refresh(user)

    token = create_session(db, user)
    return AuthResponse(token=token, user=user_out(user), is_new_user=not user.display_name)


@router.post("/logout")
def logout(session: AuthSession = Depends(get_current_session), db: Session = Depends(get_db)):
    db.delete(session)
    db.commit()
    return {"ok": True}
