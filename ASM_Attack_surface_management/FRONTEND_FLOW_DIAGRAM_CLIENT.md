# Frontend Flow Diagram - Client Presentation

## 🎯 Application User Flow

### Complete User Journey Flow

```mermaid
flowchart TD
    Start([👤 User Opens Application]):::startNode
    Start --> Welcome{Welcome Page}
    
    Welcome -->|Not Logged In| Login[🔐 Login Page]:::loginNode
    Welcome -->|Already Logged In| Dashboard[📊 Dashboard]:::dashboardNode
    
    Login --> Email[📧 Enter Email]:::inputNode
    Login --> Password[🔑 Enter Password]:::inputNode
    Login --> Remember[☑️ Remember Me]:::inputNode
    
    Email --> Validate{✅ Form Validation}
    Password --> Validate
    Remember --> Validate
    
    Validate -->|❌ Invalid| Error[⚠️ Show Error]:::errorNode
    Error --> Login
    
    Validate -->|✅ Valid| APICall[🌐 Send Login Request]:::apiNode
    APICall --> Response{📥 API Response}
    
    Response -->|✅ Success| StoreTokens[💾 Store Tokens]:::successNode
    Response -->|❌ Error| ShowError[⚠️ Show Error Message]:::errorNode
    ShowError --> Login
    
    StoreTokens --> Navigate[➡️ Navigate to Dashboard]:::navigateNode
    Navigate --> Dashboard
    
    Dashboard --> Sidebar[📋 Sidebar Menu]:::sidebarNode
    
    Sidebar -->|Click| Subdomains[👣 Subdomains Page]:::pageNode
    Sidebar -->|Click| Endpoints[🗺️ Endpoints Page]:::pageNode
    Sidebar -->|Click| OpenPorts[🔌 Open Ports Page]:::pageNode
    Sidebar -->|Click| Directories[📁 Directories Page]:::pageNode
    Sidebar -->|Click| Technologies[🔧 Technologies Page]:::pageNode
    Sidebar -->|Click| SSL[🔒 SSL Certificate Page]:::pageNode
    Sidebar -->|Click| Logout[🚪 Sign Out]:::logoutNode
    
    Subdomains --> FetchSub[📡 Fetch Subdomains Data]:::fetchNode
    Endpoints --> FetchEnd[📡 Fetch Endpoints Data]:::fetchNode
    OpenPorts --> FetchPorts[📡 Fetch Open Ports Data]:::fetchNode
    Directories --> FetchDir[📡 Fetch Directories Data]:::fetchNode
    Technologies --> FetchTech[📡 Fetch Technologies Data]:::fetchNode
    
    FetchSub --> DisplaySub[📊 Display Data Table]:::displayNode
    FetchEnd --> DisplayEnd[📊 Display Data Table]:::displayNode
    FetchPorts --> DisplayPorts[📊 Display Data Table]:::displayNode
    FetchDir --> DisplayDir[📊 Display Data Table]:::displayNode
    FetchTech --> DisplayTech[📊 Display Data Table]:::displayNode
    
    DisplaySub --> Actions1[🔍 Search / 📥 Export / 🔄 Refresh]:::actionNode
    DisplayEnd --> Actions2[🔍 Search / 📥 Export / 🔄 Refresh]:::actionNode
    DisplayPorts --> Actions3[🔍 Search / 📥 Export / 🔄 Refresh]:::actionNode
    DisplayDir --> Actions4[🔍 Search / 📥 Export / 🔄 Refresh]:::actionNode
    DisplayTech --> Actions5[🔍 Search / 📥 Export / 🔄 Refresh]:::actionNode
    
    Logout --> APILogout[🌐 Send Logout Request]:::apiNode
    APILogout --> ClearTokens[🗑️ Clear All Data]:::clearNode
    ClearTokens --> Login
    
    classDef startNode fill:#4CAF50,stroke:#2E7D32,stroke-width:3px,color:#fff
    classDef loginNode fill:#2196F3,stroke:#1565C0,stroke-width:2px,color:#fff
    classDef dashboardNode fill:#FF9800,stroke:#E65100,stroke-width:2px,color:#fff
    classDef inputNode fill:#9C27B0,stroke:#6A1B9A,stroke-width:2px,color:#fff
    classDef errorNode fill:#F44336,stroke:#C62828,stroke-width:2px,color:#fff
    classDef apiNode fill:#00BCD4,stroke:#00838F,stroke-width:2px,color:#fff
    classDef successNode fill:#4CAF50,stroke:#2E7D32,stroke-width:2px,color:#fff
    classDef navigateNode fill:#FFC107,stroke:#F57C00,stroke-width:2px,color:#000
    classDef sidebarNode fill:#795548,stroke:#5D4037,stroke-width:2px,color:#fff
    classDef pageNode fill:#607D8B,stroke:#37474F,stroke-width:2px,color:#fff
    classDef fetchNode fill:#3F51B5,stroke:#283593,stroke-width:2px,color:#fff
    classDef displayNode fill:#009688,stroke:#00695C,stroke-width:2px,color:#fff
    classDef actionNode fill:#E91E63,stroke:#AD1457,stroke-width:2px,color:#fff
    classDef logoutNode fill:#F44336,stroke:#C62828,stroke-width:2px,color:#fff
    classDef clearNode fill:#9E9E9E,stroke:#616161,stroke-width:2px,color:#fff
```

---

## 🔐 Login Process Flow

### Detailed Login Flow

```mermaid
sequenceDiagram
    participant U as 👤 User
    participant LP as 🔐 Login Page
    participant API as 🌐 Backend API
    participant LS as 💾 Local Storage
    participant D as 📊 Dashboard
    
    Note over U,D: Login Process Flow
    
    U->>LP: 1. Visit Application
    LP->>U: 2. Display Login Form
    
    U->>LP: 3. Enter Email & Password
    LP->>LP: 4. Validate Form
    
    alt Form Valid
        LP->>API: 5. POST /api/accounts/login/
        Note right of API: {email, password}
        
        alt Login Success
            API->>LP: 6. Return Tokens & User Data
            Note right of API: {accessToken, refreshToken, user}
            
            LP->>LS: 7. Store accessToken
            LP->>LS: 8. Store refreshToken
            LP->>LS: 9. Store user data
            
            LP->>D: 10. Navigate to Dashboard
            D->>U: 11. Show Dashboard
        else Login Failed
            API->>LP: 6. Return Error
            LP->>U: 7. Show Error Message
        end
    else Form Invalid
        LP->>U: 5. Show Validation Error
    end
```

---

## 📊 Dashboard to Pages Flow

### Navigation Flow from Dashboard

```mermaid
flowchart LR
    D[📊 Dashboard]:::dashboard
    D --> S[📋 Sidebar Menu]:::sidebar
    
    S --> SM[🔍 Asset Discovery]:::submenu
    
    SM --> S1[👣 Subdomains]:::page1
    SM --> S2[🗺️ Endpoints]:::page2
    SM --> S3[🔌 Open Ports]:::page3
    SM --> S4[📁 Directories]:::page4
    SM --> S5[🔧 Technologies]:::page5
    
    S --> V[🐞 Vulnerabilities]:::placeholder
    S --> SSL[🔒 SSL Certificate]:::page6
    S --> M[🛒 Marketplace]:::placeholder
    S --> SET[⚙️ Settings]:::placeholder
    S --> OUT[🚪 Sign Out]:::logout
    
    S1 --> T1[📊 Data Table]:::table
    S2 --> T2[📊 Data Table]:::table
    S3 --> T3[📊 Data Table]:::table
    S4 --> T4[📊 Data Table]:::table
    S5 --> T5[📊 Data Table]:::table
    
    T1 --> A1[🔍 Search<br/>📥 Export<br/>🔄 Refresh]:::actions
    T2 --> A2[🔍 Search<br/>📥 Export<br/>🔄 Refresh]:::actions
    T3 --> A3[🔍 Search<br/>📥 Export<br/>🔄 Refresh]:::actions
    T4 --> A4[🔍 Search<br/>📥 Export<br/>🔄 Refresh]:::actions
    T5 --> A5[🔍 Search<br/>📥 Export<br/>🔄 Refresh]:::actions
    
    classDef dashboard fill:#FF9800,stroke:#E65100,stroke-width:3px,color:#fff
    classDef sidebar fill:#795548,stroke:#5D4037,stroke-width:2px,color:#fff
    classDef submenu fill:#9C27B0,stroke:#6A1B9A,stroke-width:2px,color:#fff
    classDef page1 fill:#2196F3,stroke:#1565C0,stroke-width:2px,color:#fff
    classDef page2 fill:#00BCD4,stroke:#00838F,stroke-width:2px,color:#fff
    classDef page3 fill:#4CAF50,stroke:#2E7D32,stroke-width:2px,color:#fff
    classDef page4 fill:#FFC107,stroke:#F57C00,stroke-width:2px,color:#000
    classDef page5 fill:#FF5722,stroke:#D84315,stroke-width:2px,color:#fff
    classDef page6 fill:#9C27B0,stroke:#6A1B9A,stroke-width:2px,color:#fff
    classDef placeholder fill:#9E9E9E,stroke:#616161,stroke-width:2px,color:#fff
    classDef logout fill:#F44336,stroke:#C62828,stroke-width:2px,color:#fff
    classDef table fill:#009688,stroke:#00695C,stroke-width:2px,color:#fff
    classDef actions fill:#E91E63,stroke:#AD1457,stroke-width:2px,color:#fff
```

---

## 🔄 Data Fetching Flow

### How Data is Loaded on Each Page

```mermaid
flowchart TD
    User[👤 User Clicks Page]:::user
    User --> Check{🔍 Check Token}:::check
    
    Check -->|✅ Token Found| API[🌐 API Request]:::api
    Check -->|❌ No Token| Login[🔐 Redirect to Login]:::login
    
    API --> Request[📤 GET Request]:::request
    Request --> Headers[📋 Add Headers]:::headers
    Headers --> Auth[🔑 Authorization: Bearer Token]:::auth
    
    Auth --> Server[🖥️ Backend Server]:::server
    Server --> Response{📥 Response}:::response
    
    Response -->|✅ Success| Data[📊 Receive Data]:::data
    Response -->|❌ Error 401| Refresh[🔄 Try Token Refresh]:::refresh
    Response -->|❌ Other Error| Error[⚠️ Show Error]:::error
    
    Refresh --> RefreshAPI[🌐 POST /token/refresh/]:::refreshApi
    RefreshAPI --> RefreshResponse{📥 Refresh Response}:::refreshResp
    
    RefreshResponse -->|✅ Success| UpdateToken[💾 Update Token]:::update
    RefreshResponse -->|❌ Failed| Clear[🗑️ Clear Tokens]:::clear
    
    UpdateToken --> Retry[🔄 Retry Original Request]:::retry
    Retry --> Server
    
    Clear --> Login
    
    Data --> Process[⚙️ Process Data]:::process
    Process --> Pagination{📄 More Pages?}:::pagination
    
    Pagination -->|Yes| NextPage[📄 Fetch Next Page]:::next
    NextPage --> API
    
    Pagination -->|No| Combine[🔗 Combine All Data]:::combine
    Combine --> Display[📊 Display in Table]:::display
    Display --> User
    
    Error --> User
    
    classDef user fill:#4CAF50,stroke:#2E7D32,stroke-width:3px,color:#fff
    classDef check fill:#FFC107,stroke:#F57C00,stroke-width:2px,color:#000
    classDef api fill:#2196F3,stroke:#1565C0,stroke-width:2px,color:#fff
    classDef login fill:#F44336,stroke:#C62828,stroke-width:2px,color:#fff
    classDef request fill:#00BCD4,stroke:#00838F,stroke-width:2px,color:#fff
    classDef headers fill:#9C27B0,stroke:#6A1B9A,stroke-width:2px,color:#fff
    classDef auth fill:#FF9800,stroke:#E65100,stroke-width:2px,color:#fff
    classDef server fill:#607D8B,stroke:#37474F,stroke-width:2px,color:#fff
    classDef response fill:#009688,stroke:#00695C,stroke-width:2px,color:#fff
    classDef data fill:#4CAF50,stroke:#2E7D32,stroke-width:2px,color:#fff
    classDef refresh fill:#FFC107,stroke:#F57C00,stroke-width:2px,color:#000
    classDef refreshApi fill:#2196F3,stroke:#1565C0,stroke-width:2px,color:#fff
    classDef refreshResp fill:#009688,stroke:#00695C,stroke-width:2px,color:#fff
    classDef update fill:#4CAF50,stroke:#2E7D32,stroke-width:2px,color:#fff
    classDef clear fill:#9E9E9E,stroke:#616161,stroke-width:2px,color:#fff
    classDef retry fill:#FF9800,stroke:#E65100,stroke-width:2px,color:#fff
    classDef process fill:#795548,stroke:#5D4037,stroke-width:2px,color:#fff
    classDef pagination fill:#E91E63,stroke:#AD1457,stroke-width:2px,color:#fff
    classDef next fill:#00BCD4,stroke:#00838F,stroke-width:2px,color:#fff
    classDef combine fill:#9C27B0,stroke:#6A1B9A,stroke-width:2px,color:#fff
    classDef display fill:#009688,stroke:#00695C,stroke-width:2px,color:#fff
    classDef error fill:#F44336,stroke:#C62828,stroke-width:2px,color:#fff
```

---

## 🔍 Search & Filter Flow

### How Search Works

```mermaid
flowchart LR
    Input[⌨️ User Types]:::input
    Input --> Update[🔄 Update Search Term]:::update
    Update --> Filter[🔍 Filter Data Array]:::filter
    
    Filter --> Check1{Check Domain?}:::check1
    Filter --> Check2{Check Title?}:::check2
    Filter --> Check3{Check IP?}:::check3
    
    Check1 -->|Match| Include1[✅ Include]:::include
    Check2 -->|Match| Include2[✅ Include]:::include
    Check3 -->|Match| Include3[✅ Include]:::include
    
    Check1 -->|No Match| Exclude1[❌ Exclude]:::exclude
    Check2 -->|No Match| Exclude2[❌ Exclude]:::exclude
    Check3 -->|No Match| Exclude3[❌ Exclude]:::exclude
    
    Include1 --> Display[📊 Display Filtered Results]:::display
    Include2 --> Display
    Include3 --> Display
    
    Exclude1 --> Display
    Exclude2 --> Display
    Exclude3 --> Display
    
    classDef input fill:#2196F3,stroke:#1565C0,stroke-width:2px,color:#fff
    classDef update fill:#00BCD4,stroke:#00838F,stroke-width:2px,color:#fff
    classDef filter fill:#9C27B0,stroke:#6A1B9A,stroke-width:2px,color:#fff
    classDef check1 fill:#FFC107,stroke:#F57C00,stroke-width:2px,color:#000
    classDef check2 fill:#FFC107,stroke:#F57C00,stroke-width:2px,color:#000
    classDef check3 fill:#FFC107,stroke:#F57C00,stroke-width:2px,color:#000
    classDef include fill:#4CAF50,stroke:#2E7D32,stroke-width:2px,color:#fff
    classDef exclude fill:#F44336,stroke:#C62828,stroke-width:2px,color:#fff
    classDef display fill:#009688,stroke:#00695C,stroke-width:2px,color:#fff
```

---

## 📥 Export to Excel Flow

### Excel Export Process

```mermaid
flowchart TD
    Click[👆 User Clicks Export]:::click
    Click --> Create[📝 Create Excel Workbook]:::create
    
    Create --> Worksheet[📋 Add Worksheet]:::worksheet
    Worksheet --> Headers[📑 Set Column Headers]:::headers
    
    Headers --> Loop[🔄 Loop Through Data]:::loop
    Loop --> Row[📊 Add Row]:::row
    
    Row --> Format[✨ Format Values]:::format
    Format --> More{More Rows?}:::more
    
    More -->|Yes| Loop
    More -->|No| Style[🎨 Style Header Row]:::style
    
    Style --> Generate[⚙️ Generate Buffer]:::generate
    Generate --> Blob[📦 Create Blob]:::blob
    Blob --> Download[⬇️ Download File]:::download
    Download --> Done[✅ Complete]:::done
    
    classDef click fill:#2196F3,stroke:#1565C0,stroke-width:2px,color:#fff
    classDef create fill:#4CAF50,stroke:#2E7D32,stroke-width:2px,color:#fff
    classDef worksheet fill:#00BCD4,stroke:#00838F,stroke-width:2px,color:#fff
    classDef headers fill:#9C27B0,stroke:#6A1B9A,stroke-width:2px,color:#fff
    classDef loop fill:#FF9800,stroke:#E65100,stroke-width:2px,color:#fff
    classDef row fill:#607D8B,stroke:#37474F,stroke-width:2px,color:#fff
    classDef format fill:#FFC107,stroke:#F57C00,stroke-width:2px,color:#000
    classDef more fill:#E91E63,stroke:#AD1457,stroke-width:2px,color:#fff
    classDef style fill:#795548,stroke:#5D4037,stroke-width:2px,color:#fff
    classDef generate fill:#009688,stroke:#00695C,stroke-width:2px,color:#fff
    classDef blob fill:#FF5722,stroke:#D84315,stroke-width:2px,color:#fff
    classDef download fill:#4CAF50,stroke:#2E7D32,stroke-width:2px,color:#fff
    classDef done fill:#4CAF50,stroke:#2E7D32,stroke-width:3px,color:#fff
```

---

## 🚪 Logout Flow

### Sign Out Process

```mermaid
sequenceDiagram
    participant U as 👤 User
    participant S as 📋 Sidebar
    participant API as 🌐 Backend API
    participant LS as 💾 Local Storage
    participant L as 🔐 Login Page
    
    Note over U,L: Logout Process
    
    U->>S: 1. Click "Sign Out"
    S->>API: 2. POST /api/accounts/logout/
    Note right of API: {refreshToken}
    
    alt Logout Success
        API->>S: 3. Logout Confirmed
        S->>LS: 4. Remove accessToken
        S->>LS: 5. Remove refreshToken
        S->>LS: 6. Remove user data
        S->>L: 7. Navigate to Login
        L->>U: 8. Show Login Page
    else Logout Failed
        API->>S: 3. Error Response
        S->>LS: 4. Clear Tokens Anyway
        S->>L: 5. Navigate to Login
        L->>U: 6. Show Login Page
    end
```

---

## 📱 Page Interaction Flow

### User Interaction on Data Pages

```mermaid
flowchart TD
    Page[📄 Page Loads]:::page
    Page --> Loading[⏳ Show Loading Spinner]:::loading
    Loading --> Fetch[📡 Fetch Data from API]:::fetch
    
    Fetch --> Display[📊 Display Data Table]:::display
    Display --> User[👤 User Sees Data]:::user
    
    User --> Action{User Action}:::action
    
    Action -->|Type in Search| Search[🔍 Filter Results]:::search
    Action -->|Click Export| Export[📥 Export to Excel]:::export
    Action -->|Click Refresh| Refresh[🔄 Reload Data]:::refresh
    Action -->|Click +X| Modal[📋 Show Modal]:::modal
    
    Search --> Display
    Export --> Download[⬇️ Download File]:::download
    Refresh --> Fetch
    Modal --> Close[❌ Close Modal]:::close
    Close --> Display
    
    classDef page fill:#2196F3,stroke:#1565C0,stroke-width:2px,color:#fff
    classDef loading fill:#FFC107,stroke:#F57C00,stroke-width:2px,color:#000
    classDef fetch fill:#00BCD4,stroke:#00838F,stroke-width:2px,color:#fff
    classDef display fill:#4CAF50,stroke:#2E7D32,stroke-width:2px,color:#fff
    classDef user fill:#9C27B0,stroke:#6A1B9A,stroke-width:2px,color:#fff
    classDef action fill:#E91E63,stroke:#AD1457,stroke-width:2px,color:#fff
    classDef search fill:#2196F3,stroke:#1565C0,stroke-width:2px,color:#fff
    classDef export fill:#FF9800,stroke:#E65100,stroke-width:2px,color:#fff
    classDef refresh fill:#009688,stroke:#00695C,stroke-width:2px,color:#fff
    classDef modal fill:#795548,stroke:#5D4037,stroke-width:2px,color:#fff
    classDef download fill:#4CAF50,stroke:#2E7D32,stroke-width:2px,color:#fff
    classDef close fill:#F44336,stroke:#C62828,stroke-width:2px,color:#fff
```

---

## 🎨 Color Legend

### Flow Diagram Colors Meaning

| Color | Meaning | Used For |
|-------|---------|----------|
| 🟢 **Green** | Success, Completion | Successful operations, data display, done states |
| 🔵 **Blue** | Information, Process | API calls, data fetching, navigation |
| 🟠 **Orange** | Warning, Important | Dashboard, important actions |
| 🔴 **Red** | Error, Danger | Errors, logout, clear actions |
| 🟣 **Purple** | Input, User Action | User inputs, forms, menus |
| 🟡 **Yellow** | Warning, Check | Validation, checks, warnings |
| ⚫ **Gray** | Neutral, Placeholder | Placeholder items, neutral states |
| 🟤 **Brown** | Sidebar, Menu | Navigation, sidebar elements |
| 🔷 **Cyan** | Data Processing | Data processing, formatting |
| 🔶 **Pink** | Actions, Interactions | User actions, interactions |

---

## 📝 Key Points for Client Presentation

### 1. **Login Flow**
- Simple 3-step process: Enter credentials → API call → Dashboard
- Secure token storage
- Automatic error handling

### 2. **Navigation**
- Easy sidebar navigation
- All pages accessible from one menu
- Clear visual indicators

### 3. **Data Display**
- Real-time data from backend
- Automatic pagination
- Clean table presentation

### 4. **User Actions**
- Search: Instant filtering
- Export: One-click Excel download
- Refresh: Reload latest data

### 5. **Security**
- Token-based authentication
- Auto-refresh on expiry
- Secure logout

---

**Document Purpose:** Client-friendly flow diagrams for frontend application  
**Last Updated:** 2024
