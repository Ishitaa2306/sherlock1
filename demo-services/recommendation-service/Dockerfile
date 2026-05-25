FROM python:3.11-slim
WORKDIR /app
COPY shared /app/shared
COPY recommendation-service/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY recommendation-service .
CMD ["python", "main.py"]
