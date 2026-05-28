# Frontend Quick Reference Guide

## 🚀 Quick Start

### Login Flow
1. User visits application → Login Page
2. Enter **Email** and **Password**
3. Click "Log in" button
4. System stores tokens → Redirects to Dashboard

### After Login - Sidebar Menu

```
📊 Dashboard
🔍 Asset Discovery (Click to expand)
   ├─ 👣 Subdomains
   ├─ 🗺️ Endpoints  
   ├─ 🔌 Open Ports
   ├─ 📁 Directories
   └─ 🔧 Technologies
🐞 Vulnerabilities (Not implemented)
🔒 SSL Certificate
🛒 Marketplace (Not implemented)
⚙️ Settings (Not implemented)
🚪 Sign Out
```

---

## 📋 Page Data Summary

### Dashboard (`/dashboard`)
- **Statistics:** Critical (12), High (24), Medium (36), Low (8)
- **Recent Vulnerabilities Table**
- **Quick Actions:** New Scan, Generate Report, Security Check
- **Recent Activity Feed**

### Subdomains (`/subdomains`)
**API:** `GET /api/attacksurface/subdomains/?org_id=2`

**Fields:**
- Domain, Status, Title
- Technologies (array, max 3 visible)
- IP Addresses (array, max 3 visible)
- Ports (array, max 3 visible)
- Screenshot, Location
- WAF, CDN
- Created Date, Updated Date

**Actions:** Search, Export Excel, Refresh

### Endpoints (`/endpoints`)
**API:** `GET /api/attacksurface/endpoints/?org_id=2`

**Fields:**
- HTTP URL (clickable)
- Subdomain Name
- Status Code (color-coded)
- Technologies (array)
- Title, Content Type, Content Length
- Discovered Date, Last Scanned

**Actions:** Search, Export Excel, Refresh

### Open Ports (`/open-ports`)
**API:** `GET /api/attacksurface/open-ports/?org_id=2`

**Fields:**
- Domain
- Ports (array, max 3 visible)
- Created Date, Updated Date

**Actions:** Search, Export Excel, Refresh

### Directories (`/directories`)
**API:** `GET /api/attacksurface/directories/?org_id=2`

**Fields:**
- URL
- Subdomain Name
- Content Type, Content Details
- Status
- Discovered Date

**Actions:** Search, Export Excel, Refresh

### Technologies (`/technologies`)
**API:** `GET /api/attacksurface/technologies/?org_id=2`

**Fields:**
- Domain
- Technologies (array, max 3 visible)
- Created Date, Updated Date

**Actions:** Search, Export Excel, Refresh

---

## 🔑 Login Fields

| Field | Type | Required | Example |
|-------|------|----------|---------|
| Email | email | ✅ Yes | example@position |
| Password | password | ✅ Yes | ******** |
| Remember Me | checkbox | ❌ No | - |

---

## 🔐 Authentication

**Login API:** `POST /api/accounts/login/`

**Request:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "tokens": {
    "access": "eyJ0eXAiOiJKV1QiLCJhbGc...",
    "refresh": "eyJ0eXAiOiJKV1QiLCJhbGc..."
  },
  "user": {
    "id": 1,
    "name": "John Doe",
    "email": "user@example.com"
  }
}
```

**Storage:**
- `localStorage.accessToken` - Used for API requests
- `localStorage.refreshToken` - Used for token refresh
- `localStorage.user` - User information

---

## 🔄 Common Actions

### Search
- Real-time filtering as you type
- Searches across multiple fields
- Works on all data pages

### Export to Excel
- Click "Export to Excel" button
- Downloads formatted Excel file
- Includes all columns and data
- File name: `{resource}_{date}.xlsx`

### Refresh
- Click refresh button (↻)
- Reloads data from API
- Maintains current search/filters

---

## 📊 Data Display Rules

### Arrays (Technologies, IPs, Ports)
- Show maximum **3 items** in table cell
- If more than 3, show "+X" button
- Click "+X" to open modal with all items

### Status Codes
- **200-299:** Green badge (Success)
- **300-399:** Blue badge (Redirect)
- **400-499:** Yellow badge (Client Error)
- **500+:** Red badge (Server Error)

### Dates
- Format: **DD-M-YYYY** (e.g., 01-1-2024)
- Shows "-" if date is missing

---

## 🎯 Navigation Flow

```
Login → Dashboard
  ↓
Sidebar Navigation
  ↓
Select Page (Subdomains/Endpoints/etc.)
  ↓
Fetch Data from API
  ↓
Display in Table
  ↓
User Actions (Search/Export/Refresh)
```

---

## ⚠️ Error Handling

- **401 Unauthorized:** Auto-refresh token, or redirect to login
- **Network Error:** Show error message
- **No Data:** Display "No items found" message
- **Loading:** Show spinner during API calls

---

## 🔧 Technical Details

**Base URL:** `http://127.0.0.1:8000/api/`

**Authentication Header:**
```
Authorization: Bearer {accessToken}
```

**Pagination:**
- Automatically fetches all pages
- Combines results into single array
- Uses `next` field from API response

---

## 📱 UI Components

**Header:**
- Fixed at top
- App name: "Infotech Sentinel"
- Navigation buttons
- User info / Login buttons

**Sidebar:**
- Fixed on left (280px width)
- Below header
- Collapsible Asset Discovery menu
- Active state highlighting

**Tables:**
- Responsive with horizontal scroll
- Hover effects
- Color-coded badges
- Clickable links

---

## 🚪 Logout Flow

1. Click "Sign Out" in sidebar
2. API call: `POST /api/accounts/logout/`
3. Clear all tokens from localStorage
4. Redirect to Login page

---

## 📞 Need Help?

- **Full Documentation:** See `FRONTEND_FLOW_DOCUMENTATION.md`
- **Visual Diagrams:** See `FLOW_DIAGRAMS.md`
- **API Docs:** `http://127.0.0.1:8000/api/docs/`

---

**Last Updated:** 2024
