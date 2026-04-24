"""
NovaBank Python Backend — FastAPI
Mirrors the Node/Express backend API (backend/src/) exactly.
Routes: /api/v1/{auth, accounts, transactions, loans, cards, savings, investments}

Run:
  pip install -r requirements.txt
  uvicorn main:app --reload --port 4000
"""

from __future__ import annotations

import enum
import os
import uuid
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from typing import Optional

import hashlib
import random
import secrets

from fastapi import Depends, FastAPI, HTTPException, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
import bcrypt
from jose import JWTError, jwt
from pydantic import BaseModel, EmailStr, field_validator
from sqlalchemy import (Column, DateTime, Enum, ForeignKey, Numeric, String,
                        Boolean, Integer, create_engine)
from sqlalchemy.orm import DeclarativeBase, Session, relationship, sessionmaker

# ─── Config ───────────────────────────────────────────────────────────────────

SECRET_KEY      = os.getenv("JWT_SECRET", "novabanc-dev-secret-change-in-production")
ALGORITHM       = "HS256"
ACCESS_EXPIRE   = int(os.getenv("JWT_ACCESS_EXPIRES_IN", "900"))    # 15 min
REFRESH_EXPIRE  = int(os.getenv("JWT_REFRESH_EXPIRES_IN", "604800")) # 7 days
DATABASE_URL    = os.getenv("DATABASE_URL", "sqlite:///./novabanc.db")

# ─── Database ─────────────────────────────────────────────────────────────────

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

from sqlalchemy import event as _sa_event

@_sa_event.listens_for(engine, "connect")
def _set_sqlite_pragmas(dbapi_conn, _rec):
    cur = dbapi_conn.cursor()
    cur.execute("PRAGMA foreign_keys=ON")
    cur.execute("PRAGMA journal_mode=WAL")
    cur.close()

class Base(DeclarativeBase):
    pass


# ── Enums ──────────────────────────────────────────────────────────────────────

class RoleEnum(str, enum.Enum):
    USER  = "USER"
    ADMIN = "ADMIN"

class AccountTypeEnum(str, enum.Enum):
    CHECKING   = "CHECKING"
    SAVINGS    = "SAVINGS"
    INVESTMENT = "INVESTMENT"

class AccountStatusEnum(str, enum.Enum):
    ACTIVE   = "ACTIVE"
    INACTIVE = "INACTIVE"
    FROZEN   = "FROZEN"

class TransactionTypeEnum(str, enum.Enum):
    DEPOSIT    = "DEPOSIT"
    WITHDRAWAL = "WITHDRAWAL"
    TRANSFER   = "TRANSFER"
    PAYMENT    = "PAYMENT"
    FEE        = "FEE"

class TransactionStatusEnum(str, enum.Enum):
    PENDING   = "PENDING"
    COMPLETED = "COMPLETED"
    FAILED    = "FAILED"
    REVERSED  = "REVERSED"

class CardTypeEnum(str, enum.Enum):
    DEBIT   = "DEBIT"
    CREDIT  = "CREDIT"
    VIRTUAL = "VIRTUAL"
    PREPAID = "PREPAID"

class CardStatusEnum(str, enum.Enum):
    ACTIVE  = "ACTIVE"
    FROZEN  = "FROZEN"
    BLOCKED = "BLOCKED"
    EXPIRED = "EXPIRED"

class LoanTypeEnum(str, enum.Enum):
    PERSONAL = "PERSONAL"
    HOME     = "HOME"
    AUTO     = "AUTO"
    BUSINESS = "BUSINESS"
    STUDENT  = "STUDENT"

class LoanStatusEnum(str, enum.Enum):
    ACTIVE    = "ACTIVE"
    PAID      = "PAID"
    DEFAULTED = "DEFAULTED"
    PENDING   = "PENDING"


# ── ORM Models ────────────────────────────────────────────────────────────────

class UserModel(Base):
    __tablename__ = "users"
    id            = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    email         = Column(String, unique=True, nullable=False)
    password_hash = Column(String, nullable=False)
    first_name    = Column(String, nullable=False)
    last_name     = Column(String, nullable=False)
    phone         = Column(String)
    role          = Column(Enum(RoleEnum), default=RoleEnum.USER)
    is_active     = Column(Boolean, default=True)
    # Personal details (PII)
    date_of_birth = Column(String)
    national_id   = Column(String)
    address_line1 = Column(String)
    address_line2 = Column(String)
    city          = Column(String)
    state         = Column(String)
    postal_code   = Column(String)
    country       = Column(String)
    # Account protection
    failed_logins = Column(Integer, default=0)
    locked_until  = Column(DateTime)
    last_login_at = Column(DateTime)
    created_at    = Column(DateTime, default=datetime.utcnow)
    updated_at    = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    accounts    = relationship("AccountModel",     back_populates="user", cascade="all, delete")
    cards       = relationship("CardModel",        back_populates="user", cascade="all, delete")
    loans       = relationship("LoanModel",        back_populates="user", cascade="all, delete")
    savings     = relationship("SavingsGoalModel", back_populates="user", cascade="all, delete")
    investments = relationship("InvestmentModel",  back_populates="user", cascade="all, delete")
    sessions    = relationship("SessionModel",     back_populates="user", cascade="all, delete")
    devices     = relationship("DeviceModel",      back_populates="user", cascade="all, delete")


class SessionModel(Base):
    __tablename__ = "sessions"
    id            = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id       = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    refresh_token = Column(String, unique=True, nullable=False)
    expires_at    = Column(DateTime, nullable=False)
    created_at    = Column(DateTime, default=datetime.utcnow)

    user = relationship("UserModel", back_populates="sessions")


class AccountModel(Base):
    __tablename__ = "accounts"
    id         = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id    = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name       = Column(String, nullable=False)
    type       = Column(Enum(AccountTypeEnum), nullable=False)
    number     = Column(String, unique=True, nullable=False)
    balance    = Column(Numeric(15, 2), default=0)
    currency   = Column(String, default="USD")
    status     = Column(Enum(AccountStatusEnum), default=AccountStatusEnum.ACTIVE)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user       = relationship("UserModel", back_populates="accounts")
    sent_tx    = relationship("TransactionModel", foreign_keys="TransactionModel.from_account_id", back_populates="from_account")
    received_tx= relationship("TransactionModel", foreign_keys="TransactionModel.to_account_id",   back_populates="to_account")
    cards      = relationship("CardModel", back_populates="account")


class TransactionModel(Base):
    __tablename__   = "transactions"
    id              = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    from_account_id = Column(String, ForeignKey("accounts.id"))
    to_account_id   = Column(String, ForeignKey("accounts.id"))
    amount          = Column(Numeric(15, 2), nullable=False)
    type            = Column(Enum(TransactionTypeEnum), nullable=False)
    category        = Column(String)
    description     = Column(String)
    status          = Column(Enum(TransactionStatusEnum), default=TransactionStatusEnum.COMPLETED)
    reference       = Column(String, unique=True, default=lambda: str(uuid.uuid4()))
    created_at      = Column(DateTime, default=datetime.utcnow)

    from_account = relationship("AccountModel", foreign_keys=[from_account_id], back_populates="sent_tx")
    to_account   = relationship("AccountModel", foreign_keys=[to_account_id],   back_populates="received_tx")


class CardModel(Base):
    __tablename__ = "cards"
    id         = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id    = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    account_id = Column(String, ForeignKey("accounts.id"), nullable=False)
    type       = Column(Enum(CardTypeEnum), nullable=False)
    label      = Column(String, nullable=False)
    last4      = Column(String, nullable=False)
    expiry     = Column(String, nullable=False)
    network    = Column(String, default="Visa")
    status     = Column(Enum(CardStatusEnum), default=CardStatusEnum.ACTIVE)
    limit      = Column(Numeric(15, 2), default=5000)
    spent      = Column(Numeric(15, 2), default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user    = relationship("UserModel",    back_populates="cards")
    account = relationship("AccountModel", back_populates="cards")


class LoanModel(Base):
    __tablename__ = "loans"
    id           = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id      = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    type         = Column(Enum(LoanTypeEnum), nullable=False)
    name         = Column(String, nullable=False)
    principal    = Column(Numeric(15, 2), nullable=False)
    outstanding  = Column(Numeric(15, 2), nullable=False)
    rate         = Column(Numeric(5, 2), nullable=False)
    monthly      = Column(Numeric(15, 2), nullable=False)
    term_months  = Column(Integer, nullable=False)
    status       = Column(Enum(LoanStatusEnum), default=LoanStatusEnum.ACTIVE)
    next_due_date= Column(DateTime, nullable=False)
    created_at   = Column(DateTime, default=datetime.utcnow)
    updated_at   = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("UserModel", back_populates="loans")


class SavingsGoalModel(Base):
    __tablename__ = "savings_goals"
    id         = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id    = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name       = Column(String, nullable=False)
    emoji      = Column(String, default="🎯")
    target     = Column(Numeric(15, 2), nullable=False)
    saved      = Column(Numeric(15, 2), default=0)
    monthly    = Column(Numeric(15, 2), default=0)
    deadline   = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("UserModel", back_populates="savings")


class InvestmentModel(Base):
    __tablename__ = "investments"
    id         = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id    = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    symbol     = Column(String, nullable=False)
    name       = Column(String, nullable=False)
    shares     = Column(Numeric(15, 6), nullable=False)
    avg_price  = Column(Numeric(15, 2), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("UserModel", back_populates="investments")


# ── Security/Audit models ─────────────────────────────────────────────────────

class LoginAttemptModel(Base):
    __tablename__ = "login_attempts"
    id           = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    email        = Column(String, nullable=False)
    user_id      = Column(String, ForeignKey("users.id", ondelete="SET NULL"))
    success      = Column(Boolean, default=False)
    reason       = Column(String)
    ip_address   = Column(String)
    user_agent   = Column(String)
    device_id    = Column(String)
    created_at   = Column(DateTime, default=datetime.utcnow, index=True)


class AuthLogModel(Base):
    __tablename__ = "auth_logs"
    id           = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id      = Column(String, ForeignKey("users.id", ondelete="SET NULL"))
    event        = Column(String, nullable=False)
    severity     = Column(String, default="info")
    detail       = Column(String)
    ip_address   = Column(String)
    user_agent   = Column(String)
    created_at   = Column(DateTime, default=datetime.utcnow, index=True)


class DeviceModel(Base):
    __tablename__ = "devices"
    id            = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id       = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    fingerprint   = Column(String, nullable=False)
    user_agent    = Column(String)
    ip_address    = Column(String)
    trusted       = Column(Boolean, default=False)
    last_seen_at  = Column(DateTime, default=datetime.utcnow)
    created_at    = Column(DateTime, default=datetime.utcnow)

    user = relationship("UserModel", back_populates="devices")


class MfaCodeModel(Base):
    __tablename__ = "mfa_codes"
    id         = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id    = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    code_hash  = Column(String, nullable=False)
    purpose    = Column(String, default="login")
    expires_at = Column(DateTime, nullable=False)
    consumed   = Column(Boolean, default=False)
    attempts   = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)


class ApiKeyModel(Base):
    __tablename__ = "api_keys"
    id         = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id    = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name       = Column(String, nullable=False)
    prefix     = Column(String(8), nullable=False)        # first 8 chars of key (for display)
    key_hash   = Column(String, nullable=False)            # sha256 of the full key
    scopes     = Column(String, default="read")            # comma-separated: read,write,admin
    last_used  = Column(DateTime, nullable=True)
    expires_at = Column(DateTime, nullable=True)
    revoked    = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)


Base.metadata.create_all(bind=engine)


# ─── Auth helpers ─────────────────────────────────────────────────────────────

bearer = HTTPBearer()


def hash_password(plain: str) -> str:
    # bcrypt truncates at 72 bytes; enforce that here to match behavior across backends.
    pw = plain.encode("utf-8")[:72]
    return bcrypt.hashpw(pw, bcrypt.gensalt(rounds=10)).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode("utf-8")[:72], hashed.encode("utf-8"))
    except (ValueError, TypeError):
        return False

def create_token(data: dict, expires_in: int) -> str:
    payload = {**data, "exp": datetime.now(timezone.utc) + timedelta(seconds=expires_in)}
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def get_current_user(
    creds: HTTPAuthorizationCredentials = Depends(bearer),
    db: Session = Depends(get_db),
) -> UserModel:
    payload = decode_token(creds.credentials)
    user = db.get(UserModel, payload.get("sub"))
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="User not found or inactive")
    return user


def require_admin(user: UserModel = Depends(get_current_user)) -> UserModel:
    if user.role != RoleEnum.ADMIN:
        raise HTTPException(403, "Admin access required")
    return user


# ─── Audit/Device helpers ─────────────────────────────────────────────────────

def client_ip(req: Request) -> str:
    fwd = req.headers.get("x-forwarded-for")
    if fwd:
        return fwd.split(",")[0].strip()
    return req.client.host if req.client else "unknown"


def device_fingerprint(req: Request) -> str:
    ua = req.headers.get("user-agent", "")
    ip = client_ip(req)
    return hashlib.sha256(f"{ua}|{ip}".encode()).hexdigest()[:32]


def log_auth(db: Session, *, user_id: Optional[str], event: str,
             severity: str = "info", detail: str = "", req: Optional[Request] = None):
    db.add(AuthLogModel(
        user_id=user_id, event=event, severity=severity, detail=detail,
        ip_address=client_ip(req) if req else None,
        user_agent=(req.headers.get("user-agent", "") if req else None),
    ))
    db.commit()


def record_login_attempt(db: Session, *, email: str, user_id: Optional[str],
                         success: bool, reason: str, req: Request):
    db.add(LoginAttemptModel(
        email=email, user_id=user_id, success=success, reason=reason,
        ip_address=client_ip(req),
        user_agent=req.headers.get("user-agent", ""),
        device_id=device_fingerprint(req),
    ))
    db.commit()


def upsert_device(db: Session, *, user_id: str, req: Request) -> DeviceModel:
    fp = device_fingerprint(req)
    dev = db.query(DeviceModel).filter_by(user_id=user_id, fingerprint=fp).first()
    if dev:
        dev.last_seen_at = datetime.utcnow()
    else:
        dev = DeviceModel(user_id=user_id, fingerprint=fp,
                          user_agent=req.headers.get("user-agent", ""),
                          ip_address=client_ip(req))
        db.add(dev)
    db.commit()
    return dev


def generate_otp() -> str:
    return f"{secrets.randbelow(1_000_000):06d}"


# ─── Pydantic schemas ─────────────────────────────────────────────────────────

class RegisterIn(BaseModel):
    email:         EmailStr
    password:      str
    first_name:    str
    last_name:     str
    phone:         Optional[str] = None
    date_of_birth: Optional[str] = None
    national_id:   Optional[str] = None
    address_line1: Optional[str] = None
    address_line2: Optional[str] = None
    city:          Optional[str] = None
    state:         Optional[str] = None
    postal_code:   Optional[str] = None
    country:       Optional[str] = None

    @field_validator("password")
    @classmethod
    def pw_strength(cls, v):
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        return v

class LoginIn(BaseModel):
    email:    EmailStr
    password: str

class OtpVerifyIn(BaseModel):
    challenge_id: str
    code:         str

class RefreshIn(BaseModel):
    refresh_token: str

class UpdateProfileIn(BaseModel):
    first_name:    Optional[str] = None
    last_name:     Optional[str] = None
    phone:         Optional[str] = None
    date_of_birth: Optional[str] = None
    national_id:   Optional[str] = None
    address_line1: Optional[str] = None
    address_line2: Optional[str] = None
    city:          Optional[str] = None
    state:         Optional[str] = None
    postal_code:   Optional[str] = None
    country:       Optional[str] = None

class ChangePasswordIn(BaseModel):
    current_password: str
    new_password:     str

    @field_validator("new_password")
    @classmethod
    def pw_strength(cls, v):
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        return v

class CreateAccountIn(BaseModel):
    name: str
    type: AccountTypeEnum

class UpdateAccountIn(BaseModel):
    name:   Optional[str]              = None
    status: Optional[AccountStatusEnum] = None

class TransferIn(BaseModel):
    from_account_id: str
    to_account_id:   str
    amount:          Decimal
    description:     Optional[str] = None

    @field_validator("amount")
    @classmethod
    def positive(cls, v):
        if v <= 0:
            raise ValueError("Amount must be greater than zero")
        if v > 1_000_000:
            raise ValueError("Amount cannot exceed $1,000,000")
        return v

class CreateCardIn(BaseModel):
    account_id: str
    type:       CardTypeEnum
    label:      str

class UpdateCardIn(BaseModel):
    status: Optional[CardStatusEnum] = None
    limit:  Optional[Decimal]        = None

class CreateLoanIn(BaseModel):
    type:         LoanTypeEnum
    name:         str
    principal:    Decimal
    rate:         Decimal
    term_months:  int
    next_due_date: datetime

class CreateSavingsIn(BaseModel):
    name:     str
    emoji:    str = "🎯"
    target:   Decimal
    monthly:  Decimal = Decimal("0")
    deadline: Optional[datetime] = None

class CreateInvestmentIn(BaseModel):
    symbol:    str
    name:      str
    shares:    Decimal
    avg_price: Decimal


# ─── App ──────────────────────────────────────────────────────────────────────

_DEMO_MODE = os.getenv("DEMO_MODE", "true").lower() == "true"
_SHOW_DOCS = os.getenv("SHOW_DOCS", "false").lower() == "true"

if _DEMO_MODE:
    import sys
    print("[SECURITY WARNING] DEMO_MODE=true — OTP codes are returned in API responses. "
          "Set DEMO_MODE=false before any production deployment.", file=sys.stderr)

app = FastAPI(
    title="NovaBank API",
    version="1.0.0",
    docs_url="/api/docs" if _SHOW_DOCS else None,
    redoc_url=None,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def security_headers_middleware(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Cache-Control"] = "no-store"
    return response


def ok(data, message="Success"):
    return {"success": True, "message": message, "data": data}


# ─── Health ───────────────────────────────────────────────────────────────────

@app.get("/api/v1/health")
def health():
    return {"status": "ok", "timestamp": datetime.utcnow().isoformat(), "version": "1.0.0"}


# ─── Auth ─────────────────────────────────────────────────────────────────────

def _issue_tokens(db: Session, user: UserModel) -> dict:
    access  = create_token({"sub": user.id}, ACCESS_EXPIRE)
    refresh = create_token({"sub": user.id}, REFRESH_EXPIRE)
    session = SessionModel(user_id=user.id, refresh_token=refresh,
                           expires_at=datetime.utcnow() + timedelta(seconds=REFRESH_EXPIRE))
    db.add(session); db.commit()
    return {
        "access_token":  access,
        "refresh_token": refresh,
        "user": {
            "id": user.id, "email": user.email,
            "name": f"{user.first_name} {user.last_name}",
            "role": user.role.value if hasattr(user.role, "value") else user.role,
        },
    }


@app.post("/api/v1/auth/register", status_code=201)
def register(body: RegisterIn, req: Request, db: Session = Depends(get_db)):
    if db.query(UserModel).filter_by(email=body.email).first():
        raise HTTPException(400, "Email already registered")
    user = UserModel(
        email=body.email,
        password_hash=hash_password(body.password),
        first_name=body.first_name,
        last_name=body.last_name,
        phone=body.phone,
        date_of_birth=body.date_of_birth,
        national_id=body.national_id,
        address_line1=body.address_line1,
        address_line2=body.address_line2,
        city=body.city,
        state=body.state,
        postal_code=body.postal_code,
        country=body.country,
    )
    db.add(user); db.commit(); db.refresh(user)
    upsert_device(db, user_id=user.id, req=req)
    log_auth(db, user_id=user.id, event="register", severity="info",
             detail=f"New customer registered: {user.email}", req=req)
    return ok(_issue_tokens(db, user), "Registered")


@app.post("/api/v1/auth/login")
def login(body: LoginIn, req: Request, db: Session = Depends(get_db)):
    user = db.query(UserModel).filter_by(email=body.email).first()

    # Lockout check
    if user and user.locked_until and user.locked_until > datetime.utcnow():
        record_login_attempt(db, email=body.email, user_id=user.id,
                             success=False, reason="account_locked", req=req)
        log_auth(db, user_id=user.id, event="login_blocked", severity="warning",
                 detail="Attempt while account locked", req=req)
        remaining = int((user.locked_until - datetime.utcnow()).total_seconds())
        raise HTTPException(423, f"Account locked. Try again in {remaining}s")

    if not user or not verify_password(body.password, user.password_hash):
        reason = "unknown_user" if not user else "bad_password"
        record_login_attempt(db, email=body.email,
                             user_id=user.id if user else None,
                             success=False, reason=reason, req=req)
        if user:
            user.failed_logins = (user.failed_logins or 0) + 1
            if user.failed_logins >= 5:
                user.locked_until = datetime.utcnow() + timedelta(seconds=300)
                log_auth(db, user_id=user.id, event="account_locked",
                         severity="danger", detail="5 failed attempts", req=req)
            db.commit()
        raise HTTPException(401, "Invalid email or password")

    if not user.is_active:
        record_login_attempt(db, email=body.email, user_id=user.id,
                             success=False, reason="inactive", req=req)
        raise HTTPException(403, "Account disabled")

    # Password OK — issue OTP challenge
    code = generate_otp()
    challenge = MfaCodeModel(
        user_id=user.id, code_hash=hash_password(code), purpose="login",
        expires_at=datetime.utcnow() + timedelta(minutes=5),
    )
    db.add(challenge); db.commit(); db.refresh(challenge)

    record_login_attempt(db, email=body.email, user_id=user.id,
                         success=True, reason="password_ok", req=req)
    log_auth(db, user_id=user.id, event="otp_sent", severity="info",
             detail=f"OTP issued (challenge {challenge.id[:8]})", req=req)

    # Demo-mode: return the code so the frontend can prefill. In prod, send SMS/email.
    payload = {"challenge_id": challenge.id, "expires_in": 300}
    if _DEMO_MODE:
        payload["demo_code"] = code
    return ok(payload, "OTP sent")


@app.post("/api/v1/auth/otp/verify")
def verify_otp(body: OtpVerifyIn, req: Request, db: Session = Depends(get_db)):
    challenge = db.get(MfaCodeModel, body.challenge_id)
    if not challenge or challenge.consumed:
        raise HTTPException(400, "Invalid or expired OTP challenge")
    if challenge.expires_at < datetime.utcnow():
        log_auth(db, user_id=challenge.user_id, event="otp_expired",
                 severity="warning", req=req)
        raise HTTPException(400, "OTP expired")
    if challenge.attempts >= 5:
        log_auth(db, user_id=challenge.user_id, event="otp_lockout",
                 severity="danger", req=req)
        raise HTTPException(429, "Too many OTP attempts")
    challenge.attempts += 1
    if not verify_password(body.code, challenge.code_hash):
        db.commit()
        log_auth(db, user_id=challenge.user_id, event="otp_failed",
                 severity="warning", req=req)
        raise HTTPException(401, "Incorrect OTP")

    challenge.consumed = True
    user = db.get(UserModel, challenge.user_id)
    user.failed_logins = 0
    user.locked_until  = None
    user.last_login_at = datetime.utcnow()
    db.commit()

    upsert_device(db, user_id=user.id, req=req)
    log_auth(db, user_id=user.id, event="login_success", severity="info",
             detail="OTP verified, session issued", req=req)
    return ok(_issue_tokens(db, user), "Authenticated")


@app.post("/api/v1/auth/refresh")
def refresh_token(body: RefreshIn, db: Session = Depends(get_db)):
    payload = decode_token(body.refresh_token)
    session = db.query(SessionModel).filter_by(refresh_token=body.refresh_token).first()
    if not session or session.expires_at < datetime.utcnow():
        raise HTTPException(401, "Refresh token invalid or expired")
    user    = db.get(UserModel, payload["sub"])
    access  = create_token({"sub": user.id}, ACCESS_EXPIRE)
    new_ref = create_token({"sub": user.id}, REFRESH_EXPIRE)
    session.refresh_token = new_ref
    session.expires_at    = datetime.utcnow() + timedelta(seconds=REFRESH_EXPIRE)
    db.commit()
    return ok({"access_token": access, "refresh_token": new_ref})


@app.post("/api/v1/auth/logout")
def logout(body: RefreshIn, req: Request, db: Session = Depends(get_db)):
    session = db.query(SessionModel).filter_by(refresh_token=body.refresh_token).first()
    uid = session.user_id if session else None
    if session:
        db.delete(session); db.commit()
    log_auth(db, user_id=uid, event="logout", severity="info", req=req)
    return ok(None, "Logged out")


@app.get("/api/v1/auth/me")
def me(user: UserModel = Depends(get_current_user)):
    return ok({"id": user.id, "email": user.email,
               "name": f"{user.first_name} {user.last_name}",
               "role": user.role.value if hasattr(user.role, "value") else user.role,
               "phone": user.phone})


@app.patch("/api/v1/auth/password")
def change_password(body: ChangePasswordIn, req: Request,
                    user: UserModel = Depends(get_current_user),
                    db: Session = Depends(get_db)):
    if not verify_password(body.current_password, user.password_hash):
        log_auth(db, user_id=user.id, event="password_change_failed",
                 severity="warning", detail="wrong current password", req=req)
        raise HTTPException(400, "Current password incorrect")
    user.password_hash = hash_password(body.new_password)
    db.commit()
    log_auth(db, user_id=user.id, event="password_changed", severity="info", req=req)
    return ok(None, "Password updated")


# ─── Admin-only audit views (not exposed to customers) ────────────────────────

@app.get("/api/v1/admin/auth-logs")
def get_auth_logs(_: UserModel = Depends(require_admin), db: Session = Depends(get_db)):
    rows = db.query(AuthLogModel).order_by(AuthLogModel.created_at.desc()).limit(200).all()
    return ok([{
        "id": r.id, "userId": r.user_id, "event": r.event, "severity": r.severity,
        "detail": r.detail, "ipAddress": r.ip_address, "userAgent": r.user_agent,
        "createdAt": r.created_at.isoformat(),
    } for r in rows])


@app.get("/api/v1/admin/login-attempts")
def get_login_attempts(_: UserModel = Depends(require_admin), db: Session = Depends(get_db)):
    rows = db.query(LoginAttemptModel).order_by(
        LoginAttemptModel.created_at.desc()).limit(200).all()
    return ok([{
        "id": r.id, "email": r.email, "userId": r.user_id, "success": r.success,
        "reason": r.reason, "ipAddress": r.ip_address, "userAgent": r.user_agent,
        "deviceId": r.device_id, "createdAt": r.created_at.isoformat(),
    } for r in rows])


@app.get("/api/v1/admin/devices")
def get_all_devices(_: UserModel = Depends(require_admin), db: Session = Depends(get_db)):
    rows = db.query(DeviceModel).order_by(DeviceModel.last_seen_at.desc()).all()
    return ok([{
        "id": r.id, "userId": r.user_id, "fingerprint": r.fingerprint,
        "userAgent": r.user_agent, "ipAddress": r.ip_address, "trusted": r.trusted,
        "lastSeenAt": r.last_seen_at.isoformat(),
        "createdAt": r.created_at.isoformat(),
    } for r in rows])


# ─── Accounts ─────────────────────────────────────────────────────────────────

def _account_dict(a: AccountModel) -> dict:
    return {"id": a.id, "name": a.name, "type": a.type, "number": a.number,
            "balance": float(a.balance), "currency": a.currency,
            "status": a.status, "createdAt": a.created_at.isoformat()}


@app.get("/api/v1/accounts")
def get_accounts(user: UserModel = Depends(get_current_user), db: Session = Depends(get_db)):
    return ok([_account_dict(a) for a in user.accounts])


@app.get("/api/v1/accounts/summary")
def get_summary(user: UserModel = Depends(get_current_user), db: Session = Depends(get_db)):
    total   = sum(float(a.balance) for a in user.accounts if a.status == AccountStatusEnum.ACTIVE)
    by_type = {t.value: 0.0 for t in AccountTypeEnum}
    for a in user.accounts:
        by_type[a.type.value] += float(a.balance)
    return ok({"totalBalance": total, "byType": by_type, "accountCount": len(user.accounts)})


@app.post("/api/v1/accounts", status_code=201)
def create_account(body: CreateAccountIn,
                   user: UserModel = Depends(get_current_user),
                   db: Session = Depends(get_db)):
    suffix  = str(uuid.uuid4().int)[:4]
    account = AccountModel(user_id=user.id, name=body.name, type=body.type,
                           number=f"****{suffix}")
    db.add(account); db.commit(); db.refresh(account)
    return ok(_account_dict(account), "Account created")


@app.get("/api/v1/accounts/{account_id}")
def get_account(account_id: str,
                user: UserModel = Depends(get_current_user),
                db: Session = Depends(get_db)):
    a = db.get(AccountModel, account_id)
    if not a or a.user_id != user.id:
        raise HTTPException(404, "Account not found")
    return ok(_account_dict(a))


@app.patch("/api/v1/accounts/{account_id}")
def update_account(account_id: str, body: UpdateAccountIn,
                   user: UserModel = Depends(get_current_user),
                   db: Session = Depends(get_db)):
    a = db.get(AccountModel, account_id)
    if not a or a.user_id != user.id:
        raise HTTPException(404, "Account not found")
    if body.name   is not None: a.name   = body.name
    if body.status is not None: a.status = body.status
    db.commit(); db.refresh(a)
    return ok(_account_dict(a), "Account updated")


# ─── Transactions ─────────────────────────────────────────────────────────────

def _tx_dict(t: TransactionModel) -> dict:
    return {"id": t.id, "fromAccountId": t.from_account_id,
            "toAccountId": t.to_account_id, "amount": float(t.amount),
            "type": t.type, "category": t.category, "description": t.description,
            "status": t.status, "reference": t.reference,
            "createdAt": t.created_at.isoformat()}


@app.get("/api/v1/transactions")
def get_transactions(limit: int = 100,
                     user: UserModel = Depends(get_current_user),
                     db: Session = Depends(get_db)):
    limit = min(max(limit, 1), 200)  # cap: 1–200
    account_ids = [a.id for a in user.accounts]
    txs = db.query(TransactionModel).filter(
        (TransactionModel.from_account_id.in_(account_ids)) |
        (TransactionModel.to_account_id.in_(account_ids))
    ).order_by(TransactionModel.created_at.desc()).limit(limit).all()
    return ok([_tx_dict(t) for t in txs])


@app.get("/api/v1/transactions/stats")
def get_stats(user: UserModel = Depends(get_current_user),
              db: Session = Depends(get_db)):
    account_ids = [a.id for a in user.accounts]
    txs = db.query(TransactionModel).filter(
        (TransactionModel.from_account_id.in_(account_ids)) |
        (TransactionModel.to_account_id.in_(account_ids))
    ).all()
    income = sum(float(t.amount) for t in txs if t.to_account_id in account_ids
                 and t.type in (TransactionTypeEnum.DEPOSIT, TransactionTypeEnum.TRANSFER))
    spend  = sum(float(t.amount) for t in txs if t.from_account_id in account_ids
                 and t.type in (TransactionTypeEnum.WITHDRAWAL, TransactionTypeEnum.PAYMENT,
                                TransactionTypeEnum.TRANSFER))
    return ok({"totalIncome": income, "totalSpend": spend, "net": income - spend,
               "transactionCount": len(txs)})


@app.post("/api/v1/transactions/transfer", status_code=201)
def transfer(body: TransferIn,
             user: UserModel = Depends(get_current_user),
             db: Session = Depends(get_db)):
    src = db.get(AccountModel, body.from_account_id)
    dst = db.get(AccountModel, body.to_account_id)
    if not src or src.user_id != user.id:
        raise HTTPException(404, "Source account not found")
    if not dst:
        raise HTTPException(404, "Destination account not found")
    if src.id == dst.id:
        raise HTTPException(400, "Cannot transfer to the same account")
    if src.status == AccountStatusEnum.FROZEN:
        raise HTTPException(400, "Source account is frozen")
    if float(src.balance) < float(body.amount):
        raise HTTPException(400, "Insufficient funds")
    src.balance = Decimal(str(src.balance)) - body.amount
    dst.balance = Decimal(str(dst.balance)) + body.amount
    tx = TransactionModel(from_account_id=src.id, to_account_id=dst.id,
                          amount=body.amount, type=TransactionTypeEnum.TRANSFER,
                          description=body.description)
    db.add(tx); db.commit(); db.refresh(tx)
    return ok(_tx_dict(tx), "Transfer completed")


# ─── Cards ────────────────────────────────────────────────────────────────────

def _card_dict(c: CardModel) -> dict:
    return {"id": c.id, "type": c.type, "label": c.label, "last4": c.last4,
            "expiry": c.expiry, "network": c.network, "status": c.status,
            "limit": float(c.limit), "spent": float(c.spent)}


@app.get("/api/v1/cards")
def get_cards(user: UserModel = Depends(get_current_user)):
    return ok([_card_dict(c) for c in user.cards])


@app.post("/api/v1/cards", status_code=201)
def create_card(body: CreateCardIn,
                user: UserModel = Depends(get_current_user),
                db: Session = Depends(get_db)):
    account = db.get(AccountModel, body.account_id)
    if not account or account.user_id != user.id:
        raise HTTPException(404, "Account not found")
    card = CardModel(user_id=user.id, account_id=body.account_id,
                     type=body.type, label=body.label,
                     last4=str(uuid.uuid4().int)[:4],
                     expiry=f"{datetime.utcnow().month:02d}/{datetime.utcnow().year + 3}")
    db.add(card); db.commit(); db.refresh(card)
    return ok(_card_dict(card), "Card created")


@app.patch("/api/v1/cards/{card_id}")
def update_card(card_id: str, body: UpdateCardIn,
                user: UserModel = Depends(get_current_user),
                db: Session = Depends(get_db)):
    c = db.get(CardModel, card_id)
    if not c or c.user_id != user.id:
        raise HTTPException(404, "Card not found")
    if body.status is not None: c.status = body.status
    if body.limit  is not None: c.limit  = body.limit
    db.commit(); db.refresh(c)
    return ok(_card_dict(c), "Card updated")


@app.delete("/api/v1/cards/{card_id}")
def delete_card(card_id: str,
                user: UserModel = Depends(get_current_user),
                db: Session = Depends(get_db)):
    c = db.get(CardModel, card_id)
    if not c or c.user_id != user.id:
        raise HTTPException(404, "Card not found")
    db.delete(c); db.commit()
    return ok(None, "Card deleted")


# ─── Loans ────────────────────────────────────────────────────────────────────

def _loan_dict(l: LoanModel) -> dict:
    return {"id": l.id, "type": l.type, "name": l.name,
            "principal": float(l.principal), "outstanding": float(l.outstanding),
            "rate": float(l.rate), "monthly": float(l.monthly),
            "termMonths": l.term_months, "status": l.status,
            "nextDueDate": l.next_due_date.isoformat()}


@app.get("/api/v1/loans")
def get_loans(user: UserModel = Depends(get_current_user)):
    return ok([_loan_dict(l) for l in user.loans])


@app.post("/api/v1/loans", status_code=201)
def create_loan(body: CreateLoanIn,
                user: UserModel = Depends(get_current_user),
                db: Session = Depends(get_db)):
    loan = LoanModel(user_id=user.id, **body.model_dump())
    loan.outstanding = body.principal
    db.add(loan); db.commit(); db.refresh(loan)
    return ok(_loan_dict(loan), "Loan created")


# ─── Savings Goals ────────────────────────────────────────────────────────────

def _savings_dict(s: SavingsGoalModel) -> dict:
    return {"id": s.id, "name": s.name, "emoji": s.emoji,
            "target": float(s.target), "saved": float(s.saved),
            "monthly": float(s.monthly),
            "deadline": s.deadline.isoformat() if s.deadline else None,
            "progress": round(float(s.saved) / float(s.target) * 100, 1) if s.target else 0}


@app.get("/api/v1/savings")
def get_savings(user: UserModel = Depends(get_current_user)):
    return ok([_savings_dict(s) for s in user.savings])


@app.post("/api/v1/savings", status_code=201)
def create_savings(body: CreateSavingsIn,
                   user: UserModel = Depends(get_current_user),
                   db: Session = Depends(get_db)):
    goal = SavingsGoalModel(user_id=user.id, **body.model_dump())
    db.add(goal); db.commit(); db.refresh(goal)
    return ok(_savings_dict(goal), "Savings goal created")


# ─── Investments ──────────────────────────────────────────────────────────────

def _inv_dict(i: InvestmentModel) -> dict:
    return {"id": i.id, "symbol": i.symbol, "name": i.name,
            "shares": float(i.shares), "avgPrice": float(i.avg_price),
            "value": float(i.shares) * float(i.avg_price)}


@app.get("/api/v1/investments")
def get_investments(user: UserModel = Depends(get_current_user)):
    return ok([_inv_dict(i) for i in user.investments])


@app.post("/api/v1/investments", status_code=201)
def create_investment(body: CreateInvestmentIn,
                      user: UserModel = Depends(get_current_user),
                      db: Session = Depends(get_db)):
    inv = InvestmentModel(user_id=user.id, **body.model_dump())
    db.add(inv); db.commit(); db.refresh(inv)
    return ok(_inv_dict(inv), "Investment added")


# ─── Users ────────────────────────────────────────────────────────────────────

def _profile_dict(u: UserModel) -> dict:
    return {
        "id": u.id, "email": u.email,
        "name": f"{u.first_name} {u.last_name}",
        "firstName": u.first_name, "lastName": u.last_name,
        "phone": u.phone,
        "role": u.role.value if hasattr(u.role, "value") else u.role,
        "dateOfBirth": u.date_of_birth, "nationalId": u.national_id,
        "addressLine1": u.address_line1, "addressLine2": u.address_line2,
        "city": u.city, "state": u.state, "postalCode": u.postal_code,
        "country": u.country,
        "lastLoginAt": u.last_login_at.isoformat() if u.last_login_at else None,
        "createdAt": u.created_at.isoformat(),
    }


@app.get("/api/v1/users/me")
def get_profile(user: UserModel = Depends(get_current_user)):
    return ok(_profile_dict(user))


@app.patch("/api/v1/users/me")
def update_profile(body: UpdateProfileIn, req: Request,
                   user: UserModel = Depends(get_current_user),
                   db: Session = Depends(get_db)):
    changed = []
    for field, value in body.model_dump(exclude_unset=True).items():
        if value is None:
            continue
        if getattr(user, field) != value:
            setattr(user, field, value)
            changed.append(field)
    db.commit(); db.refresh(user)
    if changed:
        log_auth(db, user_id=user.id, event="profile_updated", severity="info",
                 detail=f"fields: {', '.join(changed)}", req=req)
    return ok(_profile_dict(user), "Profile updated")


@app.get("/api/v1/users/me/devices")
def get_my_devices(user: UserModel = Depends(get_current_user),
                   db: Session = Depends(get_db)):
    rows = db.query(DeviceModel).filter_by(user_id=user.id).order_by(
        DeviceModel.last_seen_at.desc()).all()
    return ok([{
        "id": r.id, "userAgent": r.user_agent, "ipAddress": r.ip_address,
        "trusted": r.trusted, "lastSeenAt": r.last_seen_at.isoformat(),
        "createdAt": r.created_at.isoformat(),
    } for r in rows])


# ─── API Keys ────────────────────────────────────────────────────────────────

class CreateApiKeyIn(BaseModel):
    name: str
    scopes: str = "read"
    expires_in_days: Optional[int] = None

@app.get("/api/v1/api-keys")
def list_api_keys(user: UserModel = Depends(get_current_user),
                  db: Session = Depends(get_db)):
    rows = db.query(ApiKeyModel).filter_by(user_id=user.id, revoked=False)\
             .order_by(ApiKeyModel.created_at.desc()).all()
    return ok([{
        "id": r.id, "name": r.name, "prefix": r.prefix,
        "scopes": r.scopes, "lastUsed": r.last_used.isoformat() if r.last_used else None,
        "expiresAt": r.expires_at.isoformat() if r.expires_at else None,
        "createdAt": r.created_at.isoformat(),
    } for r in rows])

@app.post("/api/v1/api-keys", status_code=201)
def create_api_key(body: CreateApiKeyIn,
                   user: UserModel = Depends(get_current_user),
                   db: Session = Depends(get_db)):
    # Generate a secure random key: nvb_<40 hex chars>
    raw_key = f"nvb_{secrets.token_hex(20)}"
    prefix = raw_key[:8]
    key_hash = hashlib.sha256(raw_key.encode()).hexdigest()
    expires_at = None
    if body.expires_in_days:
        expires_at = datetime.utcnow() + timedelta(days=body.expires_in_days)
    row = ApiKeyModel(
        user_id=user.id, name=body.name, prefix=prefix,
        key_hash=key_hash, scopes=body.scopes, expires_at=expires_at,
    )
    db.add(row); db.commit(); db.refresh(row)
    # Return the full key ONLY on creation — it's never stored or shown again
    return ok({
        "id": row.id, "name": row.name, "key": raw_key,
        "prefix": prefix, "scopes": row.scopes,
        "expiresAt": row.expires_at.isoformat() if row.expires_at else None,
        "createdAt": row.created_at.isoformat(),
    }, "API key created. Copy it now — it won't be shown again.")

@app.delete("/api/v1/api-keys/{key_id}")
def revoke_api_key(key_id: str,
                   user: UserModel = Depends(get_current_user),
                   db: Session = Depends(get_db)):
    row = db.query(ApiKeyModel).filter_by(id=key_id, user_id=user.id).first()
    if not row:
        raise HTTPException(404, "API key not found")
    row.revoked = True
    db.commit()
    return ok(None, "API key revoked")


# ─── Seed demo data (runs once on startup if DB is empty) ─────────────────────

def seed_demo_data():
    db = SessionLocal()
    try:
        if db.query(UserModel).count() > 0:
            return
        print("[seed] Creating demo users + sample data…")
        demo = UserModel(
            email="demo@novabank.com",
            password_hash=hash_password("password"),
            first_name="Alex", last_name="Johnson",
            phone="+1-415-555-0134",
            date_of_birth="1988-06-14",
            national_id="XXX-XX-4891",
            address_line1="215 Market Street, Apt 9B",
            city="San Francisco", state="CA",
            postal_code="94103", country="USA",
        )
        admin = UserModel(
            email="admin@novabank.com",
            password_hash=hash_password("admin1234"),
            first_name="Sam", last_name="Admin",
            role=RoleEnum.ADMIN,
        )
        db.add_all([demo, admin]); db.commit()
        db.refresh(demo)

        checking = AccountModel(user_id=demo.id, name="Everyday Checking",
                                type=AccountTypeEnum.CHECKING, number="****4823",
                                balance=Decimal("12458.90"))
        savings  = AccountModel(user_id=demo.id, name="High-Yield Savings",
                                type=AccountTypeEnum.SAVINGS, number="****7291",
                                balance=Decimal("48210.50"))
        invest   = AccountModel(user_id=demo.id, name="Brokerage",
                                type=AccountTypeEnum.INVESTMENT, number="****3345",
                                balance=Decimal("127843.22"))
        db.add_all([checking, savings, invest]); db.commit()

        merchants = [
            ("Whole Foods Market",    "Groceries",     -84.32),
            ("Shell",                 "Transport",     -52.10),
            ("Spotify Premium",       "Entertainment", -11.99),
            ("Acme Corp Salary",      "Income",       4200.00),
            ("Starbucks",             "Dining",         -7.85),
            ("Amazon",                "Shopping",      -156.40),
            ("PG&E",                  "Utilities",    -142.55),
            ("Netflix",               "Entertainment", -15.49),
            ("Trader Joe's",          "Groceries",     -67.21),
            ("Uber",                  "Transport",     -23.40),
        ]
        now = datetime.utcnow()
        for i, (desc, cat, amt) in enumerate(merchants):
            if amt > 0:
                tx = TransactionModel(to_account_id=checking.id, amount=Decimal(str(amt)),
                                      type=TransactionTypeEnum.DEPOSIT,
                                      category=cat, description=desc,
                                      created_at=now - timedelta(days=i))
            else:
                tx = TransactionModel(from_account_id=checking.id,
                                      amount=Decimal(str(abs(amt))),
                                      type=TransactionTypeEnum.PAYMENT,
                                      category=cat, description=desc,
                                      created_at=now - timedelta(days=i))
            db.add(tx)

        db.add(CardModel(user_id=demo.id, account_id=checking.id,
                         type=CardTypeEnum.DEBIT, label="Nova Debit",
                         last4="4823", expiry="09/28", network="Visa",
                         limit=Decimal("5000")))
        db.add(CardModel(user_id=demo.id, account_id=checking.id,
                         type=CardTypeEnum.CREDIT, label="Nova Platinum",
                         last4="7781", expiry="11/27", network="Mastercard",
                         limit=Decimal("15000"), spent=Decimal("2348.22")))

        db.add(LoanModel(user_id=demo.id, type=LoanTypeEnum.HOME, name="Home Mortgage",
                         principal=Decimal("420000"), outstanding=Decimal("312450"),
                         rate=Decimal("6.25"), monthly=Decimal("2584.11"),
                         term_months=360,
                         next_due_date=now + timedelta(days=14)))

        db.add(SavingsGoalModel(user_id=demo.id, name="Europe Trip 2026",
                                emoji="✈️", target=Decimal("8000"),
                                saved=Decimal("3250"), monthly=Decimal("500")))
        db.add(SavingsGoalModel(user_id=demo.id, name="Emergency Fund",
                                emoji="🛡️", target=Decimal("20000"),
                                saved=Decimal("14800"), monthly=Decimal("800")))

        db.add(InvestmentModel(user_id=demo.id, symbol="AAPL", name="Apple Inc.",
                               shares=Decimal("45"), avg_price=Decimal("178.50")))
        db.add(InvestmentModel(user_id=demo.id, symbol="VOO",
                               name="Vanguard S&P 500 ETF",
                               shares=Decimal("32"), avg_price=Decimal("428.10")))

        db.commit()
        print("[seed] Done. Demo: demo@novabank.com / password  |  Admin: admin@novabank.com / admin1234")
    finally:
        db.close()


seed_demo_data()


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=4000, reload=True)
