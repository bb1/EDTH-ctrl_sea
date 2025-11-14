# EDTH-ctrl_sea
Eurpean Defense Tech Hackathon

## Project structure

```mermaid
flowchart LR

%% --- Data Sources ---
subgraph DataSources[Data Sources]
    INF[Infrastructure (static)]
    AIS[AIS-Data-In]
    RAD[Radar (Mocked)]
    SAT((Satellite Image\n(Aggregated,\n2min delay)\nas Geo Point))
    PR[Passive Radar]
    AI[Aerial Imagery]
end

%% --- Processing Layer ---
MATCH[Matching Algo]
RAE[Risk Assessment Engine]
BACK[Backend\nFilter min risk score]
WEB[Web-FE]

%% --- Optional / External ---
UNITY[UNITY client]

%% --- DB ---
subgraph DB
    SHIP[ship\n- flag, dest, origin, name, MMSI]
    LOC[location\n- ship_id\n- lat/long\n- time\n- velocity\n- data_source]
    INFRA[Infra\n- [lat,long]\n- id, name\n- type]
    RISK[risk\n- percentage]
end

%% --- Map Layer ---
TILE[LibreMap\nTile Server]
LM[LibreMap]

%% --- Data Flow ---
INF --> MATCH
AIS --> MATCH
RAD --> MATCH

INF --> RAE
MATCH --> RAE

MATCH --> SHIP
RAE --> LOC
RAE --> RISK

%% DB Relationships
SHIP -->|1:n| LOC

%% UI Flow
RAE --> BACK
BACK --> WEB
WEB --> TILE
TILE --> LM

%% Feedback Loop
LM -.-> RAE

%% Unity Client Connection
BACK -.-> UNITY

%% Labels
classDef green fill:#e8ffe8,stroke:#009900,color:#003300;

BACK:::green
RAE:::green
MATCH:::green
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

