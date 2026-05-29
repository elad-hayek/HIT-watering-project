# Watering Dashboard Diagrams

These diagrams describe the implemented structure and main runtime flow of the
Watering Dashboard application.

Note: the database migrations include `area_manager` as a global role, but the
current backend RBAC helper recognizes only `user` and `admin` as global roles.
Area-level permissions still include `read`, `update`, `area_manager`, and
`admin`. Because of that, some UI flows allow area-level editors while the
current backend `canManageAreas()` check only allows global admins.

## Class Diagram

```mermaid
%% A4-friendly wide structural diagram
%% Recommended export settings: A4 landscape, fit to width, font size 9-10.
classDiagram
    direction LR

    class App {
      +routes
      +auth state
    }

    class DashboardUI {
      +areas
      +plants
      +selectedArea
      +loadAreas()
      +loadPlants()
    }

    class AreaTools {
      +create area
      +edit area
      +manage users
    }

    class PlantTools {
      +place marker
      +create plant
      +edit plant
    }

    class AdminUI {
      +activity logs
      +user management
    }

    class API {
      +/api/users
      +/api/areas
      +/api/plants
      +/api/audit
    }

    class RBAC {
      +requireAuth()
      +requireAdmin()
      +area permissions
    }

    class Audit {
      +writeAudit()
      +list logs
    }

    class Database {
      +MySQL connection
    }

    class User {
      +id
      +username
      +role
      +profile
    }

    class Area {
      +id
      +name
      +map/image data
      +created_by
    }

    class Plant {
      +id
      +area_id
      +location
      +watering data
      +status
    }

    class Access {
      +user_id
      +area_id
      +permission
    }

    class AuditLog {
      +action
      +entity
      +actor
      +details
    }

    App --> DashboardUI
    App --> AdminUI
    DashboardUI --> AreaTools
    DashboardUI --> PlantTools
    DashboardUI --> API
    AdminUI --> API
    AreaTools --> API
    PlantTools --> API

    API --> RBAC
    API --> Database
    API --> Audit
    Audit --> Database

    Database --> User
    Database --> Area
    Database --> Plant
    Database --> Access
    Database --> AuditLog

    User "1" --> "0..*" Area : creates
    Area "1" --> "0..*" Plant : contains
    User "1" --> "0..*" Plant : creates
    User "1" --> "0..*" Access : assigned
    Area "1" --> "0..*" Access : grants
    AuditLog "0..*" ..> User : actor
    AuditLog "0..*" ..> Area : entity
    AuditLog "0..*" ..> Plant : entity
```

## Activity Diagram

```mermaid
%% A4-friendly wide activity diagram
%% Recommended export settings: A4 landscape, fit to width, font size 9-10.
flowchart LR
    A([Open app]) --> B{Saved user?}
    B -- No --> C[Register/login]
    C --> D{Valid?}
    D -- No --> E[Error]
    E --> C
    D -- Yes --> F[Save user + audit]
    B -- Yes --> G[Dashboard]
    F --> G

    subgraph Load[Load workspace]
      direction LR
      G --> H[GET areas]
      H --> I{Admin?}
      I -- Yes --> J[All areas]
      I -- No --> K[Assigned areas]
      J --> L[Select area]
      K --> L
      L --> M[GET plants]
      M --> N{Access?}
      N -- Yes --> O[Render map/image]
      N -- No --> Z[Denied]
    end

    O --> P{Action}

    subgraph AreaFlow[Create area]
      direction LR
      P -- Area --> Q{Map/image?}
      Q -- Map --> R[Draw boundary]
      Q -- Image --> S[Upload image]
      R --> T[POST area]
      S --> T
      T --> U[Save area + audit]
    end
    U --> H

    subgraph PlantFlow[Plant changes]
      direction LR
      P -- Plant --> V[Send request]
      V --> W{Permitted?}
      W -- No --> Z
      W -- Yes --> X{Location valid?}
      X -- No --> Y[Location error]
      X -- Yes --> AA[Save plant + audit]
    end
    Y --> O
    AA --> M

    subgraph AdminFlow[Users and admin]
      direction LR
      P -- Area users --> AB{Manager?}
      AB -- Yes --> AC[Update access + audit]
      AB -- No --> Z
      P -- Admin pages --> AD{Admin?}
      AD -- Yes --> AE[Users/logs]
      AD -- No --> G
    end
    AC --> O
    AE --> G
```
