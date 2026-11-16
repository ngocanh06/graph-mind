"""
GraphMind — Data Semantic Layer & Business Glossary
Defines the canonical database schema (Neo4j Graph + Qdrant Vector),
entity properties, relationships, business metrics, calculation formulas,
default filters, and unsupported metric boundaries.
"""

from dataclasses import dataclass, field
from typing import Dict, List, Set, Optional, Any


@dataclass(frozen=True)
class EntitySchema:
    label: str
    description_vi: str
    primary_key: str
    name_expr: str
    properties: Dict[str, str]
    relationships: List[str]
    rbac_restricted_roles: Set[str] = field(default_factory=set)


@dataclass(frozen=True)
class MetricDefinition:
    key: str
    name_vi: str
    description_vi: str
    formula_cypher: str
    formula_explanation_vi: str
    source_entity: str
    source_properties: List[str]
    unit: str
    aggregation_type: str  # SUM, AVG, COUNT, COUNT_DISTINCT, MIN, MAX, RATIO
    null_handling_rule: str
    dedup_rule: str
    time_dimension_property: Optional[str] = None
    invalid_cases_vi: str = ""


# ============================================================================
# 1. DATABASE SCHEMA REGISTRY (NEO4J KNOWLEDGE GRAPH)
# ============================================================================

SCHEMA_REGISTRY: Dict[str, EntitySchema] = {
    "Customer": EntitySchema(
        label="Customer",
        description_vi="Khách hàng doanh nghiệp và cá nhân trong hệ thống ERP AdventureWorks (19.820 khách hàng: 19.119 có đơn hàng, 701 chưa phát sinh đơn).",
        primary_key="id",
        name_expr=(
            "CASE "
            "WHEN c.FirstName IS NOT NULL AND c.LastName IS NOT NULL "
            "THEN c.FirstName + ' ' + c.LastName + ' (#' + toString(c.id) + ')' "
            "WHEN c.name IS NOT NULL AND NOT c.name STARTS WITH 'Customer #' "
            "THEN c.name + ' (#' + toString(c.id) + ')' "
            "ELSE 'Customer #' + toString(coalesce(c.id, c.CustomerID)) "
            "END"
        ),
        properties={
            "id": "INT — Mã định danh khách hàng (CustomerID)",
            "CustomerID": "INT — Mã khách hàng đồng bộ từ ERP",
            "PersonID": "INT — Mã hồ sơ cá nhân",
            "FirstName": "STRING — Tên khách hàng",
            "LastName": "STRING — Họ khách hàng",
            "name": "STRING — Tên hiển thị mặc định",
        },
        relationships=[
            "(Customer)-[:PLACED_ORDER]->(SalesOrder)",
            "(Customer)-[:PURCHASED]->(Product)",
        ],
    ),
    "SalesOrder": EntitySchema(
        label="SalesOrder",
        description_vi="Đơn đặt hàng bán ra trong hệ thống ERP AdventureWorks (31.465 đơn hàng từ 2011-05-31 đến 2014-06-30).",
        primary_key="id",
        name_expr="'Đơn hàng #' + toString(coalesce(o.id, o.SalesOrderID, o.salesOrderId))",
        properties={
            "id": "INT — Mã đơn hàng (SalesOrderID, từ 43659 đến 75123)",
            "SalesOrderID": "INT — Mã đơn hàng chuẩn ERP",
            "OrderDate": "STRING (YYYY-MM-DD) — Ngày tạo đơn hàng (2011-05-31 đến 2014-06-30)",
            "orderDate": "STRING (YYYY-MM-DD) — Ngày tạo đơn hàng",
            "TotalDue": "FLOAT — Tổng giá trị thanh toán gộp của đơn hàng (SubTotal + TaxAmt + Freight), đơn vị USD",
            "totalDue": "FLOAT — Tổng giá trị thanh toán gộp (USD)",
            "SubTotal": "FLOAT — Doanh thu thuần tiền hàng chưa tính thuế và phí vận chuyển, đơn vị USD",
            "subTotal": "FLOAT — Doanh thu thuần tiền hàng (USD)",
            "TaxAmt": "FLOAT — Tiền thuế đơn hàng (USD)",
            "taxAmt": "FLOAT — Tiền thuế đơn hàng (USD)",
            "Freight": "FLOAT — Chi phí vận chuyển đơn hàng (USD)",
            "freight": "FLOAT — Chi phí vận chuyển đơn hàng (USD)",
        },
        relationships=[
            "(Customer)-[:PLACED_ORDER]->(SalesOrder)",
            "(SalesOrder)-[r:CONTAINS_PRODUCT {OrderQty, UnitPrice, lineTotal}]->(Product)",
        ],
    ),
    "Product": EntitySchema(
        label="Product",
        description_vi="Sản phẩm trong danh mục AdventureWorks (504 sản phẩm: 266 sản phẩm đã có giao dịch bán, 238 sản phẩm linh kiện/nội bộ chưa phát sinh giao dịch).",
        primary_key="id",
        name_expr="coalesce(p.name, p.Name, p.title, 'Product #' + toString(p.id))",
        properties={
            "id": "INT — Mã sản phẩm (ProductID)",
            "ProductID": "INT — Mã sản phẩm chuẩn ERP",
            "name": "STRING — Tên sản phẩm",
            "Name": "STRING — Tên sản phẩm",
            "ProductNumber": "STRING — Mã SKU sản phẩm (ví dụ: BK-R93R-62, AR-5381)",
            "productNumber": "STRING — Mã SKU sản phẩm",
            "ListPrice": "FLOAT — Giá niêm yết chuẩn (USD). Lưu ý: 200 linh kiện bán thành phẩm có ListPrice = 0.0",
        },
        relationships=[
            "(SalesOrder)-[r:CONTAINS_PRODUCT {OrderQty, UnitPrice, lineTotal}]->(Product)",
            "(Product)-[:BELONGS_TO]->(SubCategory)",
            "(Product)-[:BELONGS_TO_DEPT]->(Department)",
        ],
    ),
    "SubCategory": EntitySchema(
        label="SubCategory",
        description_vi="Danh mục sản phẩm cấp 2 (37 danh mục con, ví dụ: Mountain Bikes, Road Bikes, Touring Bikes, Helmets, Jerseys).",
        primary_key="id",
        name_expr="coalesce(sc.name, sc.Name)",
        properties={
            "id": "INT — Mã danh mục con (SubCategoryID)",
            "SubCategoryID": "INT — Mã danh mục con",
            "name": "STRING — Tên danh mục con",
            "Name": "STRING — Tên danh mục con",
        },
        relationships=[
            "(Product)-[:BELONGS_TO]->(SubCategory)",
            "(SubCategory)-[:PART_OF]->(Category)",
        ],
    ),
    "Category": EntitySchema(
        label="Category",
        description_vi="Danh mục sản phẩm cấp 1 (4 danh mục chính: Bikes, Components, Clothing, Accessories).",
        primary_key="id",
        name_expr="coalesce(cat.name, cat.Name)",
        properties={
            "id": "INT — Mã danh mục (CategoryID)",
            "CategoryID": "INT — Mã danh mục",
            "name": "STRING — Tên danh mục (Bikes, Components, Clothing, Accessories)",
            "Name": "STRING — Tên danh mục",
        },
        relationships=[
            "(SubCategory)-[:PART_OF]->(Category)",
        ],
    ),
    "Document": EntitySchema(
        label="Document",
        description_vi="Văn bản, hợp đồng pháp lý CUAD và tài liệu tri thức doanh nghiệp (595 tài liệu đang hoạt động).",
        primary_key="id",
        name_expr="coalesce(d.name, d.title, d.id)",
        properties={
            "id": "STRING — Mã tài liệu (DOC_...)",
            "name": "STRING — Tên tệp tài liệu / hợp đồng",
            "department": "STRING — Phòng ban sở hữu (Pháp chế (Legal), Kinh doanh (Sales), R&D, Kế toán & Thu mua, Công nghệ / IT)",
            "dept": "STRING — Phòng ban",
            "chunksCount": "INT — Số lượng đoạn vector đã lập chỉ mục trong Qdrant",
            "status": "STRING — Trạng thái đồng bộ (SYNCED, INDEXED, active)",
            "op_stage": "STRING — Trạng thái transaction (TERMINAL_SYNCED)",
        },
        relationships=[
            "(Document)-[:CONTAINS_CLAUSE]->(Clause)",
            "(Company)-[:PARTY_TO]->(Document)",
            "(Document)-[:BELONGS_TO_DEPT]->(Department)",
        ],
    ),
    "Clause": EntitySchema(
        label="Clause",
        description_vi="Điều khoản hợp đồng pháp lý trích xuất từ bộ dữ liệu CUAD (1.798 điều khoản).",
        primary_key="id",
        name_expr="coalesce(cl.title, cl.type, cl.id)",
        properties={
            "id": "STRING — Mã điều khoản",
            "type": "STRING — Loại điều khoản (Termination, Limitation of Liability, Governing Law, Confidentiality, Indemnification, Payment Terms)",
            "title": "STRING — Tiêu đề điều khoản",
            "snippet": "STRING — Nội dung trích dẫn điều khoản",
            "source_document_id": "STRING — Mã tài liệu gốc",
            "source_file": "STRING — Tên tệp hợp đồng gốc",
        },
        relationships=[
            "(Document)-[:CONTAINS_CLAUSE]->(Clause)",
        ],
    ),
    "Company": EntitySchema(
        label="Company",
        description_vi="Doanh nghiệp / Đối tác / Nhà cung cấp ký kết hợp đồng (1.891 pháp nhân).",
        primary_key="name",
        name_expr="c.name",
        properties={
            "name": "STRING — Tên công ty / đối tác",
            "domain": "STRING — Lĩnh vực",
        },
        relationships=[
            "(Company)-[:PARTY_TO]->(Document)",
        ],
        rbac_restricted_roles={"standard"},
    ),
    "Employee": EntitySchema(
        label="Employee",
        description_vi="Nhân sự nội bộ doanh nghiệp (Bảo mật RBAC: chỉ Admin và Executive được phép truy cập).",
        primary_key="id",
        name_expr="coalesce(e.name, 'Employee #' + toString(e.id))",
        properties={
            "id": "STRING/INT — Mã nhân viên",
            "name": "STRING — Họ tên nhân sự",
        },
        relationships=[],
        rbac_restricted_roles={"standard", "knowledge_manager"},
    ),
}


# ============================================================================
# 2. BUSINESS GLOSSARY & METRIC DEFINITIONS
# ============================================================================

BUSINESS_METRICS: Dict[str, MetricDefinition] = {
    "gross_revenue": MetricDefinition(
        key="gross_revenue",
        name_vi="Tổng doanh thu gộp (TotalDue)",
        description_vi="Tổng giá trị thanh toán của đơn hàng bao gồm doanh thu thuần sản phẩm (SubTotal), thuế (TaxAmt) và phí vận chuyển (Freight).",
        formula_cypher="round(sum(coalesce(o.totalDue, o.TotalDue, 0.0)), 2)",
        formula_explanation_vi="SUM(SalesOrder.TotalDue) = SubTotal + TaxAmt + Freight",
        source_entity="SalesOrder",
        source_properties=["totalDue", "TotalDue"],
        unit="USD",
        aggregation_type="SUM",
        null_handling_rule="coalesce(o.totalDue, o.TotalDue, 0.0)",
        dedup_rule="Tính trên từng node SalesOrder duy nhất; không nhân bản qua CONTAINS_PRODUCT khi cộng TotalDue.",
        time_dimension_property="orderDate",
        invalid_cases_vi="Không dùng TotalDue của cả đơn hàng khi đang nhóm theo từng Sản phẩm/Danh mục riêng lẻ (khi nhóm theo Sản phẩm phải dùng r.lineTotal).",
    ),
    "net_revenue": MetricDefinition(
        key="net_revenue",
        name_vi="Doanh thu thuần sản phẩm (SubTotal / LineTotal)",
        description_vi="Doanh thu thuần từ tiền hàng hóa chưa bao gồm thuế và phí vận chuyển.",
        formula_cypher="round(sum(coalesce(o.subTotal, o.SubTotal, 0.0)), 2)",
        formula_explanation_vi="Ở cấp đơn hàng: SUM(SalesOrder.SubTotal). Ở cấp dòng sản phẩm: SUM(CONTAINS_PRODUCT.lineTotal).",
        source_entity="SalesOrder / CONTAINS_PRODUCT",
        source_properties=["subTotal", "SubTotal", "lineTotal"],
        unit="USD",
        aggregation_type="SUM",
        null_handling_rule="coalesce(o.subTotal, o.SubTotal, 0.0) hoặc coalesce(r.lineTotal, 0.0)",
        dedup_rule="Khi tính theo sản phẩm hoặc danh mục, tính tổng r.lineTotal trên cạnh CONTAINS_PRODUCT.",
        time_dimension_property="orderDate",
    ),
    "product_quantity": MetricDefinition(
        key="product_quantity",
        name_vi="Tổng số lượng sản phẩm bán/mua (OrderQty)",
        description_vi="Tổng số đơn vị hàng hóa (units) được đặt trong các đơn hàng.",
        formula_cypher="sum(coalesce(r.OrderQty, 0))",
        formula_explanation_vi="SUM(CONTAINS_PRODUCT.OrderQty)",
        source_entity="CONTAINS_PRODUCT",
        source_properties=["OrderQty"],
        unit="sản phẩm",
        aggregation_type="SUM",
        null_handling_rule="coalesce(r.OrderQty, 0)",
        dedup_rule="Cộng tổng thuộc tính OrderQty trên quan hệ (SalesOrder)-[r:CONTAINS_PRODUCT]->(Product).",
        time_dimension_property="orderDate",
    ),
    "distinct_products": MetricDefinition(
        key="distinct_products",
        name_vi="Số loại/mã sản phẩm khác nhau (Distinct Products)",
        description_vi="Số lượng mã sản phẩm duy nhất (không trùng lặp).",
        formula_cypher="count(DISTINCT p)",
        formula_explanation_vi="COUNT(DISTINCT Product)",
        source_entity="Product",
        source_properties=["id"],
        unit="loại sản phẩm",
        aggregation_type="COUNT_DISTINCT",
        null_handling_rule="Bỏ qua NULL",
        dedup_rule="Sử dụng DISTINCT trên node Product.",
    ),
    "order_count": MetricDefinition(
        key="order_count",
        name_vi="Số lượng đơn hàng (Order Count)",
        description_vi="Tổng số đơn đặt hàng duy nhất được ghi nhận.",
        formula_cypher="count(DISTINCT o)",
        formula_explanation_vi="COUNT(DISTINCT SalesOrder)",
        source_entity="SalesOrder",
        source_properties=["id"],
        unit="đơn hàng",
        aggregation_type="COUNT_DISTINCT",
        null_handling_rule="Bỏ qua NULL",
        dedup_rule="Sử dụng count(DISTINCT o) để tránh trùng lặp khi join với sản phẩm.",
        time_dimension_property="orderDate",
    ),
    "customer_count": MetricDefinition(
        key="customer_count",
        name_vi="Số lượng khách hàng (Customer Count)",
        description_vi="Tổng số khách hàng duy nhất trong hệ thống hoặc thỏa mãn điều kiện.",
        formula_cypher="count(DISTINCT c)",
        formula_explanation_vi="COUNT(DISTINCT Customer)",
        source_entity="Customer",
        source_properties=["id"],
        unit="khách hàng",
        aggregation_type="COUNT_DISTINCT",
        null_handling_rule="Bỏ qua NULL",
        dedup_rule="Phân biệt rõ tổng khách hàng đăng ký (19.820) và khách hàng đã mua hàng (19.119).",
    ),
    "avg_order_value": MetricDefinition(
        key="avg_order_value",
        name_vi="Giá trị đơn hàng trung bình (AOV)",
        description_vi="Doanh thu trung bình trên mỗi đơn hàng.",
        formula_cypher="round(avg(coalesce(o.totalDue, o.TotalDue, 0.0)), 2)",
        formula_explanation_vi="AOV (Gross) = SUM(TotalDue) / COUNT(DISTINCT SalesOrder); AOV (Net) = SUM(SubTotal) / COUNT(DISTINCT SalesOrder)",
        source_entity="SalesOrder",
        source_properties=["totalDue", "subTotal"],
        unit="USD/đơn hàng",
        aggregation_type="AVG",
        null_handling_rule="coalesce(o.totalDue, o.TotalDue, 0.0)",
        dedup_rule="Tính trung bình trên tập các đơn hàng duy nhất (không join sản phẩm trước khi lấy avg đơn hàng).",
        time_dimension_property="orderDate",
        invalid_cases_vi="Nếu số lượng đơn hàng = 0 thì không thể tính AOV.",
    ),
    "avg_revenue_per_customer": MetricDefinition(
        key="avg_revenue_per_customer",
        name_vi="Doanh thu trung bình trên mỗi khách hàng (ARPC)",
        description_vi="Tổng doanh thu chia cho tổng số khách hàng có phát sinh giao dịch.",
        formula_cypher="round(sum(coalesce(o.totalDue, o.TotalDue, 0.0)) / count(DISTINCT c), 2)",
        formula_explanation_vi="ARPC = SUM(TotalDue) / COUNT(DISTINCT Customer)",
        source_entity="Customer / SalesOrder",
        source_properties=["totalDue"],
        unit="USD/khách hàng",
        aggregation_type="RATIO",
        null_handling_rule="coalesce(o.totalDue, 0.0)",
        dedup_rule="Chia tổng doanh thu cho số khách hàng duy nhất.",
    ),
    "repeat_customer_rate": MetricDefinition(
        key="repeat_customer_rate",
        name_vi="Tỷ lệ khách hàng mua lặp lại (Repeat Purchase Rate)",
        description_vi="Tỷ lệ phần trăm khách hàng có từ 2 đơn hàng trở lên trên tổng số khách hàng đã mua hàng.",
        formula_cypher="(count(CASE WHEN order_count > 1 THEN 1 END) * 100.0) / count(c)",
        formula_explanation_vi="(Số khách hàng có số đơn >= 2 / Tổng số khách hàng có mua hàng) × 100%",
        source_entity="Customer / SalesOrder",
        source_properties=["id"],
        unit="%",
        aggregation_type="RATIO",
        null_handling_rule="Chỉ tính khách hàng có ít nhất 1 đơn hàng làm mẫu số chính (kèm chú thích tổng 19.820 KH).",
        dedup_rule="Đếm DISTINCT SalesOrder trên mỗi Customer.",
    ),
    "list_price": MetricDefinition(
        key="list_price",
        name_vi="Giá niêm yết sản phẩm (ListPrice)",
        description_vi="Giá bán niêm yết của sản phẩm trong danh mục Product.",
        formula_cypher="round(coalesce(p.ListPrice, p.listPrice, 0.0), 2)",
        formula_explanation_vi="Product.ListPrice",
        source_entity="Product",
        source_properties=["ListPrice"],
        unit="USD",
        aggregation_type="MIN/MAX/AVG",
        null_handling_rule="Khi tìm sản phẩm thương mại giá thấp nhất, lọc ListPrice > 0.0 (và ghi chú rõ 200 linh kiện nội bộ có ListPrice = $0.00).",
        dedup_rule="Tính trên từng node Product.",
    ),
    "revenue_growth_rate": MetricDefinition(
        key="revenue_growth_rate",
        name_vi="Tỷ lệ tăng trưởng doanh thu (Revenue Growth Rate)",
        description_vi="Tốc độ tăng/giảm doanh thu giữa kỳ hiện tại và kỳ trước đó.",
        formula_cypher="round(((curr_rev - prev_rev) / prev_rev) * 100.0, 2)",
        formula_explanation_vi="((Giá trị kỳ hiện tại - Giá trị kỳ trước) / Giá trị kỳ trước) × 100%",
        source_entity="SalesOrder",
        source_properties=["totalDue", "subTotal", "orderDate"],
        unit="%",
        aggregation_type="RATIO",
        null_handling_rule="Nếu giá trị kỳ trước = 0 hoặc không có dữ liệu, không thực hiện phép chia và thông báo rõ không thể tính tỷ lệ tăng trưởng.",
        dedup_rule="Tổng hợp doanh thu từng kỳ độc lập trước khi tính tỷ lệ.",
        time_dimension_property="orderDate",
    ),
    "revenue_share": MetricDefinition(
        key="revenue_share",
        name_vi="Tỷ trọng đóng góp doanh thu (Revenue Contribution Share)",
        description_vi="Tỷ lệ phần trăm doanh thu của một sản phẩm hoặc danh mục so với tổng doanh thu toàn hệ thống.",
        formula_cypher="round((group_rev * 100.0) / total_rev, 2)",
        formula_explanation_vi="(Doanh thu nhóm / Tổng doanh thu) × 100%",
        source_entity="SalesOrder / Product / Category",
        source_properties=["lineTotal", "totalDue"],
        unit="%",
        aggregation_type="RATIO",
        null_handling_rule="Nếu tổng doanh thu = 0, trả về None.",
        dedup_rule="Sử dụng tổng lineTotal khi tính tỷ trọng giữa các danh mục sản phẩm.",
    ),
}


# ============================================================================
# 3. UNSUPPORTED / OUT-OF-SCHEMA METRICS REGISTRY
# ============================================================================

UNSUPPORTED_METRICS_EXPLANATIONS: Dict[str, str] = {
    "inventory_stock": (
        "Hệ thống cơ sở dữ liệu đồ thị Neo4j hiện tại lưu trữ Danh mục Sản phẩm (`Product`: 504 sản phẩm, mã SKU, giá niêm yết `ListPrice`) "
        "và Lịch sử Đơn hàng (`SalesOrder`: 31.465 đơn hàng, số lượng bán `OrderQty`, doanh thu `TotalDue`/`SubTotal`), "
        "**chưa tích hợp bảng số lượng tồn kho thời gian thực (`ProductInventory` / `StockQuantity`)**.\n\n"
        "• **Giới hạn dữ liệu:** Không thể truy vấn số lượng tồn kho hiện tại của từng sản phẩm.\n"
        "• **Dữ liệu liên quan có sẵn:** Hệ thống ghi nhận **266/504** sản phẩm đã phát sinh giao dịch bán (tổng **274.914** đơn vị sản phẩm bán ra) "
        "và **238/504** sản phẩm trong danh mục chưa phát sinh đơn hàng bán lẻ."
    ),
    "profit_margin": (
        "Hệ thống cơ sở dữ liệu đồ thị Neo4j hiện tại lưu trữ đầy đủ **Doanh thu thuần (`SubTotal`/`LineTotal`)**, "
        "**Giá bán sau chiết khấu (`UnitPrice`, `unitPriceDiscount`)** và **Giá vốn tiêu chuẩn (`StandardCost`)** trên từng sản phẩm (`Product`). "
        "Do đó, hệ thống có thể tính toán chính xác **Lợi nhuận gộp và mức lỗ biên độ (Gross Profit / Margin Loss = LineTotal - StandardCost * OrderQty)** cho từng đơn hàng và sản phẩm.\n\n"
        "• **Dữ liệu khả dụng:** Phân tích lợi nhuận gộp theo từng đơn hàng, từng sản phẩm và phát hiện các trường hợp bán dưới giá vốn tiêu chuẩn.\n"
        "• **Giới hạn dữ liệu:** Chưa tích hợp các chi phí vận hành gián tiếp ngoài sản xuất (chi phí quản lý doanh nghiệp SGA, chi phí marketing) để xác định Lợi nhuận ròng cuối cùng (Net Profit)."
    ),
    "cancelled_order_rate": (
        "Trong schema đồ thị `SalesOrder` hiện tại (31.465 đơn hàng), các bản ghi được đồng bộ là các đơn hàng đã xác nhận phát sinh doanh thu "
        "(các thuộc tính gồm: `SalesOrderID`, `OrderDate`, `SubTotal`, `TaxAmt`, `Freight`, `TotalDue`) và **không có trường trạng thái hủy đơn (`OrderStatus = Cancelled/Rejected`)**.\n\n"
        "• **Giới hạn dữ liệu:** Không thể tính tỷ lệ đơn hàng bị hủy do schema hiện tại không lưu lịch sử đơn hủy."
    ),
    "conversion_rate": (
        "Hệ thống hiện tại quản lý dữ liệu giao dịch ERP (`Customer`, `SalesOrder`, `Product`) và kho hợp đồng pháp lý (`Document`, `Clause`), "
        "**không lưu trữ dữ liệu lượt truy cập (sessions/leads/traffic)** nên không thể tính Tỷ lệ chuyển đổi (Conversion Rate) từ lượt truy cập sang đơn hàng.\n\n"
        "• **Chỉ số tương đương có sẵn trong DB:**\n"
        "  - **Tỷ lệ khách hàng có phát sinh đơn hàng (Active Buyer Rate):** **19.119 / 19.820 khách hàng (96,46%)** đã mua ít nhất 1 đơn hàng (701 khách hàng chưa phát sinh đơn).\n"
        "  - **Tỷ lệ khách hàng mua lặp lại (Repeat Purchase Rate):** **7.470 / 19.119 khách hàng mua hàng (39,07%)** có từ 2 đơn hàng trở lên."
    ),
    "salesperson_performance": (
        "Trong đồ thị Neo4j hiện tại, các đơn hàng (`SalesOrder`) được liên kết trực tiếp với khách hàng (`Customer`) qua quan hệ `[:PLACED_ORDER]` "
        "và sản phẩm (`Product`) qua `[:CONTAINS_PRODUCT]`, **chưa có quan hệ nối giữa nhân viên bán hàng (`Employee`/`SalesPerson`) với từng đơn hàng (`SalesOrder`)** (hiện có 0 node `Employee` gắn với đơn hàng).\n\n"
        "• **Giới hạn dữ liệu:** Không thể xếp hạng hoặc so sánh doanh số bán hàng theo từng nhân viên kinh doanh cá nhân."
    ),
}


# Dataset Temporal Constants (verified from Neo4j SalesOrder)
DATASET_MIN_DATE = "2011-05-31"
DATASET_MAX_DATE = "2014-06-30"
DATASET_YEARS = ["2011", "2012", "2013", "2014"]
DATASET_LATEST_YEAR = "2014"
DATASET_PREV_YEAR = "2013"
DATASET_LATEST_MONTH = "2014-06"
DATASET_PREV_MONTH = "2014-05"

