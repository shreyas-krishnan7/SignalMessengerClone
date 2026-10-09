import asyncio
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .database import Base, engine
from .routers import auth, contacts, conversations, messages, uploads, users, ws
from .routers.uploads import UPLOAD_DIR
from .seed import seed
from .tasks import run_cleanup_loop


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Server start hote hi tables bana do aur khaali DB ho to demo data daal do
    Base.metadata.create_all(engine)
    if os.getenv("SEED_ON_STARTUP", "true") == "true":
        seed()
    cleanup_task = asyncio.create_task(run_cleanup_loop())
    yield
    cleanup_task.cancel()


app = FastAPI(title="Signal Clone API", lifespan=lifespan)

# Frontend (Next.js) alag domain/port pe chalta hai, isliye CORS allow karna padta hai
allowed_origins = os.getenv("FRONTEND_ORIGINS", "http://localhost:3000").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in allowed_origins],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(users.router)
app.include_router(contacts.router)
app.include_router(conversations.router)
app.include_router(messages.router)
app.include_router(uploads.router)
app.include_router(ws.router)

UPLOAD_DIR.mkdir(exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")


@app.get("/api/health")
def health():
    return {"status": "ok"}
