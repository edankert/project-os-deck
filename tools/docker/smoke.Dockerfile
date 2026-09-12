# A Linux box for the smoke run, so it never competes for a person's keyboard.
#
# The smoke run opens real Electron windows and takes the system's focus 23
# times (ISS-0075). On a machine somebody is working at, that is unusable: four
# consecutive runs on 2026-09-12 gave four different failure sets, and the
# failures moved around the checks that need a focused window. A run whose
# result depends on whether a person is typing cannot verify anything.
#
# This is the same path CI already proves works, run locally and free:
# `run-smoke.sh` re-execs itself under `xvfb-run` when it finds no display, so
# nothing in the script is special-cased for the box.
#
# Electron's binary is platform-specific, so the box installs its OWN
# node_modules. It is never the host's, and the two do not share a cache.
FROM node:20-bookworm-slim

# What Electron needs to open a window on Linux, and the virtual screen to open
# it on. Kept to the list Electron's own documentation names, so a missing
# library is a change here rather than a mystery at run time.
RUN apt-get update && apt-get install -y --no-install-recommends \
      xvfb xauth x11-utils \
      libnss3 libatk1.0-0 libatk-bridge2.0-0 libcups2 libdrm2 libxkbcommon0 \
      libxcomposite1 libxdamage1 libxfixes3 libxrandr2 libgbm1 libasound2 \
      libpango-1.0-0 libcairo2 libgtk-3-0 \
      python3 python3-pip python3-venv ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /work/project-os-deck

# The dependency install is its own layer, so editing source does not refetch
# Electron's ~100MB binary on every run.
COPY desktop/package.json desktop/package-lock.json ./desktop/
RUN cd desktop && npm ci --no-audit --no-fund

# Chromium's sandbox needs privileges a container does not have, and the run is
# a test harness against a checkout we control.
ENV ELECTRON_DISABLE_SANDBOX=1

# **The sidecar Deck reads through is a SIBLING checkout, never vendored**
# (CLAUDE.md), and `sidecar.ts` runs `python -m project_os_cockpit`, so the
# package has to be IMPORTABLE and not merely present. CI clones it beside the
# repository and pip-installs it; the box mounts the one already on the host
# and installs it at start, because a mounted path cannot be installed at
# build time. `--break-system-packages` because Debian's python is externally
# managed and this image exists to run one test suite.
COPY tools/docker/smoke-entrypoint.sh /usr/local/bin/smoke-entrypoint
RUN chmod +x /usr/local/bin/smoke-entrypoint
ENTRYPOINT ["/usr/local/bin/smoke-entrypoint"]
CMD ["bash", "tools/scripts/run-smoke.sh", "both"]
