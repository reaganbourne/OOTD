import uuid

from sqlalchemy.orm import Session

from app.models.follow import Follow


def is_following(db: Session, follower_id: uuid.UUID, following_id: uuid.UUID) -> bool:
    return (
        db.query(Follow)
        .filter(Follow.follower_id == follower_id, Follow.following_id == following_id)
        .first()
        is not None
    )


def follow(db: Session, follower_id: uuid.UUID, following_id: uuid.UUID) -> None:
    if is_following(db, follower_id, following_id):
        return
    db.add(Follow(follower_id=follower_id, following_id=following_id))
    db.commit()


def unfollow(db: Session, follower_id: uuid.UUID, following_id: uuid.UUID) -> None:
    row = (
        db.query(Follow)
        .filter(Follow.follower_id == follower_id, Follow.following_id == following_id)
        .first()
    )
    if row:
        db.delete(row)
        db.commit()


def follower_count(db: Session, user_id: uuid.UUID) -> int:
    return db.query(Follow).filter(Follow.following_id == user_id).count()


def following_count(db: Session, user_id: uuid.UUID) -> int:
    return db.query(Follow).filter(Follow.follower_id == user_id).count()


def following_ids(db: Session, user_id: uuid.UUID) -> list[uuid.UUID]:
    rows = db.query(Follow.following_id).filter(Follow.follower_id == user_id).all()
    return [r[0] for r in rows]
