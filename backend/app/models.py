import uuid

from pydantic import EmailStr
from sqlmodel import Field, Relationship, SQLModel
import datetime
# Shared properties
class UserAgentBase(SQLModel):
    user_agent: str = Field(unique=True, index=True, max_length=512)
    device: str = Field(default="desktop", max_length=50)  # e.g., desktop, mobile, tablet
    browser: str | None = Field(default=None, max_length=100)
    os: str | None = Field(default=None, max_length=100)
    percentage: float | None = Field(default=None)  # Percentage usage if applicable


# Properties to receive via API on creation
class UserAgentCreate(UserAgentBase):
    pass


# Properties to receive via API on update
class UserAgentUpdate(SQLModel):
    user_agent: str | None = Field(default=None, max_length=512)
    device: str | None = Field(default=None, max_length=50)
    browser: str | None = Field(default=None, max_length=100)
    os: str | None = Field(default=None, max_length=100)
    percentage: float | None = Field(default=None)


# Database model, table inferred from class name
class UserAgent(UserAgentBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)


# Properties to return via API
class UserAgentPublic(UserAgentBase):
    id: uuid.UUID


class UserAgentsPublic(SQLModel):
    data: list[UserAgentPublic]
    count: int

# Shared properties
class UserBase(SQLModel):
    email: EmailStr = Field(unique=True, index=True, max_length=255)
    is_active: bool = True
    is_superuser: bool = False
    full_name: str | None = Field(default=None, max_length=255)
    has_subscription: bool = Field(default=False)  # Tracks active paid subscription
    is_trial: bool = Field(default=False)         # Tracks trial status
    is_deactivated: bool = Field(default=False)   # Tracks if subscription is deactivated

# Properties to receive via API on creation
class UserCreate(UserBase):
    password: str = Field(min_length=8, max_length=40)


class UserRegister(SQLModel):
    email: EmailStr = Field(max_length=255)
    password: str = Field(min_length=8, max_length=40)
    full_name: str | None = Field(default=None, max_length=255)


# Properties to receive via API on update, all are optional
class UserUpdate(UserBase):
    email: EmailStr | None = Field(default=None, max_length=255)  # type: ignore
    password: str | None = Field(default=None, min_length=8, max_length=40)


class UserUpdateMe(SQLModel):
    full_name: str | None = Field(default=None, max_length=255)
    email: EmailStr | None = Field(default=None, max_length=255)


class UpdatePassword(SQLModel):
    current_password: str = Field(min_length=8, max_length=40)
    new_password: str = Field(min_length=8, max_length=40)


class User(UserBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    hashed_password: str
    expiry_date: datetime.datetime | None = Field(default=None)  # Add this
    items: list["Item"] = Relationship(back_populates="owner", cascade_delete=True)
    tickets: list["Ticket"] = Relationship(back_populates="owner", cascade_delete=True)
# Properties to return via API, id is always required
class UserPublic(UserBase):
    id: uuid.UUID

class SubscriptionStatus(SQLModel):
    hasSubscription: bool
    isTrial: bool
    isDeactivated: bool
class UsersPublic(SQLModel):
    data: list[UserPublic]
    count: int


# Shared properties
class ItemBase(SQLModel):
    title: str = Field(min_length=1, max_length=255)
    description: str | None = Field(default=None, max_length=255)


# Properties to receive on item creation
class ItemCreate(ItemBase):
    pass


# Properties to receive on item update
class ItemUpdate(ItemBase):
    title: str | None = Field(default=None, min_length=1, max_length=255)  # type: ignore


# Database model, database table inferred from class name
class Item(ItemBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    title: str = Field(max_length=255)
    owner_id: uuid.UUID = Field(
        foreign_key="user.id", nullable=False, ondelete="CASCADE"
    )
    owner: User | None = Relationship(back_populates="items")


# Properties to return via API, id is always required
class ItemPublic(ItemBase):
    id: uuid.UUID
    owner_id: uuid.UUID


class ItemsPublic(SQLModel):
    data: list[ItemPublic]
    count: int


# Shared properties
class TicketBase(SQLModel):
    title: str = Field(min_length=1, max_length=255)
    description: str = Field(min_length=1)
    status: str = Field(default="open", max_length=50)


# Properties to receive on ticket creation
class TicketCreate(TicketBase):
    pass


# Properties to receive on ticket update
class TicketUpdate(TicketBase):
    title: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = Field(default=None, min_length=1)
    status: str | None = Field(default=None, max_length=50)


# Database model, database table inferred from class name
class Ticket(TicketBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    created_at: datetime.datetime = Field(default_factory=datetime.datetime.utcnow)
    owner_id: uuid.UUID = Field(
        foreign_key="user.id", nullable=False, ondelete="CASCADE"
    )
    owner: User | None = Relationship(back_populates="tickets")


# Properties to return via API, id is always required
class TicketPublic(TicketBase):
    id: uuid.UUID
    owner_id: uuid.UUID
    created_at: datetime.datetime


class TicketsPublic(SQLModel):
    data: list[TicketPublic]
    count: int


# Generic message
class Message(SQLModel):
    message: str


# JSON payload containing access token
class Token(SQLModel):
    access_token: str
    token_type: str = "bearer"


# Contents of JWT token
class TokenPayload(SQLModel):
    sub: str | None = None


class NewPassword(SQLModel):
    token: str
    new_password: str = Field(min_length=8, max_length=40)

# S3 Configuration Models
class S3ConfigurationBase(SQLModel):
    name: str = Field(unique=True, index=True, max_length=255)
    bucket_name: str = Field(max_length=255)
    endpoint_url: str = Field(max_length=512)
    region_name: str = Field(default="auto", max_length=100)
    access_key_id: str = Field(max_length=255)
    secret_access_key: str = Field(max_length=255)

class S3Configuration(S3ConfigurationBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)

class S3ConfigurationCreate(S3ConfigurationBase):
    pass

class S3ConfigurationUpdate(SQLModel):
    name: str | None = Field(default=None, max_length=255)
    bucket_name: str | None = Field(default=None, max_length=255)
    endpoint_url: str | None = Field(default=None, max_length=512)
    region_name: str | None = Field(default=None, max_length=100)
    access_key_id: str | None = Field(default=None, max_length=255)
    secret_access_key: str | None = Field(default=None, max_length=255)

class S3ConfigurationPublic(S3ConfigurationBase):
    id: uuid.UUID

class S3ConfigurationsPublic(SQLModel):
    data: list[S3ConfigurationPublic]
    count: int
