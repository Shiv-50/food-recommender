from fastapi import FastAPI, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from recommender import SwipeBrain
from utils.db import get_conn
import uuid
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

# ------------------- Start Session -------------------
@app.get("/")
def root():
    return {"message": "Backend is running"}

@app.get("/favicon.ico")
def favicon():
    return FileResponse(BASE_DIR / "favicon.ico")

@app.get("/start/{sid}")
def start_session(sid:str):
    
    # create and store a persistent connection for this session
    conn = get_conn()
    session_conns[sid] = conn
    with conn.cursor() as cur:
        cur.execute("INSERT INTO swipe_sessions(id) VALUES(%s) ON CONFLICT DO NOTHING", (sid,))
        conn.commit()
    return {"session_id": sid}

# ------------------- Get Next Recommendation -------------------
@app.get("/next/{sid}")
def next_food(sid: str):
    print("entered next")
    conn = session_conns.get(sid)
    if not conn:
      
        raise HTTPException(status_code=404, detail="Session not found")
    
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

# ------------------- Register Swipe -------------------
@app.post("/swipe/{sid}/{item_id}/{action}")
def swipe(
    sid: str,
    item_id: int,
    action: str,
    item_type: str = Query("food")
):
    if action not in ["left", "right", "super"]:
        raise HTTPException(status_code=400, detail="Invalid swipe action")
    
    conn = session_conns.get(sid)
    if not conn:
        raise HTTPException(status_code=404, detail="Session not found")
    
    brain = SwipeBrain(sid, conn)
    brain.update(item_id, action, item_type)
    return {"ok": True}

# ------------------- End Session -------------------
@app.post("/super/{sid}")
def super_swipe(sid: str):
    conn = session_conns.pop(sid, None)
    if conn:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM session_food WHERE session_id=%s", (sid,))
            cur.execute("DELETE FROM session_category WHERE session_id=%s", (sid,))
            cur.execute("DELETE FROM session_memory WHERE session_id=%s", (sid,))
            cur.execute("DELETE FROM swipe_sessions WHERE id=%s", (sid,))
            conn.commit()
        conn.close()
    return {"status": "ended"}
