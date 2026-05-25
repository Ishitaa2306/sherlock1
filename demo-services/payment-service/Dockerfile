FROM python:3.11-slim
WORKDIR /app
COPY shared /app/shared
COPY payment-service/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY payment-service .
CMD ["python", "main.py"]
