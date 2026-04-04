"""
NovaBanc Python Backend — FastAPI
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

from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
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
    created_at    = Column(DateTime, default=datetime.utcnow)
    updated_at    = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    accounts    = relationship("AccountModel",     back_populates="user", cascade="all, delete")
    cards       = relationship("CardModel",        back_populates="user", cascade="all, delete")
    loans       = relationship("LoanModel",        back_populates="user", cascade="all, delete")
    savings     = relationship("SavingsGoalModel", back_populates="user", cascade="all, delete")
    investments = relationship("InvestmentModel",  back_populates="user", cascade="all, delete")
    sessions    = relationship("SessionModel",     back_populates="user", cascade="all, delete")


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


Base.metadata.create_all(bind=engine)


# ─── Auth helpers ─────────────────────────────────────────────────────────────

pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")
bearer  = HTTPBearer()


def hash_password(plain: str) -> str:
    return pwd_ctx.hash(plain)

def verify_password(plain: str, hashed: str) -> bool:
    return pwd_ctx.verify(plain, hashed)

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


# ─── Pydantic schemas ─────────────────────────────────────────────────────────

class RegisterIn(BaseModel):
    email:      EmailStr
    password:   str
    first_name: str
    last_name:  str
    phone:      Optional[str] = None

    @field_validator("password")
    @classmethod
    def pw_strength(cls, v):
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        return v

class LoginIn(BaseModel):
    email:    EmailStr
    password: str

class RefreshIn(BaseModel):
    refresh_token: str

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

app = FastAPI(title="NovaBanc API", version="1.0.0", docs_url="/api/docs")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def ok(data, message="Success"):
    return {"success": True, "message": message, "data": data}


# ─── Health ───────────────────────────────────────────────────────────────────

@app.get("/api/v1/health")
def health():
    return {"status": "ok", "timestamp": datetime.utcnow().isoformat(), "version": "1.0.0"}


# ─── Auth ─────────────────────────────────────────────────────────────────────

@app.post("/api/v1/auth/register", status_code=201)
def register(body: RegisterIn, db: Session = Depends(get_db)):
    if db.query(UserModel).filter_by(email=body.email).first():
        raise HTTPException(400, "Email already registered")
    user = UserModel(
        email=body.email,
        password_hash=hash_password(body.password),
        first_name=body.first_name,
        last_name=body.last_name,
        phone=body.phone,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    access  = create_token({"sub": user.id, "role": user.role}, ACCESS_EXPIRE)
    refresh = create_token({"sub": user.id}, REFRESH_EXPIRE)
    session = SessionModel(user_id=user.id, refresh_token=refresh,
                           expires_at=datetime.utcnow() + timedelta(seconds=REFRESH_EXPIRE))
    db.add(session); db.commit()
    return ok({"access_token": access, "refresh_token": refresh,
               "user": {"id": user.id, "email": user.email,
                        "name": f"{user.first_name} {user.last_name}"}}, "Registered")


@app.post("/api/v1/auth/login")
def login(body: LoginIn, db: Session = Depends(get_db)):
    user = db.query(UserModel).filter_by(email=body.email).first()
    if not user or not verify_password(body.password, user.password_hash):
        raise HTTPException(401, "Invalid email or password")
    if not user.is_active:
        raise HTTPException(403, "Account disabled")
    access  = create_token({"sub": user.id, "role": user.role}, ACCESS_EXPIRE)
    refresh = create_token({"sub": user.id}, REFRESH_EXPIRE)
    session = SessionModel(user_id=user.id, refresh_token=refresh,
                           expires_at=datetime.utcnow() + timedelta(seconds=REFRESH_EXPIRE))
    db.add(session); db.commit()
    return ok({"access_token": access, "refresh_token": refresh,
               "user": {"id": user.id, "email": user.email,
                        "name": f"{user.first_name} {user.last_name}"}}, "Logged in")


@app.post("/api/v1/auth/refresh")
def refresh_token(body: RefreshIn, db: Session = Depends(get_db)):
    payload = decode_token(body.refresh_token)
    session = db.query(SessionModel).filter_by(refresh_token=body.refresh_token).first()
    if not session or session.expires_at < datetime.utcnow():
        raise HTTPException(401, "Refresh token invalid or expired")
    user    = db.get(UserModel, payload["sub"])
    access  = create_token({"sub": user.id, "role": user.role}, ACCESS_EXPIRE)
    new_ref = create_token({"sub": user.id}, REFRESH_EXPIRE)
    session.refresh_token = new_ref
    session.expires_at    = datetime.utcnow() + timedelta(seconds=REFRESH_EXPIRE)
    db.commit()
    return ok({"access_token": access, "refresh_token": new_ref})


@app.post("/api/v1/auth/logout")
def logout(body: RefreshIn, db: Session = Depends(get_db)):
    session = db.query(SessionModel).filter_by(refresh_token=body.refresh_token).first()
    if session:
        db.delete(session); db.commit()
    return ok(None, "Logged out")


@app.get("/api/v1/auth/me")
def me(user: UserModel = Depends(get_current_user)):
    return ok({"id": user.id, "email": user.email,
               "name": f"{user.first_name} {user.last_name}",
               "role": user.role, "phone": user.phone})


@app.patch("/api/v1/auth/password")
def change_password(body: ChangePasswordIn,
                    user: UserModel = Depends(get_current_user),
                    db: Session = Depends(get_db)):
    if not verify_password(body.current_password, user.password_hash):
        raise HTTPException(400, "Current password incorrect")
    user.password_hash = hash_password(body.new_password)
    db.commit()
    return ok(None, "Password updated")


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
def get_transactions(user: UserModel = Depends(get_current_user),
                     db: Session = Depends(get_db)):
    account_ids = [a.id for a in user.accounts]
    txs = db.query(TransactionModel).filter(
        (TransactionModel.from_account_id.in_(account_ids)) |
        (TransactionModel.to_account_id.in_(account_ids))
    ).order_by(TransactionModel.created_at.desc()).all()
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

@app.get("/api/v1/users/me")
def get_profile(user: UserModel = Depends(get_current_user)):
    return ok({"id": user.id, "email": user.email,
               "name": f"{user.first_name} {user.last_name}",
               "firstName": user.first_name, "lastName": user.last_name,
               "phone": user.phone, "role": user.role,
               "createdAt": user.created_at.isoformat()})


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=4000, reload=True)
