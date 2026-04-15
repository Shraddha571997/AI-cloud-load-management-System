"""
WSGI entry point for production deployment.
Run with: gunicorn wsgi:app --bind 0.0.0.0:$PORT --workers 2 --threads 4

MCA Viva Note:
  gunicorn is a production-grade WSGI server for Python.
  It replaces Flask's built-in dev server which is single-threaded and not safe for production.
"""
from app import app

if __name__ == "__main__":
    app.run()
