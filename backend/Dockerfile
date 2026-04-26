# Build stage
FROM debian:bullseye AS builder

RUN apt-get update && DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
    cmake \
    build-essential \
    g++ \
    libboost-all-dev \
    libssl-dev \
    nlohmann-json3-dev \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY . .

RUN mkdir -p build && cd build && \
    cmake .. -DCMAKE_BUILD_TYPE=Release && \
    cmake --build . --parallel $(nproc)

# Runtime stage
FROM debian:bullseye-slim

RUN apt-get update && apt-get install -y \
    libssl1.1 \
    libboost-system1.74.0 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY --from=builder /app/build/two_spies_server .

EXPOSE 8080
CMD ["./two_spies_server", "8080", "4"]
