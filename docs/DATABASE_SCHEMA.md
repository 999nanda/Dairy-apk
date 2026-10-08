# NANDA Cloud Data Model (production target)

Core tables/entities:
- users
- roles
- devices
- audit_logs
- customers
- customer_credentials
- cattle
- pedigree_links
- lactations
- milk_records
- milk_sessions
- health_records
- vaccination_records
- deworming_records
- breeding_records
- pregnancies
- calvings
- calves
- semen_bulls
- semen_inventory_transactions
- milk_sales
- customer_orders
- payments
- bills
- expenses
- stock_items
- stock_transactions
- notifications

Every customer-facing query must be scoped by authenticated user/customer ID. Master Admin is the only role allowed to create/reset/disable accounts.
