from fastapi import FastAPI, websockets

app = FastAPI()

@app.websocket("/consultation")
async def consultation(websocket: websockets):
    await websockets.accept()