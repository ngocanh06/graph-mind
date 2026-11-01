"""
Sample Static In-Memory Payloads for PR0 Sandbox.
Contains tiny fixtures for text extraction, CSV headers, and fake chunks.
"""

SAMPLE_TXT_UTF8 = """Hợp đồng dịch vụ tư vấn công nghệ thông tin và kiến trúc hệ thống GraphMind / AEGIS.
Điều 1: Phạm vi công việc và lộ trình bàn giao tài liệu kỹ thuật.
Điều 2: Bảo mật thông tin khách hàng và tuân thủ RBAC.
"""

SAMPLE_CSV_ADVENTUREWORKS_HEADER = "SalesOrderID,RevisionNumber,OrderDate,DueDate,ShipDate,Status,OnlineOrderFlag,SalesOrderNumber,PurchaseOrderNumber,AccountNumber,CustomerID,SalesPersonID,TerritoryID,BillToAddressID,ShipToAddressID,ShipMethodID,CreditCardID,CreditCardApprovalCode,CurrencyRateID,SubTotal,TaxAmt,Freight,TotalDue,Comment,rowguid,ModifiedDate\n1,1,2024-01-01,2024-01-10,2024-01-05,5,1,SO12345,PO12345,10-4020-000001,11000,279,5,985,985,5,1001,1001,,100.0,8.0,2.5,110.5,,a1b2c3d4-e5f6-7890,2024-01-01\n"

SAMPLE_CUSTOM_CSV_HEADER = "id,full_name,department_name,salary,hire_date\n1,Nguyen Van A,Ky Thuat,25000000,2023-05-15\n"
