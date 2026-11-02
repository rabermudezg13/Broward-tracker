# Broward Tracker

A browser-only Kelly Education onboarding tracker, based on the visual style of [Dashtracker](https://rabermudezg13.github.io/dashtracker/).

Open the site and choose the Broward Excel workbook. Applicant records stay in browser memory. No workbook, applicant data, account credentials, Firebase or Railway service is included in this repository. Refreshing or closing the page clears the imported workbook.

## Requirements

Sanctions, SF/DNU list, Kelly ClassSmart, D & T, References, I-9, Education Requirement, FP Cleared, Background Check, FP Screening, Orientation, and FP Expiration from CH.

Kim, Casey and Pamela are selected initially when present. Other applicant worksheets can be included explicitly. Landing Page, Dropdown and Template are excluded. Headers are detected in the first 15 rows. Worksheets without a requested column show **No column** rather than a false missing value. Records retain the source worksheet and Excel row; records are not deduplicated across worksheets.

Complete/Completed/Approved/Cleared/Verified/Done/Yes and N/A are satisfied. Need and blanks are missing. Pending/Requested/Sent remain outstanding. Other values need review. An orientation date means scheduled, not complete. FP expiration aliases include FP Expiration, FP Expiration from CH and FP Expiration from ClearingHouse; inspect details for the actual header. Missing expiration means no valid date, including text such as Not in ch. Expired dates are separate and evaluated against the device's local day. CSV exports include all filtered rows, original values and source references.

This is a read-only view of the workbook. Update the source Excel and reopen it to refresh.

## Hosting

GitHub Pages: repository Settings → Pages → Deploy from a branch → main → / (root) → Save. No build or server is needed. All runtime assets are included locally.

Local preview: `python3 -m http.server 8000` in this folder. Open `http://localhost:8000`.

## Dependency

SheetJS Community Edition 0.18.5 (`xlsx.full.min.js`), Apache-2.0. Obtained from cdnjs; loaded from this repository at runtime. See `LICENSE.sheetjs` for its license.
