from sqlalchemy.orm import Session

from .models import Conversation, ConversationMember, Message, User
from .schemas import ConversationOut, MemberOut, MessageOut, ReactionOut, ReplyPreview, UserOut
from .services import get_last_message, get_message_status, get_unread_count
from .ws_manager import manager


def user_out(user: User) -> UserOut:
    return UserOut(
        id=user.id,
        phone=user.phone,
        username=user.username,
        display_name=user.display_name,
        about=user.about,
        avatar_color=user.avatar_color,
        avatar_url=user.avatar_url,
        is_online=manager.is_online(user.id),
        last_seen_at=user.last_seen_at,
    )


def member_out(member: ConversationMember) -> MemberOut:
    return MemberOut(**user_out(member.user).model_dump(), role=member.role)


def reply_preview(message: Message) -> ReplyPreview:
    return ReplyPreview(
        id=message.id,
        sender_id=message.sender_id,
        sender_name=message.sender.display_name,
        type=message.type,
        body=message.body,
        attachment_name=message.attachment_name,
        is_deleted=message.is_deleted,
    )


def message_out(message: Message, client_id: str | None = None) -> MessageOut:
    return MessageOut(
        id=message.id,
        conversation_id=message.conversation_id,
        sender_id=message.sender_id,
        type=message.type,
        body=message.body,
        attachment_url=message.attachment_url,
        attachment_name=message.attachment_name,
        attachment_type=message.attachment_type,
        reply_to=reply_preview(message.reply_to) if message.reply_to else None,
        reactions=[ReactionOut(user_id=r.user_id, emoji=r.emoji) for r in message.reactions],
        status=get_message_status(message),
        is_deleted=message.is_deleted,
        created_at=message.created_at,
        expires_at=message.expires_at,
        client_id=client_id,
    )


def conversation_out(db: Session, conversation: Conversation, viewer_id: int) -> ConversationOut:
    my_membership = next(m for m in conversation.members if m.user_id == viewer_id)

    if conversation.type == "direct":
        # 1:1 chat ka naam aur photo = saamne wale user ka naam aur photo
        other = next((m.user for m in conversation.members if m.user_id != viewer_id), my_membership.user)
        title, avatar_color, avatar_url = other.display_name, other.avatar_color, other.avatar_url
    else:
        title, avatar_color, avatar_url = conversation.name, conversation.avatar_color, conversation.avatar_url

    last_message = get_last_message(db, conversation.id)
    return ConversationOut(
        id=conversation.id,
        type=conversation.type,
        title=title or "",
        description=conversation.description,
        avatar_color=avatar_color,
        avatar_url=avatar_url,
        members=[member_out(m) for m in conversation.members],
        my_role=my_membership.role,
        last_message=message_out(last_message) if last_message else None,
        unread_count=get_unread_count(db, conversation.id, viewer_id),
        disappearing_seconds=conversation.disappearing_seconds,
        last_message_at=conversation.last_message_at,
    )
