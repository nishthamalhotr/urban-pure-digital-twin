from datetime import datetime, timezone
import random
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Urban Pure Digital Twin API", version="0.1.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["GET"], allow_headers=["*"])

@app.get("/health")
def health():
    return {"status": "ok", "mode": "simulated"}

@app.get("/api/telemetry")
def telemetry():
    return {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "source": "simulated",
        "inlet_flow_lpm": round(random.uniform(165, 180), 1),
        "inlet_ph": round(random.uniform(7.0, 7.4), 2),
        "inlet_turbidity_ntu": round(random.uniform(195, 225), 1),
        "influent_cod_mg_l": round(random.uniform(300, 340), 1),
        "outlet_turbidity_ntu": round(random.uniform(0.6, 1.2), 2),
        "effluent_cod_mg_l": round(random.uniform(24, 34), 1),
        "final_flow_lpm": round(random.uniform(165, 175), 1),
        "level_percent": round(random.uniform(60, 75), 1)
    }
