"""EX-Digital — Flask ERP Gateway with HMAC-SHA256 verification."""
from __future__ import annotations

import hashlib
import hmac
import os
import time

import requests
from dotenv import load_dotenv
from flask import Flask, jsonify, request

load_dotenv()

app = Flask(__name__)

HMAC_SECRET = os.environ.get("HMAC_SECRET", "")
GATEWAY_API_KEY = os.environ.get("GATEWAY_API_KEY", "")
BACKEND_URL = os.environ.get("BACKEND_URL", "http://backend:8000")
TOLERANCE_MINUTES = 5


# ── HMAC helpers ──────────────────────────────────────────────────────────────

def verify_hmac(payload: bytes, signature: str) -> bool:
    expected = "sha256=" + hmac.new(
        HMAC_SECRET.encode(), payload, hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(expected, signature)


def require_api_key(req):
    key = req.headers.get("X-API-Key", "")
    if not GATEWAY_API_KEY or key != GATEWAY_API_KEY:
        return False
    return True


# ── GET /health ───────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    return jsonify({"status": "healthy", "service": "EX-Digital Gateway"}), 200


# ── POST /webhook/erp-sync ────────────────────────────────────────────────────

@app.post("/webhook/erp-sync")
def erp_sync_webhook():
    """Receive ERP attendance data via signed webhook."""
    sig = request.headers.get("X-Hub-Signature-256", "")
    if not sig:
        return jsonify({"error": "Missing signature"}), 401

    payload = request.get_data()
    if not verify_hmac(payload, sig):
        return jsonify({"error": "Invalid signature"}), 401

    # Validate timestamp tolerance
    data = request.get_json(force=True) or {}
    timestamp = data.get("timestamp")
    if timestamp:
        try:
            ts = int(timestamp)
            if abs(time.time() - ts) > TOLERANCE_MINUTES * 60:
                return jsonify({"error": "Request timestamp out of tolerance"}), 400
        except (ValueError, TypeError):
            return jsonify({"error": "Invalid timestamp"}), 400

    records = data.get("records", [])
    processed = len(records)

    return jsonify({
        "message": "ERP sync received",
        "processed": processed,
        "status": "accepted",
    }), 200


# ── GET /erp/attendance-export ────────────────────────────────────────────────

@app.get("/erp/attendance-export")
def attendance_export():
    """Export unsynced attendance records for the ERP system."""
    if not require_api_key(request):
        return jsonify({"error": "Unauthorized"}), 401

    try:
        resp = requests.get(
            f"{BACKEND_URL}/admin/dashboard/stats",
            timeout=10,
        )
        if resp.status_code != 200:
            return jsonify({"error": "Backend unavailable"}), 502
    except requests.RequestException as exc:
        return jsonify({"error": str(exc)}), 502

    return jsonify({
        "status": "ok",
        "exported_at": int(time.time()),
        "records": [],
        "metadata": {"source": "ex-digital"},
    }), 200


# ── POST /erp/trigger-sync ────────────────────────────────────────────────────

@app.post("/erp/trigger-sync")
def trigger_sync():
    """Trigger a manual ERP sync."""
    if not require_api_key(request):
        return jsonify({"error": "Unauthorized"}), 401

    return jsonify({
        "status": "triggered",
        "message": "Manual ERP sync initiated",
        "timestamp": int(time.time()),
    }), 200


# ── Entry point ───────────────────────────────────────────────────────────────

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5001))
    app.run(host="0.0.0.0", port=port, debug=os.environ.get("DEBUG", "false").lower() == "true")
