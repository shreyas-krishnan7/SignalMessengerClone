import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, UploadFile

from ..models import User
from ..schemas import UploadOut
from ..security import get_current_user

UPLOAD_DIR = Path(__file__).resolve().parent.parent.parent / "uploads"
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB

router = APIRouter(prefix="/api/uploads", tags=["uploads"])


@router.post("", response_model=UploadOut)
async def upload_file(file: UploadFile, _: User = Depends(get_current_user)):
    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(400, "File is too large (max 10 MB)")

    # Random naam se save karte hain taaki do files ka naam same hone pe overwrite na ho
    extension = Path(file.filename or "").suffix.lower()
    stored_name = f"{uuid.uuid4().hex}{extension}"
    UPLOAD_DIR.mkdir(exist_ok=True)
    (UPLOAD_DIR / stored_name).write_bytes(content)

    return UploadOut(
        url=f"/uploads/{stored_name}",
        name=file.filename or stored_name,
        content_type=file.content_type or "application/octet-stream",
    )
