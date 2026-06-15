.PHONY: build test run deploy

build:
	go build -o bin/ewallet-api cmd/api/main.go

test:
	go test -v -race -cover ./...

run:
	go run cmd/api/main.go

docker-build:
	docker build -t ewallet-api:latest .

docker-push:
	docker tag ewallet-api:latest your-registry/ewallet-api:latest
	docker push your-registry/ewallet-api:latest

deploy-prod:
	kubectl apply -f deployments/kubernetes/

migrate:
	go run cmd/migrate/main.go

seed:
	go run cmd/seed/main.go

lint:
	golangci-lint run

bench:
	go test -bench=. -benchmem ./...

.PHONY: dev
dev:
	air -c .air.toml
