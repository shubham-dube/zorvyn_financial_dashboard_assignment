.PHONY: help dev build start stop restart logs clean test lint format install db-migrate db-seed db-reset db-studio docker-build

# Default target
help: ## Show this help message
	@echo "Finance Dashboard Backend - Available Commands:"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

# Development
install: ## Install dependencies
	npm install

dev: ## Start development environment with hot reload
	docker-compose up -d postgres redis
	@echo "Waiting for services to be healthy..."
	@sleep 5
	npm run dev

dev-docker: ## Start full development environment in Docker
	docker-compose up --build

# Build
build: ## Build TypeScript to JavaScript
	npm run build

# Docker
docker-build: ## Build production Docker image
	docker build -f docker/Dockerfile -t finance-dashboard-api:latest .

# Container management
start: ## Start all services
	docker-compose up -d

stop: ## Stop all services
	docker-compose down

restart: ## Restart all services
	docker-compose restart

logs: ## Tail application logs
	docker-compose logs -f app

logs-postgres: ## Tail PostgreSQL logs
	docker-compose logs -f postgres

logs-redis: ## Tail Redis logs
	docker-compose logs -f redis

# Database
db-generate: ## Generate Prisma client
	npx prisma generate

db-migrate: ## Run database migrations
	npx prisma migrate dev

db-migrate-deploy: ## Deploy migrations to production
	npx prisma migrate deploy

db-seed: ## Seed database with initial data
	npm run db:seed

db-reset: ## Reset database (WARNING: destroys all data)
	npm run db:reset

db-studio: ## Open Prisma Studio
	npx prisma studio

# Testing
test: ## Run all tests
	npm test

test-watch: ## Run tests in watch mode
	npm run test:watch

test-unit: ## Run unit tests only
	npm run test:unit

test-integration: ## Run integration tests only
	npm run test:integration

test-env: ## Start test environment
	docker-compose -f docker-compose.test.yml up -d

test-env-stop: ## Stop test environment
	docker-compose -f docker-compose.test.yml down

# Code quality
lint: ## Run ESLint
	npm run lint

lint-fix: ## Run ESLint with auto-fix
	npm run lint:fix

format: ## Format code with Prettier
	npm run format

format-check: ## Check code formatting
	npm run format:check

# Cleanup
clean: ## Clean build artifacts and dependencies
	rm -rf dist node_modules .vitest coverage

clean-docker: ## Remove all containers, volumes, and images
	docker-compose down -v --rmi all

clean-all: clean clean-docker ## Complete cleanup

# Quick setup
setup: ## Initial project setup
	@echo "Setting up Finance Dashboard Backend..."
	cp .env.example .env
	npm install
	docker-compose up -d postgres redis
	@echo "Waiting for database to be ready..."
	@sleep 5
	npx prisma generate
	npx prisma migrate dev
	npm run db:seed
	@echo "Setup complete! Run 'make dev' to start development."
