FROM python:3.11-slim
WORKDIR /app
COPY shared /app/shared
COPY auth-service/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY auth-service .
CMD ["python", "main.py"]
