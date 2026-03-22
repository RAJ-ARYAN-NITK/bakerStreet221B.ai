import os
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from dotenv import load_dotenv
 
load_dotenv()
 

DATABASE_URL = os.getenv("DATABASE_URL") or "sqlite:///./sherlock.db"
 

if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)
 

if "sqlite" in DATABASE_URL:
    engine = create_engine(
        DATABASE_URL,
        connect_args={"check_same_thread": False},
        echo=False,
        future=True
    )
else:
    engine = create_engine(
        DATABASE_URL,
        echo=False,
        future=True
    )
 
SessionLocal = sessionmaker(
    bind=engine,
    autoflush=False,
    autocommit=False,
)
 
Base = declarative_base()
 
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
 