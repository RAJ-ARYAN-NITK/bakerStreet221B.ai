# app/api/auth.py
"""
Feature 7 — User Authentication (Optional Sign-In)
====================================================
Provides JWT-based register/login + a get_optional_user dependency.

Design decision: auth is OPTIONAL (not enforced).
  - Unauthenticated requests are treated as user_id="anonymous"
  - Authenticated requests get per-user data isolation:
      thread_id prefix:  "{user_id}:{original_thread_id}"
      doc store prefix:  "{user_id}:{case_id}"

Endpoints:
  POST /auth/register  — create account, return JWT
  POST /auth/login     — verify credentials, return JWT
  GET  /auth/me        — return current user info (requires token)
"""

import os
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Header, status
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session
from passlib.context import CryptContext
from jose import JWTError, jwt

from app.database import get_db
from app.models.user import User

router = APIRouter(prefix="/auth", tags=["auth"])

# ─── Config ───────────────────────────────────────────────────────────────────

JWT_SECRET    = os.getenv("JWT_SECRET", "sherlock-holmes-change-me")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
JWT_EXPIRE_H  = int(os.getenv("JWT_EXPIRE_HOURS", "72"))

import bcrypt

# ─── Schemas ──────────────────────────────────────────────────────────────────

class AuthRequest(BaseModel):
    email:    str
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type:   str = "bearer"
    user_id:      int
    email:        str

class UserInfo(BaseModel):
    user_id: int
    email:   str

# ─── Helpers ──────────────────────────────────────────────────────────────────

def _hash_password(plain: str) -> str:
    return bcrypt.hashpw(plain.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def _verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode('utf-8'), hashed.encode('utf-8'))

def _create_token(user: User) -> str:
    payload = {
        "sub":     user.email,
        "user_id": user.id,
        "exp":     datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRE_H),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


# ─── Dependency: get_optional_user ───────────────────────────────────────────
# Returns a dict with user_id and email.
# If no valid token → returns anonymous user (no 401 thrown).
# Backend routes use this to scope data without forcing login.

def get_optional_user(authorization: Optional[str] = Header(default=None)) -> dict:
    """
    Extract user from Bearer token if present.
    Falls back to {"id": "anonymous", "email": "guest"} — never raises 401.
    This keeps the app fully usable without an account.
    """
    if not authorization or not authorization.startswith("Bearer "):
        return {"id": "anonymous", "email": "guest"}

    token = authorization.removeprefix("Bearer ").strip()
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return {
            "id":    str(payload.get("user_id", "anonymous")),
            "email": payload.get("sub", "guest"),
        }
    except JWTError:
        return {"id": "anonymous", "email": "guest"}


# ─── Routes ───────────────────────────────────────────────────────────────────

@router.post("/register", response_model=TokenResponse)
def register(req: AuthRequest, db: Session = Depends(get_db)):
    """Create a new account. Returns a JWT access token immediately."""
    existing = db.query(User).filter(User.email == req.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists.",
        )

    if len(req.password) < 6:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Password must be at least 6 characters.",
        )

    user = User(email=req.email, password_hash=_hash_password(req.password))
    db.add(user)
    db.commit()
    db.refresh(user)

    return TokenResponse(
        access_token=_create_token(user),
        user_id=user.id,
        email=user.email,
    )


@router.post("/login", response_model=TokenResponse)
def login(req: AuthRequest, db: Session = Depends(get_db)):
    """Verify credentials and return a JWT access token."""
    user = db.query(User).filter(User.email == req.email).first()
    if not user or not _verify_password(req.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password.",
        )

    return TokenResponse(
        access_token=_create_token(user),
        user_id=user.id,
        email=user.email,
    )


@router.get("/me", response_model=UserInfo)
def me(user: dict = Depends(get_optional_user)):
    """Return the currently authenticated user (or anonymous guest)."""
    return UserInfo(user_id=int(user["id"]) if user["id"] != "anonymous" else 0,
                    email=user["email"])
