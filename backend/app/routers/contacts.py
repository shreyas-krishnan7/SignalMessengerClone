import re

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Contact, User
from ..schemas import AddContactRequest, ContactOut
from ..security import get_current_user
from ..serializers import user_out

router = APIRouter(prefix="/api/contacts", tags=["contacts"])


def contact_out(contact: Contact) -> ContactOut:
    return ContactOut(id=contact.id, user=user_out(contact.contact))


@router.get("", response_model=list[ContactOut])
def list_contacts(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    contacts = db.scalars(
        select(Contact).join(Contact.contact).where(Contact.owner_id == user.id).order_by(User.display_name)
    )
    return [contact_out(c) for c in contacts]


@router.post("", response_model=ContactOut)
def add_contact(payload: AddContactRequest, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    query = payload.query.strip()
    # Input mein sirf digits/+/spaces hain to phone number samjho, warna username
    if re.fullmatch(r"[\d+\s-]+", query):
        phone = re.sub(r"[^\d+]", "", query)
        phone = phone if phone.startswith("+") else "+" + phone
        other = db.scalar(select(User).where(User.phone == phone))
    else:
        other = db.scalar(select(User).where(User.username == query.lstrip("@").lower()))

    if other is None or not other.display_name:
        raise HTTPException(404, "No Signal user found with that phone number or username")
    if other.id == user.id:
        raise HTTPException(400, "You can't add yourself as a contact")

    existing = db.scalar(select(Contact).where(Contact.owner_id == user.id, Contact.contact_id == other.id))
    if existing:
        return contact_out(existing)

    contact = Contact(owner_id=user.id, contact_id=other.id)
    db.add(contact)
    db.commit()
    db.refresh(contact)
    return contact_out(contact)


@router.delete("/{contact_id}")
def remove_contact(contact_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    contact = db.get(Contact, contact_id)
    if contact is None or contact.owner_id != user.id:
        raise HTTPException(404, "Contact not found")
    db.delete(contact)
    db.commit()
    return {"ok": True}
