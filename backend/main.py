from fastapi import FastAPI, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from recommender import SwipeBrain
from utils.db import get_conn
from psycopg import OperationalError
from fastapi.responses import FileResponse
import pathlib

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000","https://food-recommender-drab.vercel.app"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = pathlib.Path(__file__).parent

# ---------------- Persistent connections per session ----------------
session_conns = {}

@app.get("/start/{sid}")
def start_session(sid:str):
    
    # create and store a persistent connection for this session
    conn = get_conn()
    session_conns[sid] = conn
    with conn.cursor() as cur:
        cur.execute("INSERT INTO swipe_sessions(id) VALUES(%s) ON CONFLICT DO NOTHING", (sid,))
        conn.commit()
    return {"session_id": sid}

def get_session_conn(sid: str):
    """Get existing connection or create new one if session exists in DB"""
    conn = session_conns.get(sid)
    
    # Check if connection exists and is still alive
    if conn:
        try:
            # Test if connection is still alive
            with conn.cursor() as cur:
                cur.execute("SELECT 1")
        except (OperationalError, Exception):
            # Connection is dead, remove it and create a new one
            try:
                conn.close()
            except:
                pass
            conn = None
            session_conns.pop(sid, None)
    
    # Create new connection if needed
    if not conn:
        conn = get_conn()
        with conn.cursor() as cur:
            cur.execute("SELECT id FROM swipe_sessions WHERE id=%s", (sid,))
            if not cur.fetchone():
                conn.close()
                raise HTTPException(status_code=404, detail="Session not found")
        session_conns[sid] = conn
    
    return conn

# Update your super_swipe endpoint
@app.post("/super/{sid}")
def super_swipe(sid: str):
    try:
        conn = get_session_conn(sid)
        brain = SwipeBrain(sid, conn)
        stats = brain.get_stats()
        return stats
    except HTTPException:
        raise
    except OperationalError as e:
        # Connection died during operation, clean up and retry once
        session_conns.pop(sid, None)
        try:
            conn = get_session_conn(sid)
            brain = SwipeBrain(sid, conn)
            stats = brain.get_stats()
            return stats
        except Exception as retry_error:
            raise HTTPException(status_code=500, detail=f"Database error: {str(retry_error)}")
    except Exception as e:
        # For other errors, try to rollback if connection is still alive
        conn = session_conns.get(sid)
        if conn:
            try:
                conn.rollback()
            except:
                # Connection is dead, remove it
                session_conns.pop(sid, None)
        raise HTTPException(status_code=500, detail=str(e))

# Update next_food endpoint
@app.get("/next/{sid}")
def next_food(sid: str):
    try:
        conn = get_session_conn(sid)
        brain = SwipeBrain(sid, conn)
        item, item_type = brain.next()
        if not item:
            raise HTTPException(status_code=404, detail="No more recommendations")
        return {
            "id": item[0],
            "name": item[1],
            "ingredients": item[2] if item_type == "food" else [],
            "type": item_type
        }
    except HTTPException:
        raise
    except OperationalError:
        session_conns.pop(sid, None)
        raise HTTPException(status_code=500, detail="Database connection lost. Please try again.")
    except Exception as e:
        conn = session_conns.get(sid)
        if conn:
            try:
                conn.rollback()
            except:
                session_conns.pop(sid, None)
        raise HTTPException(status_code=500, detail=str(e))

# Update swipe endpoint
@app.post("/swipe/{sid}/{item_id}/{action}")
def swipe(sid: str, item_id: int, action: str, item_type: str = Query("food")):
    if action not in ["left", "right", "super"]:
        raise HTTPException(status_code=400, detail="Invalid swipe action")
    
    try:
        conn = get_session_conn(sid)
        brain = SwipeBrain(sid, conn)
        brain.update(item_id, action, item_type)
        return {"ok": True}
    except HTTPException:
        raise
    except OperationalError:
        session_conns.pop(sid, None)
        raise HTTPException(status_code=500, detail="Database connection lost. Please try again.")
    except Exception as e:
        conn = session_conns.get(sid)
        if conn:
            try:
                conn.rollback()
            except:
                session_conns.pop(sid, None)
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/")
def root():
    return {"message": "Backend is running"}

@app.get("/favicon.ico")
def favicon():
    return FileResponse(BASE_DIR / "favicon.ico")
