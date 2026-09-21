import os

port = os.environ.get("PORT", "5001")
bind = f"0.0.0.0:{port}"
workers = 2
timeout = 30
