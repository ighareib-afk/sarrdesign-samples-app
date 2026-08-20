import os

from fastapi import FastAPI, Depends
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from starlette.middleware.cors import CORSMiddleware

from database import Base, engine, SessionLocal
import models  # noqa: F401 - ensure models are registered before create_all
import seed

from routers import auth_router, users_router, catalog_router, requests_router, factory_router, warehouse_router

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Sarrdesign Sample Display Control")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router.router)
app.include_router(users_router.router)
app.include_router(catalog_router.router)
app.include_router(requests_router.router)
app.include_router(factory_router.router)
app.include_router(warehouse_router.router)


@app.on_event("startup")
def startup_seed():
    db = SessionLocal()
    try:
        seed.run_all_seeds(db)
    finally:
        db.close()


@app.get("/api/health")
def health():
    return {"ok": True}


@app.get("/api/meta/roles")
def roles():
    return [r.value for r in models.Role]


@app.get("/api/meta/return-reasons")
def return_reasons():
    return [r.value for r in models.ReturnReason]


FRONTEND_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "frontend")
if os.path.isdir(FRONTEND_DIR):
    app.mount("/assets", StaticFiles(directory=FRONTEND_DIR), name="assets")

    @app.get("/")
    def index():
        return FileResponse(os.path.join(FRONTEND_DIR, "index.html"))

    @app.get("/{full_path:path}")
    def spa_fallback(full_path: str):
        candidate = os.path.join(FRONTEND_DIR, full_path)
        if os.path.isfile(candidate):
            return FileResponse(candidate)
        return FileResponse(os.path.join(FRONTEND_DIR, "index.html"))
