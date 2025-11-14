# EDTH-ctrl_sea
Eurpean Defense Tech Hackathon

## Project structure

```mermaid
flowchart TD
    %% Nodes
    subgraph DataSources [Data sources]
        infra["Infrastructure\n(Static)"]
        ais["AIS-Data-In"]
        radar["Radar (Mocked)"]
        sentinel["Sentinel One\nGPS"]
    end

    subgraph PythonLayer [Python]
        risk["Risk Assessment Engine"]
        backend["Backend"]
    end

    subgraph NextLayer [Next.js]
        web["Web-FE / UNITY client"]
    end

    %% Flows
    infra -- "SEDAP-Express" --> risk
    ais --> risk
    radar --> risk
    sentinel -.-> risk

    risk -- "SEDAP-Express" --> backend
    backend --> web

    %% Styles
    classDef dashed stroke-dasharray: 5 5;
    class sentinel dashed;
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
- 0.15 Current proximity to critical infrastructure (within 500m)
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

