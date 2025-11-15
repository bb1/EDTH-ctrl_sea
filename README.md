# EDTH-ctrl_sea
Eurpean Defense Tech Hackathon

## Project structure

```mermaid
flowchart TD

%% --- DATA SOURCES -----------------------------------------------------------------

subgraph DS[Data sources]
    AIS[AIS-Data-In]
    RAD[Radar]
    SAT[Satellite Imagery]
    PR[Passive Radar]
    AI[Aerial Imagery]
end

%% --- STATIC INFRA -----------------------------------------------------------------

INFRA_STATIC[Infrastructure]

%% --- MATCHING + RISK ENGINE --------------------------------------------------------

MA[Matching Algo]
RAE[Risk Assessment Engine]

%% --- DATABASE ----------------------------------------------------------------------

subgraph DB[DB]
    SHIP[ship\n- flag, dest, origin, name,\n- MMSI]
    POS[position_report\n- ship_id\n- lat/long\n- time\n- velocity\n- data_source]
    INF[infra\n- id, name\n- type\n- lat/long]
    RISK[risk\n- confidence_score\n- explanation\n- confirmed]
end

%% --- BACKEND / FRONTEND ------------------------------------------------------------

subgraph SYS[NestJS System]
    BE[Backend]
    FE[Web-FE]
end

UNITY[UNITY client]

TILE[LibreMap Tile Server]
MAP[LibreMap]


%% --- CONNECTIONS -------------------------------------------------------------------

AIS --> MA
RAD --> MA
SAT -.-> MA
PR -.-> MA
AI -.-> MA

MA --> RAE

INFRA_STATIC --> INF

RAE --> SHIP
RAE --> RISK

POS --> SHIP
POS --> RISK

SHIP --> POS
SHIP --> RAE

INF --> RISK
INF --> RAE

RAE -- SEDAP-Express --> BE
UNITY -- SEDAP-Express --> RAE

FE --> TILE --> MAP
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
- 0.05 Amount of historical proximity
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

