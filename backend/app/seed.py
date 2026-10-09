from datetime import timedelta

from sqlalchemy import func, select

from .database import Base, SessionLocal, engine
from .models import Contact, Conversation, ConversationMember, Message, MessageReceipt, User, utcnow

# (key, phone, username, display name, about, avatar color)
USERS = [
    ("aarav", "+919000000001", "aarav", "Aarav Sharma", "Coffee first ☕", "A110"),
    ("priya", "+919000000002", "priya", "Priya Patel", "Available", "A160"),
    ("rohan", "+919000000003", "rohan", "Rohan Mehta", "At the gym 🏋️", "A130"),
    ("ananya", "+919000000004", "ananya", "Ananya Iyer", "Reading 📚", "A150"),
    ("kabir", "+919000000005", "kabir", "Kabir Singh", "Busy", "A170"),
    ("meera", "+919000000006", "meera", "Meera Nair", "", "A120"),
    ("vikram", "+919000000007", "vikram", "Vikram Rao", "Travelling ✈️", "A180"),
]

# Har message: (sender, text, kitne minute pehle, status). Status na diya ho to "read", "system" = group event
DIRECT_CHATS = [
    ("aarav", "priya", [
        ("priya", "Hey! Are we still on for dinner tonight?", 190),
        ("aarav", "Yes! 8 pm at that new place in Indiranagar?", 185),
        ("priya", "Perfect. I'll book a table for 4", 184),
        ("aarav", "Rohan and Meera are coming too right?", 120),
        ("priya", "Yup, both confirmed 🎉", 25, "delivered"),
        ("priya", "Don't be late this time 😄", 24, "delivered"),
    ]),
    ("aarav", "rohan", [
        ("aarav", "Bro did you push the API changes?", 600),
        ("rohan", "Yeah, just merged it", 590),
        ("rohan", "Can you review the websocket part when you get time?", 589),
        ("aarav", "Sure, will check it tonight", 400),
        ("aarav", "Looks good, left a couple of comments 👍", 60),
    ]),
    ("aarav", "ananya", [
        ("ananya", "Finished the book you recommended!", 1500),
        ("aarav", "And??", 1490),
        ("ananya", "Loved it. The ending was unexpected", 1480),
        ("ananya", "Send me your next recommendation", 300, "delivered"),
    ]),
    ("aarav", "kabir", [
        ("kabir", "Match tomorrow at 7?", 2900),
        ("aarav", "I'm in. Which ground?", 2880),
        ("kabir", "Same as last week", 2870),
        ("aarav", "Done 🏏", 2860, "delivered"),
    ]),
    ("priya", "rohan", [
        ("rohan", "Can you share the slides from today?", 700),
        ("priya", "Sent on email", 690),
    ]),
]

# (name, description, admin, other members, messages)
GROUPS = [
    ("Weekend Trek 🏔️", "Planning the Nandi Hills sunrise trek", "aarav", ["priya", "rohan", "meera"], [
        ("aarav", "Aarav Sharma created the group.", 3000, "system"),
        ("aarav", "Sunrise trek this Saturday? Leaving at 4 am", 2990),
        ("meera", "4 am 😳", 2980),
        ("rohan", "I'm in! I'll drive", 2970),
        ("priya", "Count me in. I'll bring snacks", 240),
        ("meera", "Okay fine, I'm coming too", 45, "delivered"),
        ("rohan", "Car has space for 4 more", 30, "delivered"),
    ]),
    ("Project Phoenix", "Final year project team", "priya", ["aarav", "kabir", "vikram", "ananya"], [
        ("priya", "Priya Patel created the group.", 5000, "system"),
        ("priya", "Welcome everyone! Let's use this group for project updates", 4990),
        ("vikram", "Hi all 👋", 4980),
        ("kabir", "I've set up the GitHub repo", 1440),
        ("ananya", "Database schema draft is ready, sharing in a bit", 1430),
        ("aarav", "Great, I'll start on the frontend", 1400),
        ("priya", "Review meeting tomorrow at 11 am", 90, "delivered"),
    ]),
]


def add_message(db, conversation, sender_id, body, minutes_ago, status="read"):
    created_at = utcnow() - timedelta(minutes=minutes_ago)
    is_system = status == "system"
    message = Message(
        conversation_id=conversation.id,
        sender_id=sender_id,
        type="system" if is_system else "text",
        body=body,
        created_at=created_at,
    )
    if not is_system:
        # Sender ke alawa har member ke liye receipt row
        for member in conversation.members:
            if member.user_id != sender_id:
                message.receipts.append(MessageReceipt(user_id=member.user_id, status=status, updated_at=created_at))
    conversation.last_message_at = created_at
    db.add(message)


def add_messages(db, conversation, users, messages):
    for item in messages:
        sender, text, minutes_ago = item[0], item[1], item[2]
        status = item[3] if len(item) > 3 else "read"
        add_message(db, conversation, users[sender].id, text, minutes_ago, status)


def seed():
    with SessionLocal() as db:
        # Database mein pehle se users hain to dobara seed nahi karte
        if db.scalar(select(func.count(User.id))) > 0:
            return

        users = {}
        for key, phone, username, name, about, color in USERS:
            users[key] = User(
                phone=phone,
                username=username,
                display_name=name,
                about=about,
                avatar_color=color,
                last_seen_at=utcnow() - timedelta(minutes=len(users) * 17),
            )
            db.add(users[key])
        db.flush()  # flush se users ko id mil jaati hai (commit ke bina)

        # Demo ke liye sab ek dusre ke contacts hain
        for owner in users.values():
            for other in users.values():
                if owner.id != other.id:
                    db.add(Contact(owner_id=owner.id, contact_id=other.id))

        for user_a, user_b, messages in DIRECT_CHATS:
            conversation = Conversation(type="direct")
            conversation.members = [
                ConversationMember(user_id=users[user_a].id),
                ConversationMember(user_id=users[user_b].id),
            ]
            db.add(conversation)
            db.flush()
            add_messages(db, conversation, users, messages)

        for index, (name, description, admin, members, messages) in enumerate(GROUPS):
            conversation = Conversation(
                type="group",
                name=name,
                description=description,
                avatar_color=["A140", "A190"][index % 2],
                created_by_id=users[admin].id,
            )
            conversation.members.append(ConversationMember(user_id=users[admin].id, role="admin"))
            for member in members:
                conversation.members.append(ConversationMember(user_id=users[member].id, role="member"))
            db.add(conversation)
            db.flush()
            add_messages(db, conversation, users, messages)

        db.commit()
        print("Seeded demo data. Log in with +91 90000 00001 and OTP 123456")


if __name__ == "__main__":
    Base.metadata.create_all(engine)
    seed()
