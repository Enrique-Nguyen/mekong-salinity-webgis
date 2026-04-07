from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pathlib import Path
from .api import health, auth, uploads, observations, admin

app = FastAPI(
    title="Mekong Salinity WebGIS API",
    description="API for managing salinity observation data in the Mekong Delta",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files for sample data downloads
sample_data_path = Path(__file__).parent.parent.parent / "sample_data"
if sample_data_path.exists():
    app.mount("/sample_data", StaticFiles(directory=str(sample_data_path)), name="sample_data")

# Include routers
app.include_router(health.router, prefix="/api", tags=["health"])
app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(uploads.router, prefix="/api/uploads", tags=["uploads"])
app.include_router(observations.router, prefix="/api/observations", tags=["observations"])
app.include_router(admin.router, prefix="/api/admin", tags=["admin"])


@app.get("/")
def root():
    """Root endpoint."""
    return {"message": "Mekong Salinity WebGIS API", "version": "1.0.0"}
