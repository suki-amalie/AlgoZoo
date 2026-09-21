# Extends the upstream Piston image with gdb, needed for the C++ step visualizer
# (server/src/utils/cppTracer.js drives gdb's Machine Interface to trace compiled
# programs — there's no runtime type introspection in C++, unlike Python/JS, so a
# generic value-serializer isn't possible without a real debugger reading DWARF info).
#
# The image's Debian base ("buster") is end-of-life, so its normal apt mirrors
# (deb.debian.org / security.debian.org) no longer serve it — repoint at
# archive.debian.org first, and disable the Release-file expiry check (archived
# Release files have expiry dates long in the past, which apt would otherwise refuse).
FROM ghcr.io/engineer-man/piston

RUN sed -i \
      -e 's|deb.debian.org/debian|archive.debian.org/debian|g' \
      -e 's|security.debian.org/debian-security|archive.debian.org/debian-security|g' \
      /etc/apt/sources.list \
    && echo 'Acquire::Check-Valid-Until "false";' > /etc/apt/apt.conf.d/99no-check-valid-until \
    && apt-get update \
    && apt-get install -y --no-install-recommends gdb \
    && rm -rf /var/lib/apt/lists/*
