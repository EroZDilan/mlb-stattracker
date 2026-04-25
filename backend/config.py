import os
from dotenv import load_dotenv

load_dotenv()

MLB_API_BASE = "https://statsapi.mlb.com/api/v1"
DB_PATH = os.path.join(os.path.dirname(__file__), "database", "mlb.db")
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")
CLAUDE_MODEL = "claude-sonnet-4-6"
