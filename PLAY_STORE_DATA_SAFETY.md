# Google Play Console — Data Safety Form Answers

This document contains exact answers to copy and paste into the **Data Safety** section in Google Play Console for **WhereDidItGo**.

---

## Section 1: Data Collection & Sharing Overview

* **Does your app collect or share any of the required user data types?**  
  👉 **No** (If running fully local without telemetry) OR **Yes** (If basic crash reporting is active).

* **Is all of the user data collected by your app encrypted in transit?**  
  👉 **Yes** (All Play Billing network communications use HTTPS/TLS).

* **Do you provide a way for users to request that their data be deleted?**  
  👉 **Yes** (Users can delete all local data inside **Settings → Reset Data** or by uninstalling the app).

---

## Section 2: Data Types Breakdown

| Data Category | Data Type | Collected? | Shared? | Processing Purpose | Ephemeral / Stored |
|---|---|---|---|---|---|
| **Financial Info** | User payment info | No | No | N/A (Processed by Google Play) | N/A |
| **Financial Info** | Financial records | **No (Stays local)** | **No** | Local Storage Only | Stored Locally |
| **Personal Info** | Name / Email | No | No | N/A | N/A |
| **App Info & Perf** | Crash logs / Diagnostics | Yes (Optional) | No | App Functionality & Analytics | Ephemeral |
| **Device IDs** | Device identifiers | No | No | N/A | N/A |

---

## Section 3: Financial Scrutiny Declaration (Manual Tracker)

> "WhereDidItGo is a local-first manual expense and budget tracking application. It does not connect to bank accounts, aggregate banking credentials, process real money transfers, or perform financial transactions."
