# 1. Start with a lightweight Python image
FROM python:3.10-slim

# 2. Set the folder inside the container
WORKDIR /app

# 3. Copy the requirements file first (for caching)
COPY requirements.txt .

# 4. Install dependencies
RUN pip install --no-cache-dir -r requirements.txt

# 5. Copy the rest of your code
COPY . .

# 6. Run the app
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]