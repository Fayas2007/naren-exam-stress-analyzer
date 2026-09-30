FROM rstudio/plumber:latest

# Install system dependencies for PostgreSQL, OpenSSL, libcurl, etc.
RUN apt-get update -qq && apt-get install -y --no-install-recommends \
    libpq-dev \
    libssl-dev \
    libcurl4-openssl-dev \
    libxml2-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install R dependencies
COPY backend/install_packages.R /app/
RUN Rscript install_packages.R

# Copy backend application code
COPY backend/ /app/

# Render exposes PORT environment variable dynamically
ENV PORT=8000
EXPOSE 8000

CMD ["Rscript", "run_server.R"]
