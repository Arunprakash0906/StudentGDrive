# Student Registration & Google Drive Integration Guide

This project provides a React application for student registration that writes records directly to **Google Drive** and **Google Sheets**, using the official **Google Picker API** and **Google Sheets API v4**.

---

## 📋 Active Configuration

Your application is configured with the following parameters in [`.env`](file:///c:/Users/hello/Desktop/PinSoulPRoject/ReacttoGDrive/ReactGDrive/.env):

| Setting | Value |
|---|---|
| **Client ID** | `559156268261-3rs93sp40u7gv07q3qmpv22ofsf4lrgj.apps.googleusercontent.com` |
| **API Key** | `AIzaSyDIlHPrjU_2nbgQ6BZPH_NoV6qeRYLaRN4` |
| **App ID / Project Number** | `559156268261` |
| **Target Google Sheet ID** | `14c3FrM2VMpNG4Cz9jC-XmfLC_NOsYhrl1U0SPT-bx0o` |
| **Google Sheet URL** | [https://docs.google.com/spreadsheets/d/14c3FrM2VMpNG4Cz9jC-XmfLC_NOsYhrl1U0SPT-bx0o/edit](https://docs.google.com/spreadsheets/d/14c3FrM2VMpNG4Cz9jC-XmfLC_NOsYhrl1U0SPT-bx0o/edit) |

---

## 🚀 Form Fields

The form captures and validates:
1. **Student Name (`studentname`)**: Required text field.
2. **Mobile No (`mobileno`)**: Required 10-digit number.
3. **Mail ID (`mailid`)**: Required valid email address.
4. **Course (`course`)**: Required dropdown course selection.

---

## 🛠️ How to Run

1. Open your terminal:
   ```bash
   cd ReactGDrive
   npm run dev
   ```
2. Navigate to: **[http://localhost:5173/](http://localhost:5173/)**
3. Fill in the student form and click **"Save to Google Sheet"**.
4. Check your [Google Sheet](https://docs.google.com/spreadsheets/d/14c3FrM2VMpNG4Cz9jC-XmfLC_NOsYhrl1U0SPT-bx0o/edit)—your row will be appended immediately.

