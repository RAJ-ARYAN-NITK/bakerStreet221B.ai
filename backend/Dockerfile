# # 1. Start with a lightweight Python image
# FROM python:3.10-slim

# # 2. Set the folder inside the container
# WORKDIR /app

# # 3. Copy the requirements file first (for caching)
# COPY requirements.txt .

# # 4. Install dependencies
# RUN pip install --no-cache-dir -r requirements.txt

# # 5. Copy the rest of your code
# COPY . .

# # 6. Run the app
# CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]

# 1. Start with Python 3.11 slim
FROM python:3.11-slim

# 2. Set the folder inside the container
WORKDIR /app

# 3. Install system dependencies needed for some packages
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# 4. Copy the requirements file first (for caching)
COPY requirements.txt .

# 5. Upgrade pip first
RUN pip install --upgrade pip

# 6. Install dependencies
RUN pip install --no-cache-dir -r requirements.txt

# 7. Copy the rest of your code
COPY . .

# 8. Create uploads folder
RUN mkdir -p uploads

# 9. Run the app
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]