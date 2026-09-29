# CareerSync Infrastructure

This directory contains configuration files and manifests for local development and future deployment.

## Components

- **Database:** PostgreSQL with PostGIS extension for spatial queries (job matching, location search).
- **Cache & Messaging:** Redis for caching and async task queues.
- **Containerization:** Docker & Docker Compose setup (`docker-compose.yml` in project root).

## Directory Structure

- `docker/` - Dockerfiles and container configurations.
- `k8s/` - Kubernetes manifests (prepared for future environments).
