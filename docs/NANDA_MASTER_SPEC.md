# NANDA Dairy & Agro — Master Product Specification

## Platforms
- Android app
- Windows desktop app
- Responsive web app
- One cloud database and synchronized accounts

## Identity & Security
- One Master Admin controlled by owner.
- Only Master Admin can create/edit/disable customers, reset passwords/PINs, and manage permissions.
- Customer cannot create accounts, edit user IDs, reset credentials, or view another customer's data.
- Customer ID is immutable and unique.
- Customer creation automatically generates a unique User ID and temporary password.
- Passwords must be stored hashed server-side; never plain text.
- Login: User ID + password; optional device PIN and Android biometric / Windows Hello after first successful credential login.
- New device requires primary credentials before biometric/PIN enrollment.
- Audit log for account/security changes.

## Customer Management
- Name, phone, address, rate, daily requirement, status.
- Automatic unique IDs: NDA-CUS-0001, NDA-CUS-0002...
- Automatic temporary password generation.
- Milk orders, deliveries, payments, bills, due, statement.

## Cow Individual Lifetime Record
- Unique QR/tag ID.
- Breed, composition, generation F1/F2/F3/F4+, DOB, weight, sire, dam, 3–4 generation pedigree.
- Daily milk by date and milking session (morning/noon/evening or configurable sessions).
- Daily total, weekly/monthly totals, peak milk, average milk.
- Lactation-wise start, peak, dry-off, total milking days and total yield.
- Lifetime lactation history.
- Health problems, diagnosis, treatment, medicine, dose, cost, recovery.
- Vaccination, deworming and follow-up.
- Heat, AI, semen, pregnancy, re-AI, calving and calf linkage.
- Calf ID and pedigree linkage.

## Milk Sales & Profit
- Exactly four sales channels: House Shop, Amul, Others, Customer / Direct.
- Admin manually sets ₹/kg for each channel/customer.
- Quantity × rate = sales automatically.
- Expenses automatically deducted from sales for operating profit.
- Expense categories: feed, medicine, breeding/AI, labour, electricity/water, transport, maintenance, other.
- Reports: daily, weekly, monthly, yearly; sales by channel; expense category; profit; margin; profit/kg; profit/cow.

## Semen / Bull Inventory
- Company, bull name, bull ID, breed, sexed/conventional, sire, MGS, genetic data, price/dose, supplier, batch, purchase date.
- Opening stock, purchases, AI use, wastage, available doses.
- Low-stock alert.
- AI record automatically reduces semen inventory.
- Bull-wise usage, pregnancy and calf outcome reports.

## Stock
- Feed and medicine stock.
- Minimum stock alert.
- Medicine expiry alert.
- Purchase and consumption ledger.

## Customer Portal
- Customer sees only own profile, orders, delivered milk, bills, payments, due and statements.
- Customer submits future milk requirement.
- Admin sees consolidated daily requirement across customers.

## Reports
- Weekday sales pattern.
- Channel-wise sales and rate.
- Customer-wise sales and due.
- Monthly expense concentration.
- Milk production by cow.
- Lactation performance.
- Breed/generation count.
- Semen stock and performance.
- Farm profitability.

## Cloud Architecture Requirement
Production release must use server-side authorization and a cloud database. Never rely on localStorage for authentication or financial/customer records. Android, Windows and Web clients must use the same API/database with TLS/HTTPS.
