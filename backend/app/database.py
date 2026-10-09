import os

from sqlalchemy import create_engine, event
from sqlalchemy.orm import DeclarativeBase, sessionmaker

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./signal.db")

# SQLite ko multiple threads (FastAPI) se use karne ke liye check_same_thread off karna padta hai
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(bind=engine, autoflush=False)


@event.listens_for(engine, "connect")
def enable_foreign_keys(dbapi_connection, _):
    # SQLite mein foreign keys by default off hoti hain, isliye har connection pe on karte hain
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.close()


class Base(DeclarativeBase):
    pass


def get_db():
    # Har request ke liye naya DB session, request khatam hote hi close
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
