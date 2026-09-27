"""
Weather-driven Digital Twin (HackCelestial Midnight Task 1).

  weather.py  - Open-Meteo live + forecast client (keyless), TTL cached
  flood.py    - Open-Meteo Flood (GloFAS) river-discharge client, TTL cached
  signals.py  - GDACS official public disaster alerts near the route
  model.py    - pure state building, deterministic propagation, what-if

Every value carries source, timestamp and a status of LIVE / FORECAST /
CACHED / SIMULATED / UNAVAILABLE. Nothing here invents data: a provider
failure produces an UNAVAILABLE element with the reason.
"""
