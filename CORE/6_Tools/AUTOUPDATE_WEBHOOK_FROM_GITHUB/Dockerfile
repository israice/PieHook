FROM python:3.11-slim

RUN apt-get update && apt-get install -y \
    git \
    docker.io \
    docker-compose \
    curl \
    && rm -rf /var/lib/apt/lists/*

RUN git config --global --add safe.directory /app

EXPOSE 9001

WORKDIR /app/CORE/6_Tools/AUTOUPDATE_WEBHOOK_FROM_GITHUB

COPY AUTOUPDATE_WEBHOOK_FROM_GITHUB.py .

CMD ["python", "AUTOUPDATE_WEBHOOK_FROM_GITHUB.py"]
