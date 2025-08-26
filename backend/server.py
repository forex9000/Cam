from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, UploadFile, File
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr
from passlib.context import CryptContext
from jose import JWTError, jwt
from datetime import datetime, timedelta
import os
import logging
from pathlib import Path
import uuid
from typing import List, Optional
import base64

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Configuration
SECRET_KEY = "your-secret-key-change-in-production"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Security
security = HTTPBearer()

# Create the main app
app = FastAPI()
api_router = APIRouter(prefix="/api")

# Models
class UserCreate(BaseModel):
    email: EmailStr
    password: str
    phone: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str

class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: EmailStr
    phone: Optional[str] = None
    hashed_password: str
    created_at: datetime = Field(default_factory=datetime.utcnow)

class VideoRecord(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    video_data: str  # base64 encoded video
    location_lat: Optional[float] = None
    location_lng: Optional[float] = None
    phone_number: Optional[str] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class VideoUpload(BaseModel):
    video_data: str  # base64 encoded
    location_lat: Optional[float] = None
    location_lng: Optional[float] = None
    phone_number: Optional[str] = None

# Auth utility functions
def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    user = await db.users.find_one({"email": email})
    if user is None:
        raise credentials_exception
    return user

# Authentication routes
@api_router.post("/register", response_model=Token)
async def register(user: UserCreate):
    # Check if user already exists
    existing_user = await db.users.find_one({"email": user.email})
    if existing_user:
        raise HTTPException(
            status_code=400,
            detail="Email already registered"
        )
    
    # Create new user
    hashed_password = get_password_hash(user.password)
    user_obj = User(
        email=user.email,
        phone=user.phone,
        hashed_password=hashed_password
    )
    
    await db.users.insert_one(user_obj.dict())
    
    # Create access token
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.email}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@api_router.post("/login", response_model=Token)
async def login(user: UserLogin):
    # Verify user
    db_user = await db.users.find_one({"email": user.email})
    if not db_user or not verify_password(user.password, db_user["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Create access token
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.email}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@api_router.get("/me")
async def get_current_user_info(current_user: dict = Depends(get_current_user)):
    return {
        "id": current_user["id"],
        "email": current_user["email"],
        "phone": current_user.get("phone"),
        "created_at": current_user["created_at"]
    }

# Video routes
@api_router.post("/videos/upload")
async def upload_video(video: VideoUpload, current_user: dict = Depends(get_current_user)):
    video_record = VideoRecord(
        user_id=current_user["id"],
        video_data=video.video_data,
        location_lat=video.location_lat,
        location_lng=video.location_lng,
        phone_number=video.phone_number
    )
    
    result = await db.videos.insert_one(video_record.dict())
    return {"message": "Video uploaded successfully", "video_id": video_record.id}

@api_router.get("/videos")
async def get_user_videos(current_user: dict = Depends(get_current_user)):
    videos = await db.videos.find({"user_id": current_user["id"]}).to_list(1000)
    # Don't send full video data in list view for performance
    return [{
        "id": video["id"],
        "timestamp": video["timestamp"],
        "location_lat": video.get("location_lat"),
        "location_lng": video.get("location_lng"),
        "phone_number": video.get("phone_number")
    } for video in videos]

@api_router.get("/videos/{video_id}")
async def get_video(video_id: str, current_user: dict = Depends(get_current_user)):
    video = await db.videos.find_one({"id": video_id, "user_id": current_user["id"]})
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")
    # Remove MongoDB _id field to avoid serialization issues
    if "_id" in video:
        del video["_id"]
    return video

@api_router.delete("/videos/{video_id}")
async def delete_video(video_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.videos.delete_one({"id": video_id, "user_id": current_user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Video not found")
    return {"message": "Video deleted successfully"}

# Test routes
@api_router.get("/")
async def root():
    return {"message": "Video Recording API"}

# Include router
app.include_router(api_router)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()