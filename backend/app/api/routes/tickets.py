import uuid
from typing import Any

from fastapi import APIRouter, HTTPException
from sqlmodel import func, select

from app.api.deps import CurrentUser, SessionDep
from app.models import Item, ItemCreate, ItemPublic, ItemsPublic, ItemUpdate, Message

router = APIRouter(prefix="/tickets", tags=["tickets"])


@router.get("/", response_model=ItemsPublic)
def read_tickets(
    session: SessionDep, current_user: CurrentUser, skip: int = 0, limit: int = 100
) -> Any:
    """
    Retrieve tickets.
    """

    if current_user.is_superuser:
        count_statement = select(func.count()).select_from(Item)
        count = session.exec(count_statement).one()
        statement = select(Item).offset(skip).limit(limit)
        tickets = session.exec(statement).all()
    else:
        count_statement = (
            select(func.count())
            .select_from(Item)
            .where(Item.owner_id == current_user.id)
        )
        count = session.exec(count_statement).one()
        statement = (
            select(Item)
            .where(Item.owner_id == current_user.id)
            .offset(skip)
            .limit(limit)
        )
        tickets = session.exec(statement).all()

    return ItemsPublic(data=tickets, count=count)


@router.get("/{id}", response_model=ItemPublic)
def read_ticket(session: SessionDep, current_user: CurrentUser, id: uuid.UUID) -> Any:
    """
    Get ticket by ID.
    """
    ticket = session.get(Item, id)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    if not current_user.is_superuser and (ticket.owner_id != current_user.id):
        raise HTTPException(status_code=400, detail="Not enough permissions")
    return ticket


@router.post("/", response_model=ItemPublic)
def create_ticket(
    *, session: SessionDep, current_user: CurrentUser, ticket_in: ItemCreate
) -> Any:
    """
    Create new ticket.
    """
    ticket = Item.model_validate(ticket_in, update={"owner_id": current_user.id})
    session.add(ticket)
    session.commit()
    session.refresh(ticket)
    return ticket


@router.put("/{id}", response_model=ItemPublic)
def update_ticket(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    id: uuid.UUID,
    ticket_in: ItemUpdate,
) -> Any:
    """
    Update a ticket.
    """
    ticket = session.get(Item, id)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    if not current_user.is_superuser and (ticket.owner_id != current_user.id):
        raise HTTPException(status_code=400, detail="Not enough permissions")
    update_dict = ticket_in.model_dump(exclude_unset=True)
    ticket.sqlmodel_update(update_dict)
    session.add(ticket)
    session.commit()
    session.refresh(ticket)
    return ticket


@router.delete("/{id}")
def delete_ticket(
    session: SessionDep, current_user: CurrentUser, id: uuid.UUID
) -> Message:
    """
    Delete a ticket.
    """
    ticket = session.get(Item, id)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    if not current_user.is_superuser and (ticket.owner_id != current_user.id):
        raise HTTPException(status_code=400, detail="Not enough permissions")
    session.delete(ticket)
    session.commit()
    return Message(message="Ticket deleted successfully")
