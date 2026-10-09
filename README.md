# Signal Clone

A functional clone of the [Signal](https://signal.org) messenger. It recreates Signal's desktop look and feel and its core messaging workflows: onboarding, contacts, real-time 1:1 and group chats, delivery/read receipts, typing indicators, and online presence.

End-to-end encryption, calls, stories and linked devices are mocked or shown as "Coming soon", as the assignment allows.

---

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS v4, lucide-react icons |
| Backend | Python 3.12, FastAPI, SQLAlchemy 2.0, Pydantic v2 |
| Database | SQLite |
| Real-time | WebSockets (FastAPI / Starlette) |

---

## Features

### Core
- **Onboarding / auth:** register or log in with a phone number and a fixed mock OTP (`123456`). New users set a first/last name and an optional profile photo. Sessions are stored server-side and the token is kept in `localStorage`, so you stay logged in across reloads. Log out from Settings → Profile.
- **Conversation list:**
  - sorted by most recent activity
  - last-message preview, unread badges, tick status of your own last message
  - "typing…" dots, online dot
  - search across chats and contacts
  - an "unread only" filter button, like Signal desktop
  - "Mark all read"
- **Contacts:** add by phone number or `@username`. Start a chat with any contact, or find other Signal users by name, username or number.
- **1:1 messaging:**
  - real-time send and receive, timestamps, date separators
  - status `sending → sent → delivered → read`, shown as Signal-style circle ticks
  - typing indicators, online / last-seen in the header
  - search inside a chat (search icon in the chat header)
  - everything is stored in SQLite
- **Group messaging:**
  - create a group (name, description, photo, members) and chat in it
  - view members
  - admins can add/remove members, make/remove admins, and edit the group
  - anyone can leave; if the last admin leaves, the oldest member is promoted
  - system messages ("X added Y") are stored in the chat history
- **Signal experience:**
  - layout: nav rail (can be hidden with the hamburger button), chat list and chat pane, clustered message bubbles, a "Chat settings" panel. Sizes and colours were measured from the real Signal desktop app in both themes
  - "New chat" opens inside the chat list, like Signal
  - modals: new group, add contact, add members, edit group, safety number, confirm dialogs
  - toast notifications for messages in other chats
  - Settings: Profile, Appearance, Chats, Notifications, Privacy, Linked devices, Keyboard shortcuts

### Bonus features implemented
- **Attachments:** images show inline; other files appear as a download card.
- **Emoji reactions:** Signal's 6 default reactions, one reaction per user per message, updated live.
- **Reply / quote:** click a quote to jump to the original message.
- **Delete for everyone:** the bubble shows "This message was deleted".
- **Disappearing messages:** fully functional. Per-chat timer from 30 seconds to 1 week; the server deletes expired messages and they vanish live.
- **Dark mode:** System / Light / Dark, with no flash on load.
- **Responsive:** desktop, tablet, and mobile. On mobile the list and the chat are separate screens, and the nav rail becomes a bottom tab bar like the Signal phone app.
- **Keyboard shortcuts:**

  | Shortcut | Action |
  |---|---|
  | Ctrl+N | New chat |
  | Ctrl+F | Search |
  | Alt+↑ / Alt+↓ | Previous / next chat |
  | Ctrl+, | Settings |
  | Enter | Send |
  | Shift+Enter | New line |
  | Esc | Close dialog |

### Mocked / placeholders
- **Voice / video calls, Stories, Linked devices:** "Coming soon".
- **End-to-end encryption:** simulated. There's an encryption notice and a deterministic "safety number" screen; messages are stored in plain text.
- **Some settings** are shown but disabled ("Coming soon"), e.g. turning off read receipts, notification sound, screen lock.

---

## Getting started (local)

### Prerequisites
- Python 3.11+
- Node.js 18.18+ (tested on Node 22)

### 1. Backend (FastAPI) on http://localhost:8000

```bash
cd backend
python -m venv .venv
# Windows
.venv\Scripts\activate
# macOS / Linux
source .venv/bin/activate

pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

On first start the server creates `signal.db` and **seeds demo data automatically**. Interactive API docs are at http://localhost:8000/docs.

To reset the demo data, stop the server, delete `backend/signal.db` and start it again.

### 2. Frontend (Next.js) on http://localhost:3000

```bash
cd frontend
npm install
npm run dev
```

### 3. Log in

Open http://localhost:3000 and click a **demo account** chip (Aarav / Priya / Rohan), or enter any number. The OTP is always **`123456`**.

| Demo user | Phone | Username |
|---|---|---|
| Aarav Sharma | +91 90000 00001 | `aarav` |
| Priya Patel | +91 90000 00002 | `priya` |
| Rohan Mehta | +91 90000 00003 | `rohan` |
| Ananya Iyer | +91 90000 00004 | `ananya` |
| Kabir Singh | +91 90000 00005 | `kabir` |
| Meera Nair | +91 90000 00006 | `meera` |
| Vikram Rao | +91 90000 00007 | `vikram` |

> **Testing real-time:** log in as Aarav in one window and Priya in another (e.g. a normal and an incognito window) and chat between them. You'll see typing indicators, ticks turning to "read", reactions and presence update live.

### Environment variables

| Where | Variable | Default | Purpose |
|---|---|---|---|
| backend | `DATABASE_URL` | `sqlite:///./signal.db` | SQLAlchemy database URL |
| backend | `FRONTEND_ORIGINS` | `http://localhost:3000` | Comma-separated CORS origins |
| backend | `SEED_ON_STARTUP` | `true` | Seed demo data if the DB is empty |
| frontend | `NEXT_PUBLIC_API_URL` | `http://localhost:8000` | Backend base URL (the WebSocket URL is derived from it) |

Example files: `backend/.env.example`, `frontend/.env.example`.

---

## Architecture

```
┌──────────────────────────────┐         REST (JSON, Bearer token)        ┌──────────────────────────────┐
│  Next.js (React, Tailwind)   │  ───────────────────────────────────▶   │  FastAPI                     │
│                              │                                          │   routers/ (auth, users,     │
│  AuthContext   (session)     │  ◀───────────────────────────────────   │   contacts, conversations,   │
│  ChatContext   (state + WS)  │      WebSocket /ws?token=…  (events)     │   messages, uploads, ws)     │
│  Settings / Toast contexts   │  ◀──────────────────────────────────▶   │   services.py  (logic)       │
│  components/ (UI)            │                                          │   ws_manager.py (who's online│
└──────────────────────────────┘                                          │   events.py    (push events) │
                                                                          │   tasks.py (expire messages) │
                                                                          └──────────────┬───────────────┘
                                                                                         │ SQLAlchemy
                                                                                  ┌──────▼──────┐
                                                                                  │   SQLite    │
                                                                                  └─────────────┘
```

**Request flow for sending a message:**
1. The frontend adds an *optimistic* message to the UI right away (status `sending`, with a random `client_id`).
2. `POST /api/conversations/{id}/messages` saves the message and creates one `message_receipts` row per recipient. The receipt is `delivered` if that recipient is connected right now, otherwise `sent`.
3. The server pushes a `message.new` event over WebSocket to every member, including the sender's other tabs. The sender's client matches it to the optimistic message by `client_id`.
4. When a recipient opens the chat, the client calls `POST /read`. Their receipts become `read`, and the sender gets a `message.status` event, so the ticks fill in.
5. When an offline user connects, all their `sent` receipts become `delivered`, and the senders are notified.

**Design choices**
- **REST for actions, WebSocket for push.** Every write goes through normal HTTP endpoints, which are easy to validate, test and document in `/docs`. The socket only *pushes* events to clients; the only thing a client sends on it is typing state. This keeps the socket handler tiny.
- **One connection manager** maps `user_id → set of sockets`, so a user can have several tabs. A user is "online" while they have at least one open socket, and `last_seen_at` is saved when the last one closes.
- **Optimistic UI + `client_id` reconciliation** makes sending feel instant without creating duplicate messages.
- **Session tokens in a `sessions` table** instead of JWT, so logout actually invalidates the token server-side.
- **Frontend state** lives in a few React contexts with no external state library. `ChatContext` holds conversations, a per-conversation message cache, typing state and the WebSocket, with one handler per server event.

### Project structure

```
backend/
  app/
    main.py            # App setup: CORS, routers, static uploads, startup (create tables, seed, cleanup task)
    database.py        # Engine, session, SQLite foreign keys pragma
    models.py          # SQLAlchemy models (DB schema)
    schemas.py         # Pydantic request/response models + validation
    security.py        # Mock OTP, session tokens, current-user dependency
    services.py        # Shared business logic (membership checks, create message, receipts)
    serializers.py     # Model -> response conversion (title, unread count, tick status)
    events.py          # WebSocket event helpers
    ws_manager.py      # Tracks connected sockets per user
    tasks.py           # Background loop deleting expired disappearing messages
    seed.py            # Demo users, chats, groups and messages
    routers/           # auth, users, contacts, conversations, messages, uploads, ws
  requirements.txt

frontend/
  src/
    app/               # layout.tsx (fonts, theme script), page.tsx (providers + auth gate), globals.css (theme tokens)
    context/           # AuthContext, ChatContext, SettingsContext, ToastContext
    lib/               # api client, types, formatting, avatar colors, helpers, hooks
    components/
      onboarding/      # Phone -> OTP -> profile
      chat-list/       # Sidebar list + rows
      chat/            # ChatPane, header, message list, bubble, composer
      details/         # "Chat settings" panel + group modals
      modals/          # New group / add contact / contact picker
      settings/        # Settings screen and sections
      ui/              # Avatar, Modal, Menu, StatusIcon, toggles, etc.
      NavRail.tsx, SignalApp.tsx, ComingSoonView.tsx, ContactRow.tsx
```

---

## Database schema

```
users ─────────────┐
  id PK            │
  phone UNIQUE     │◀── sessions.user_id
  username UNIQUE? │◀── contacts.owner_id / contacts.contact_id
  display_name     │◀── conversation_members.user_id
  about            │◀── messages.sender_id
  avatar_color     │◀── message_receipts.user_id
  avatar_url       │◀── reactions.user_id
  last_seen_at     │
  created_at       │
                   │
conversations ─────┼─────────────┐
  id PK            │             │
  type ('direct' | 'group')      │◀── conversation_members.conversation_id
  name, description              │◀── messages.conversation_id
  avatar_color, avatar_url       │
  created_by_id FK → users       │
  disappearing_seconds (0 = off) │
  created_at, last_message_at (indexed, used for list ordering)

messages
  id PK
  conversation_id FK → conversations (CASCADE)
  sender_id FK → users
  type ('text' | 'attachment' | 'system')
  body, attachment_url, attachment_name, attachment_type
  reply_to_id FK → messages (SET NULL)      -- quoted replies
  is_deleted                                -- "delete for everyone" (soft delete)
  created_at, expires_at                    -- expires_at set for disappearing messages
  INDEX (conversation_id, id)               -- fast paginated history
```

| Table | Purpose | Key constraints |
|---|---|---|
| `users` | Accounts and profile | `phone` unique, `username` unique (nullable) |
| `sessions` | Login tokens (one per device/login) | `token` unique, FK `user_id` (cascade) |
| `contacts` | A user's address book | `UNIQUE(owner_id, contact_id)` |
| `conversations` | Both 1:1 and group chats (`type`) | `last_message_at` indexed |
| `conversation_members` | Who is in which chat + `role` (`admin`/`member`) | `UNIQUE(conversation_id, user_id)` |
| `messages` | Chat history, including system events | index `(conversation_id, id)`, self-FK `reply_to_id` |
| `message_receipts` | Per-recipient status: `sent` → `delivered` → `read` | `UNIQUE(message_id, user_id)` |
| `reactions` | Emoji reactions | `UNIQUE(message_id, user_id)` (one per user, like Signal) |

**Why `message_receipts`?** One table answers two questions:
- **Ticks for the sender:** a message's status is the *lowest* status among its receipts. In a group, a message only shows "read" once everyone has read it.
- **Unread count for a user:** the number of their receipts in that chat that aren't `read`.

System messages get no receipts, so they never count as unread.

**Why one `conversations` table for 1:1 and groups?** Messages, members, receipts and the chat list work the same way for both. A direct chat is simply a conversation of `type = 'direct'` with exactly two members. Its title and photo come from the other member.

Foreign keys are enforced in SQLite (`PRAGMA foreign_keys=ON`), and deletes cascade where it makes sense.

---

## API overview

All endpoints are under `/api`. Every endpoint except the auth ones needs `Authorization: Bearer <token>`. Full interactive docs are at `/docs`.

### Auth
| Method | Path | Description |
|---|---|---|
| POST | `/api/auth/request-otp` | `{phone}` → "sends" the code (returns the demo OTP hint) |
| POST | `/api/auth/verify-otp` | `{phone, otp}` → `{token, user, is_new_user}`. Creates the user if the number is new |
| POST | `/api/auth/logout` | Deletes the current session |

### Users & contacts
| Method | Path | Description |
|---|---|---|
| GET | `/api/users/me` | Current user |
| PATCH | `/api/users/me` | Update `display_name`, `about`, `username`, `avatar_color`, `avatar_url` |
| GET | `/api/users/search?q=` | Find users by name, username or phone |
| GET | `/api/users/{id}` | Public profile |
| GET | `/api/contacts` | My contacts |
| POST | `/api/contacts` | `{query}`: add by phone number or `@username` |
| DELETE | `/api/contacts/{id}` | Remove a contact |

### Conversations
| Method | Path | Description |
|---|---|---|
| GET | `/api/conversations` | My chats, newest first, with members, last message and unread count |
| GET | `/api/conversations/{id}` | One chat |
| POST | `/api/conversations/direct` | `{user_id}`: open the existing 1:1 chat or create it |
| POST | `/api/conversations/group` | `{name, description?, member_ids, avatar_url?}`: creator becomes admin |
| PATCH | `/api/conversations/{id}` | Name / description / photo (group admins), `disappearing_seconds` (any member) |
| POST | `/api/conversations/{id}/members` | `{user_ids}`: add members (admin) |
| DELETE | `/api/conversations/{id}/members/{user_id}` | Remove a member (admin) or leave (yourself) |
| PATCH | `/api/conversations/{id}/members/{user_id}` | `{role}`: make or remove admin (admin) |

### Messages & uploads
| Method | Path | Description |
|---|---|---|
| GET | `/api/conversations/{id}/messages?before_id=&limit=` | History, paginated backwards |
| POST | `/api/conversations/{id}/messages` | `{body, reply_to_id?, attachment_*?, client_id?}` |
| POST | `/api/conversations/{id}/read` | Mark everything in the chat as read (sends read receipts) |
| POST | `/api/messages/{id}/reactions` | `{emoji}`: add, change, or remove (same emoji again) |
| DELETE | `/api/messages/{id}` | Delete for everyone (sender only) |
| POST | `/api/uploads` | Multipart file upload (max 10 MB) → `{url, name, content_type}` |

### WebSocket: `GET /ws?token=<token>`

Server → client events are shaped `{ "type": ..., "data": ... }`:

| Event | When |
|---|---|
| `message.new` | A message (including system messages) was posted in one of your chats |
| `message.updated` | Reactions changed or the message was deleted for everyone |
| `message.deleted` | A disappearing message expired |
| `message.status` | Your messages became `delivered` / `read` |
| `typing` | Someone started or stopped typing |
| `presence` | A user came online or went offline (`last_seen_at`) |
| `user.updated` | A user changed their name or photo |
| `conversation.updated` | A chat changed (members, name, timer…). The client refetches it |
| `conversation.removed` | You were removed from (or left) a group |

Client → server: `{ "type": "typing", "conversation_id": 1, "is_typing": true }`.

The client reconnects automatically after 2 seconds and refetches data after a reconnect. Close code `4401` means the token is invalid, and the client logs out.

---

## Assumptions & limitations

- **Verification is mocked:** the OTP is always `123456`, and no SMS is sent. Any well-formed phone number can register.
- **Encryption is simulated.** Messages are stored in plain text, and the "safety number" is derived from the two phone numbers only for display.
- **Disappearing timer start:** the timer starts when a message is **sent**. Real Signal starts it once the message is read. A background task checks every 5 seconds, so a message may stay visible up to ~5 seconds past its expiry.
- **Read receipts and typing:**
  - read receipts are always on (the toggle is a placeholder)
  - the typing-indicator toggle is stored per browser
  - notifications are in-app toasts, not OS notifications
- **Online / last seen** is based on WebSocket connections. Signal itself doesn't show this, but the assignment asked for it.
- **Uploads** are stored on the server's local disk (`backend/uploads/`). On hosts with ephemeral disks, uploaded files and the SQLite database reset on redeploy; the database is re-seeded automatically on startup.
- **Single server process:** connected sockets are tracked in memory, so the backend is meant to run as one process. Scaling out would need a shared pub/sub such as Redis.
- **Two accounts in one browser:** the session token is persisted in `localStorage` and also kept in memory per tab. Two tabs can be different users, but a page reload picks up the most recently logged-in account. Use an incognito window for a second user.
- **Contacts** are one-directional (my address book). You can message any registered user, not just contacts, which matches Signal.
- **Sorting and grouping:** the chat list is sorted by `last_message_at`. Message timestamps are stored in UTC and shown in the viewer's local time.

---

## Useful commands

```bash
# Backend: run, or re-seed from scratch
uvicorn app.main:app --reload --port 8000
python -m app.seed            # seeds only if the DB is empty

# Frontend
npm run dev                   # development server
npm run build && npm start    # production build
npm run lint                  # ESLint
npm run format                # Prettier
```
