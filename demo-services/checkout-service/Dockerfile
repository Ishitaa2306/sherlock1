FROM python:3.11-slim
WORKDIR /app
COPY shared /app/shared
COPY checkout-service/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY checkout-service .
CMD ["python", "main.py"]
