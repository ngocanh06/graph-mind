FROM python:3.11-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy source code
COPY src/ ./src/

ENV PYTHONUNBUFFERED=1
ENV WATCH_ROOT=/data
ENV AEGIS_BACKEND_URL=http://host.docker.internal:5000
ENV AEGIS_AGENT_API_KEY=dev-agent-key

CMD ["python", "-m", "src.watcher"]
