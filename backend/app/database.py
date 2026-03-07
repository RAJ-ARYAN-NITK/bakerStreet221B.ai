import os
from sqlalchemy import create_engine, Column, String, DateTime
from sqlalchemy.orm import declarative_base, sessionmaker
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    raise ValueError("DATABASE_URL is not set in environment variables")

engine = create_engine(
    DATABASE_URL,
    echo=False,          # set True if you want SQL logs
    future=True
)

# -----------------------------
# Session
# -----------------------------
SessionLocal = sessionmaker(
    bind=engine,
    autoflush=False,
    autocommit=False,
)

# -----------------------------
# Base class for models
# -----------------------------
Base = declarative_base()

# engine = create_engine(DATABASE_URL)
# SessionLocal = sessionmaker(bind=engine)

# Base = declarative_base()


# class Case(Base):
#     __tablename__ = "cases"

#     id = Column(String, primary_key=True, index=True)
#     title = Column(String, default="New Investigation")
#     created_at = Column(DateTime, default=datetime.utcnow)