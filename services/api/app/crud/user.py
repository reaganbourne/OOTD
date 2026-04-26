import uuid

from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from app.models.user import User

_UNSET = object()  # sentinel for "caller did not pass this field"


def get_by_email(db: Session, email: str) -> User | None:
    return db.query(User).filter(User.email == email.lower()).first()


def get_by_username(db: Session, username: str) -> User | None:
    return db.query(User).filter(User.username == username).first()


def get_by_id(db: Session, user_id: uuid.UUID) -> User | None:
    return db.query(User).filter(User.id == user_id).first()


def create_user(db: Session, username: str, email: str, password_hash: str) -> User:
    user = User(
        username=username,
        email=email.lower(),
        password_hash=password_hash,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def update_profile(
    db: Session,
    user: User,
    display_name: object = _UNSET,
    bio: object = _UNSET,
    username: object = _UNSET,
) -> User:
    """
    Partial update — only fields explicitly passed are written.
    Caller is responsible for checking username uniqueness before calling.
    """
    if display_name is not _UNSET:
        user.display_name = display_name  # type: ignore[assignment]
    if bio is not _UNSET:
        user.bio = bio  # type: ignore[assignment]
    if username is not _UNSET:
        user.username = username  # type: ignore[assignment]
    db.commit()
    db.refresh(user)
    return user


def set_avatar(db: Session, user: User, url: str) -> User:
    """Store the S3 URL for the user's profile photo."""
    user.profile_image_url = url
    db.commit()
    db.refresh(user)
    return user


def search(db: Session, q: str, limit: int = 20) -> list[User]:
    """Case-insensitive substring search on username and display_name."""
    term = f"%{q.lower()}%"
    return (
        db.query(User)
        .filter(
            or_(
                func.lower(User.username).like(term),
                func.lower(User.display_name).like(term),
            )
        )
        .order_by(User.username)
        .limit(limit)
        .all()
    )


def suggested(
    db: Session,
    current_user_id: uuid.UUID,
    limit: int = 10,
) -> list[User]:
    """
    Suggested users to follow.
    Strategy: friends-of-friends first, padded with most-followed globally.
    Excludes the current user and anyone already followed.
    """
    from app.models.follow import Follow

    # IDs the current user already follows
    already_following_sq = (
        db.query(Follow.following_id)
        .filter(Follow.follower_id == current_user_id)
        .subquery()
    )

    # Friends of friends
    fof_sq = (
        db.query(Follow.following_id)
        .filter(Follow.follower_id.in_(already_following_sq.select()))
        .filter(Follow.following_id != current_user_id)
        .filter(Follow.following_id.notin_(already_following_sq.select()))
        .subquery()
    )

    candidates = (
        db.query(User)
        .filter(User.id.in_(fof_sq.select()))
        .limit(limit)
        .all()
    )

    # Pad with globally popular users if not enough
    if len(candidates) < limit:
        exclude_ids = (
            {u.id for u in candidates}
            | {current_user_id}
            | {row[0] for row in db.query(Follow.following_id)
               .filter(Follow.follower_id == current_user_id).all()}
        )
        popular = (
            db.query(User)
            .filter(User.id.notin_(exclude_ids))
            .outerjoin(Follow, Follow.following_id == User.id)
            .group_by(User.id)
            .order_by(func.count(Follow.follower_id).desc())
            .limit(limit - len(candidates))
            .all()
        )
        candidates += popular

    return candidates
