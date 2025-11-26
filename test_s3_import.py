import sys
import os

# Add backend to sys.path
sys.path.append(os.path.join(os.getcwd(), "backend"))

try:
    from app.api.routes import s3
    print("Successfully imported app.api.routes.s3")
except Exception as e:
    print(f"Failed to import app.api.routes.s3: {e}")
    import traceback
    traceback.print_exc()
