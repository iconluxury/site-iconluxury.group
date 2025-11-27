import os
import requests
import logging
from typing import Any, List, Dict, Optional

logger = logging.getLogger(__name__)

class D1Client:
    def __init__(self):
        # Inferred from R2 endpoint: https://97d91ece470eb7b9aa71ca0c781cfacc.r2.cloudflarestorage.com
        self.account_id = os.getenv("CLOUDFLARE_ACCOUNT_ID", "97d91ece470eb7b9aa71ca0c781cfacc")
        self.database_id = os.getenv("CLOUDFLARE_D1_DATABASE_ID")
        self.api_token = os.getenv("CLOUDFLARE_API_TOKEN")
        
    @property
    def base_url(self):
        return f"https://api.cloudflare.com/client/v4/accounts/{self.account_id}/d1/database/{self.database_id}/query"

    def query(self, sql: str, params: List[Any] = None) -> Dict[str, Any]:
        if not self.database_id or not self.api_token:
            logger.warning("D1 Database ID or API Token not configured.")
            # Fallback or error? For now, let's log and return empty/error
            # But since the user explicitly asked for D1, we should probably raise or handle it.
            # However, without credentials, it will fail.
            return {"success": False, "errors": ["Missing configuration"], "result": []}

        headers = {
            "Authorization": f"Bearer {self.api_token}",
            "Content-Type": "application/json"
        }
        
        # D1 API expects params as a list of values
        payload = {
            "sql": sql,
            "params": params or []
        }

        try:
            response = requests.post(self.base_url, json=payload, headers=headers)
            response.raise_for_status()
            return response.json()
        except Exception as e:
            logger.error(f"D1 Query failed: {e}")
            # Return a structure that indicates failure but doesn't crash the app immediately if possible,
            # or re-raise if critical.
            raise e

d1_client = D1Client()
