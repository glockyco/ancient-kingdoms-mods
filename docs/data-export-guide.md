# Data Export Guide

For DataExporter mod development.

## Core Principle

ONLY export authoritative data from game object fields.

## Rules

- NO guesses or heuristics
- NO name-based inferences
- Use `"unknown"` for missing/unavailable data

## Acceptable Derivations

- IL2CPP type checking (`TryCast`, `GetIl2CppType()`)
- Spatial algorithms when no authoritative field exists
- Calculations from authoritative data (e.g., bounding boxes)

## Documentation

Document any non-authoritative derivations in code comments.
