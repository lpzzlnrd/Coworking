# ---- Stage 1: Build ----
FROM maven:3.9-eclipse-temurin-21-alpine AS builder
WORKDIR /build

# Layer-cache: download dependencies before copying source
COPY pom.xml .
RUN mvn dependency:go-offline -q

# Copy source and build fat JAR (skip tests — they require a running DB)
COPY src/ src/
RUN mvn package -DskipTests -q

# ---- Stage 2: Runtime ----
FROM eclipse-temurin:21-jre-alpine AS runtime
WORKDIR /app

# Non-root user for security
RUN addgroup -S billing && adduser -S billing -G billing
USER billing

COPY --from=builder /build/target/*.jar app.jar

EXPOSE 8002

ENTRYPOINT ["java", "-jar", "app.jar"]
