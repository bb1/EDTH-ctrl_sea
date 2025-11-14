# EDTH-ctrl_sea
Eurpean Defense Tech Hackathon

## Project structure

```mermaid
flowchart LR

subgraph DataSources
    INF[Infrastructure (static)]
    AIS[AIS-Data-In]
    RAD[Radar (Mocked)]
    SAT[Satellite image (geo point)]
    PR[Passive radar]
    AI[Aerial imagery]
end

subgraph Processing
    MATCH[Matching algo]
    RAE[Risk Assessment Engine]
    BACK[Backend (filter min risk score)]
    WEB[Web-FE]
    UNITY[UNITY client]
end

subgraph DB
    SHIP[ship]
    LOC[location]
    INFRA[infra]
    RISK[risk]
end

subgraph Map
    TILE[LibreMap Tile Server]
    LM[LibreMap]
end

INF --> MATCH
AIS --> MATCH
RAD --> MATCH

INF --> RAE
MATCH --> RAE

MATCH --> SHIP
RAE --> LOC
RAE --> RISK

SHIP -->|1:n| LOC

RAE --> BACK
BACK --> WEB
WEB --> TILE
TILE --> LM

```

## Date Sources

### AIS Data
Automatic Identification System (AIS) data provides real-time information about vessel movements, including position, speed, and course. This data is crucial for tracking maritime traffic and identifying potential threats. We are using aisstream.io as our primary source for AIS data.

### Critical Infrastructure Data
Data on critical maritime infrastructure, such as ports, oil rigs, and naval bases and underwater cables. Using a static dataset.

## Aggregators

### Risk Assessment

Indicators:
- 0.5 angle of approach to critical infrastructure equals ~90 degrees
- 0.15 Current proximity to critical infrastructure (within 100m)
- 0.1 * Amount of historical proximity
- 0.1 * Duration close to critical infrastructure
- 0.15 * Multiple trips close to the same infrastructure
- 0.01 Type of vessel
- 0.2 Speed of vessel (slowing down close to infrastructure)
- 0.5 AIS signal status (on/off)
- 0.5 Gaps in AIS data 
- 0.2 Flag (RU, CN)

Calculate a risk score based on these indicators using a weighted formula.

### User Feedback loop
Allow users to provide feedback on risk assessments to improve the model over time in binary fashion (thumbs up/down). This feedback can be used to adjust the weights of the indicators in the risk assessment formula.

