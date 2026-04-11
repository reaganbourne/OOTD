from fastapi import APIRouter

router = APIRouter(prefix="/auth", tags=["auth"])

# Endpoints implemented in feature-be-jwt-auth (Issue 8)
# POST /auth/register
# POST /auth/login
# POST /auth/refresh
# POST /auth/logout
# GET  /auth/me
