from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from ..database import get_db
from ..events import notify_user_updated
from ..models import User
from ..schemas import ProfileUpdate, UserOut
from ..security import get_current_user
from ..serializers import user_out
from ..services import AVATAR_COLORS

router = APIRouter(prefix="/api/users", tags=["users"])


@router.get("/me", response_model=UserOut)
def get_me(user: User = Depends(get_current_user)):
    return user_out(user)


@router.patch("/me", response_model=UserOut)
async def update_me(payload: ProfileUpdate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Sirf wahi fields update karo jo request mein bheji gayi hain
    changes = payload.model_dump(exclude_unset=True)

    if "username" in changes and changes["username"]:
        taken = db.scalar(select(User).where(User.username == changes["username"], User.id != user.id))
        if taken:
            raise HTTPException(400, "This username is already taken")
    if "avatar_color" in changes and changes["avatar_color"] not in AVATAR_COLORS:
        raise HTTPException(400, "Invalid avatar color")

    for field, value in changes.items():
        setattr(user, field, value)
    db.commit()
    db.refresh(user)

    await notify_user_updated(db, user)
    return user_out(user)


@router.get("/search", response_model=list[UserOut])
def search_users(q: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Naam, username ya phone number se naye log dhoondhne ke liye
    query = q.strip()
    if not query:
        return []
    pattern = f"%{query}%"
    users = db.scalars(
        select(User)
        .where(
            User.id != user.id,
            User.display_name != "",
            or_(User.display_name.ilike(pattern), User.username.ilike(pattern), User.phone.like(pattern)),
        )
        .order_by(User.display_name)
        .limit(20)
    )
    return [user_out(u) for u in users]


@router.get("/{user_id}", response_model=UserOut)
def get_user(user_id: int, _: User = Depends(get_current_user), db: Session = Depends(get_db)):
    other = db.get(User, user_id)
    if other is None:
        raise HTTPException(404, "User not found")
    return user_out(other)
