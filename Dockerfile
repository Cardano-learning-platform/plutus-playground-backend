FROM  ghcr.io/input-output-hk/devx-devcontainer:x86_64-linux.ghc96-iog

# Set up shell
SHELL ["/bin/bash", "-c"]

# Source the environment in each RUN command
RUN source ~/.bashrc && \
    mkdir -p /app/template_plutus

WORKDIR /app/template_plutus

# Initialize cabal project
RUN source /nix/store/7qf66500sfblypc67rwvq0ha1xrcds6j-ghc96-iog-env.sh \
    cabal init -n && \
    rm -f /app/template_plutus/*.cabal

# Copy template files
COPY templates/cabal.project templates/playground-plutus.cabal ./

# Build dependencies
RUN  source /nix/store/7qf66500sfblypc67rwvq0ha1xrcds6j-ghc96-iog-env.sh && \
    cabal update && \
    cabal build --only-dependencies

# Set up Node.js
WORKDIR /app

# Install Node.js
# Node.js setup
ENV NVM_DIR=/root/.nvm
ENV NODE_VERSION=18.17.0
RUN curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash && \
    . $NVM_DIR/nvm.sh && \
    nvm install $NODE_VERSION && \
    nvm use default

ENV PATH=$NVM_DIR/versions/node/v$NODE_VERSION/bin:$PATH

COPY server/package.json ./
RUN npm install


# Copy the rest of the application
COPY server/ ./
# Expose the port
EXPOSE 3000

# Start the server with the correct environment
CMD ["/bin/bash", "-c", "source /nix/store/7qf66500sfblypc67rwvq0ha1xrcds6j-ghc96-iog-env.sh && node index.js"]
