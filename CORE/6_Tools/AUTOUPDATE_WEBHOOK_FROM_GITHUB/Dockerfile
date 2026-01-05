FROM python:3.11-slim

RUN apt-get update && apt-get install -y \
    git \
    docker.io \
    && rm -rf /var/lib/apt/lists/*

RUN git config --global --add safe.directory /app

EXPOSE 9001

WORKDIR /app

COPY AUTOUPDATE_WEBHOOK_FROM_GITHUB.py .

CMD ["python", "CORE/TOOLS/AUTOUPDATE_WEBHOOK_FROM_GITHUB/AUTOUPDATE_WEBHOOK_FROM_GITHUB.py"]
