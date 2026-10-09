import re
from datetime import datetime, timezone
from typing import Annotated, Literal

from pydantic import BaseModel, Field, PlainSerializer, field_validator

# DB ka naive UTC time JSON mein "...+00:00" ke saath bhejte hain taaki frontend sahi local time dikhaye
UTCDateTime = Annotated[
    datetime, PlainSerializer(lambda d: d.replace(tzinfo=timezone.utc).isoformat(), return_type=str)
]


def normalize_phone(value: str) -> str:
    # Spaces, dashes hata ke sirf "+" aur digits rakhte hain
    phone = re.sub(r"[^\d+]", "", value)
    if not re.fullmatch(r"\+?\d{8,15}", phone):
        raise ValueError("Enter a valid phone number")
    return phone if phone.startswith("+") else "+" + phone


# ---------- Users ----------

class UserOut(BaseModel):
    id: int
    phone: str
    username: str | None
    display_name: str
    about: str
    avatar_color: str
    avatar_url: str | None
    is_online: bool
    last_seen_at: UTCDateTime


class MemberOut(UserOut):
    role: str


class ProfileUpdate(BaseModel):
    display_name: str | None = Field(default=None, min_length=1, max_length=64)
    about: str | None = Field(default=None, max_length=140)
    username: str | None = Field(default=None, max_length=32)
    avatar_color: str | None = None
    avatar_url: str | None = None

    @field_validator("username")
    @classmethod
    def check_username(cls, value: str | None) -> str | None:
        if value is None or value == "":
            return None
        if not re.fullmatch(r"[a-zA-Z0-9_.]{3,32}", value):
            raise ValueError("Username can only have letters, numbers, _ and . (3-32 chars)")
        return value.lower()


# ---------- Auth ----------

class OtpRequest(BaseModel):
    phone: str

    @field_validator("phone")
    @classmethod
    def check_phone(cls, value: str) -> str:
        return normalize_phone(value)


class VerifyOtpRequest(OtpRequest):
    otp: str


class AuthResponse(BaseModel):
    token: str
    user: UserOut
    is_new_user: bool  # true ho to frontend profile setup screen dikhayega


# ---------- Contacts ----------

class ContactOut(BaseModel):
    id: int
    user: UserOut


class AddContactRequest(BaseModel):
    query: str  # phone number ya username


# ---------- Messages ----------

class ReactionOut(BaseModel):
    user_id: int
    emoji: str


class ReplyPreview(BaseModel):
    id: int
    sender_id: int
    sender_name: str
    type: str
    body: str
    attachment_name: str | None
    is_deleted: bool


class MessageOut(BaseModel):
    id: int
    conversation_id: int
    sender_id: int
    type: str
    body: str
    attachment_url: str | None
    attachment_name: str | None
    attachment_type: str | None
    reply_to: ReplyPreview | None
    reactions: list[ReactionOut]
    status: str  # sent / delivered / read (sender ke liye)
    is_deleted: bool
    created_at: UTCDateTime
    expires_at: UTCDateTime | None
    client_id: str | None = None  # frontend ka temporary id, optimistic message match karne ke liye


class SendMessageRequest(BaseModel):
    body: str = Field(default="", max_length=4000)
    reply_to_id: int | None = None
    attachment_url: str | None = None
    attachment_name: str | None = None
    attachment_type: str | None = None
    client_id: str | None = None


class ReactionRequest(BaseModel):
    emoji: str = Field(min_length=1, max_length=16)


# ---------- Conversations ----------

class ConversationOut(BaseModel):
    id: int
    type: str
    title: str
    description: str
    avatar_color: str
    avatar_url: str | None
    members: list[MemberOut]
    my_role: str
    last_message: MessageOut | None
    unread_count: int
    disappearing_seconds: int
    last_message_at: UTCDateTime


class CreateDirectRequest(BaseModel):
    user_id: int


class CreateGroupRequest(BaseModel):
    name: str = Field(min_length=1, max_length=64)
    description: str = Field(default="", max_length=255)
    member_ids: list[int] = Field(min_length=1)
    avatar_url: str | None = None


class UpdateConversationRequest(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=64)
    description: str | None = Field(default=None, max_length=255)
    avatar_url: str | None = None
    disappearing_seconds: int | None = Field(default=None, ge=0)


class AddMembersRequest(BaseModel):
    user_ids: list[int] = Field(min_length=1)


class UpdateMemberRequest(BaseModel):
    role: Literal["admin", "member"]


# ---------- Uploads ----------

class UploadOut(BaseModel):
    url: str
    name: str
    content_type: str
