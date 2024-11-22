# Plutus Playground

A development environment for writing and testing Plutus smart contracts.

## Overview

This project provides a Docker-based environment for compiling and testing Plutus smart contracts. It includes:
- A Node.js server for handling compilation requests
- A template Plutus cabal config
- Cabal project setup for Plutus dependencies

## Prerequisites

- Docker
- Node.js (for local development)

## Project Structure

- `server/`: Node.js server code
- `template/`: Template Plutus cabal configs
    - `cabal.project`: Cabal project file for Plutus dependencies
    - `plutus-playground.cabal`: Cabal project file for the Plutus Playground


## Running the Project

1. Build the Docker image:
    ```sh
    docker build -t plutus-playground .
    ```

2. Run the Docker container:
    ```sh
    docker run -p 3000:3000 plutus-playground
    ```
