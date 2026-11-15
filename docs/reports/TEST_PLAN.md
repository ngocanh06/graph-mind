# GraphMind — Test Plan

**Bản Word để review/in:** [TEST_PLAN.docx](./TEST_PLAN.docx) · **Workbook chạy test và ghi nhận kết quả:** [TEST_CASES_AND_REPORT.xlsx](./TEST_CASES_AND_REPORT.xlsx)

| Thông tin | Giá trị |
|---|---|
| Mã tài liệu | GM-TEST-PLAN |
| Phiên bản | 2.1 |
| Ngày cập nhật | 11-11-2026 |
| Phạm vi hệ thống | GraphMind — GraphRAG-based Enterprise Knowledge Management Platform |
| Tài liệu liên quan | [Test Cases](./TEST_CASES.md), [User Story](../02-user-story/4.%20C1SE18_UserStory_GraphMind-Ver1.1.docx), [SRS](../05-srs/5.%20C1SE18_SRS_GraphMind_Ver1.1.docx) |
| Tham khảo quy trình | [Test Plan OpenCart](../test/TESTPLAN_PROJECT_SOFTWARETESTING_OPENCART_GROUP2.docx), [Test Case & Test Report](../test/TestCase%26TestReport.xlsx), [Functional Testing OpenCart](../test/Project_TranThiNgocAnh_3814.docx) |

## 1. Mục tiêu chất lượng

- Xác nhận các luồng nghiệp vụ cốt lõi hoạt động từ giao diện/API đến dữ liệu, không chỉ xác nhận endpoint trả HTTP thành công.
- Xác nhận người dùng chỉ nhìn thấy dữ liệu và chức năng được cấp theo role và department/data scope.
- Xác nhận tài liệu được nhận, xử lý, tìm kiếm và truy xuất có nguồn; dữ liệu không đồng bộ hoặc lỗi dịch vụ không bị báo thành công giả.
- Phát hiện lỗi trước nghiệm thu, ghi nhận bằng chứng, phân loại severity và kiểm tra lại sau khi sửa.

## 2. Vai trò, phạm vi nghiệp vụ và truy vết

User Story nêu các role nghiệp vụ **SME Manager, Standard User, Admin, Research Team**; backend hiện định nghĩa canonical roles `knowledge_manager`, `standard`, `it_admin`, `executive`. Cần PO xác nhận mapping giữa hai mô hình, nhất là `Research Team`, trước khi chốt expected role coverage. Sales, Accounting, HR, Legal và IT là department/data scope, không phải system role. Backend user-admin hiện chưa có field department trong API tạo user.

| Luồng nghiệp vụ | Module | Quy trình được kiểm thử | Yêu cầu nguồn |
|---|---|---|---|
| Đăng nhập và cấp quyền | M6 | Đăng nhập → nhận danh tính/session → vào dashboard được phép → truy cập tài nguyên theo role/data scope | User Story: JWT authentication và RBAC |
| Nạp và đồng bộ dữ liệu | M1, M2 | Nguồn/tệp → nhận và lưu → xử lý → cập nhật chỉ mục graph/vector → hiển thị trạng thái/dữ liệu | User Story: Document Ingestion API, Data Source & Sync |
| Quản trị tri thức | M2, M6 | Xem tài liệu/thực thể → sửa nội dung/quan hệ → audit → Copilot dùng tri thức đã sửa | User Story: Knowledge Editor và Graph Editor/Copilot Integration |
| Tìm kiếm doanh nghiệp | M5 | Nhập từ khóa → lọc theo facet → áp dụng quyền → xem kết quả/preview | User Story: Enterprise Multi-facet Search |
| Hỏi đáp có căn cứ | M3 | Đặt câu hỏi → phân tích ý định → truy xuất graph/vector → hợp nhất → trả lời kèm citation → hỏi tiếp/pin session | User Story: Hybrid AI Copilot & Search |
| Ra quyết định | M4 | Đồng bộ dữ liệu → xem KPI/biểu đồ/cảnh báo → đối chiếu dữ liệu nguồn | User Story: Home & Executive Decision Dashboard, Risks |
| Quy trình SOP | M2 | Tạo nháp → sửa → publish → tra cứu SOP đã phát hành | User Story: SOP & Internal Knowledge Base |
| Quản trị hệ thống | M6 | Tạo/quản lý user → gán role/scope → kiểm tra quyền → xem audit/health | User Story: System Admin & Security |

Các story Optional/Stretch (ví dụ xuất báo cáo Word/PDF hoặc LLMOps dashboard) không nằm trong tiêu chí nghiệm thu mặc định; chỉ đưa vào scope khi Product Owner xác nhận.

## 3. Chiến lược và kỹ thuật kiểm thử

Kiểm thử theo thứ tự nghiệp vụ và có truy vết từ story/SRS đến test case. Bản đồ ưu tiên và các case chi tiết theo từng phần được quản lý trong [Test Cases](./TEST_CASES.md); Phần 1 hiện tập trung M6 (đăng nhập, session, RBAC và Admin), các phần sau triển khai khi fixture và expected nghiệp vụ sẵn sàng:

1. **Unit / white-box:** parser, grounding, safety guard, rule xử lý và các nhánh biên; dùng pytest, fake và mock.
2. **API / integration:** gọi router và dependency qua test app; kiểm tra status, schema, quyền và side effect với dữ liệu cô lập.
3. **Functional / black-box:** kiểm tra precondition, input, bước nghiệp vụ và actual result theo [Test Cases](./TEST_CASES.md).
4. **UI / acceptance E2E:** hoàn tất luồng từ màn hình người dùng qua API trong staging riêng bằng Robot Framework/Browser.
5. **Regression:** chạy lại ca lỗi đã sửa cùng các luồng bị ảnh hưởng.

Kỹ thuật thiết kế:

- Equivalence partitioning và boundary value cho đăng nhập, metadata, bộ lọc và tệp đầu vào theo giới hạn được cấu hình.
- Decision table cho role × department/data scope × action.
- Branch/basic-path cho validation, auth và pipeline xử lý.
- Error guessing cho tài liệu trùng, tệp lỗi, dịch vụ gián đoạn, truy vấn mơ hồ/không hỗ trợ và lỗi đồng bộ.
- Golden fixtures cho NL2Cypher/GraphRAG; so sánh câu trả lời với ground truth và nguồn citation đã xác nhận, không đánh giá bằng câu trả lời nghe có vẻ hợp lý.

## 4. Môi trường và dữ liệu

| Cấp độ | Môi trường | Quy tắc |
|---|---|---|
| Unit/integration | Local test app, fake clients, mock | Không truy cập database/runtime thật; giữ network guard. |
| API/UI E2E có ghi dữ liệu | Stack staging `docker-compose.robot.yml` | Chỉ dùng cổng và thông tin test theo [Robot README](../../tests/robot/README.md); tuyệt đối không đổi sang database/volume ứng dụng thường. |
| Golden RAG / benchmark | Dataset và database được chỉ định riêng cho benchmark | Ghi rõ snapshot/dataset, ground truth, model và cấu hình; không chạy ngầm trong pytest mặc định nếu có thể gọi dịch vụ thật. |

Dữ liệu kiểm thử phải tổng hợp hoặc đã được phê duyệt: tài khoản cho bốn role, department scope khác nhau, tài liệu đại diện cho định dạng được hỗ trợ, fixture graph/vector, SOP và báo cáo tạm. Không ghi password/token thật vào tài liệu, testcase hoặc log.

## 5. Điều kiện vào, tạm dừng và kết thúc

**Entry criteria**

- Phiên bản/commit, story trong scope và expected behavior đã được thống nhất.
- Test cases đã được review; test data và tài khoản staging sẵn sàng.
- Các dịch vụ cần cho cấp test tương ứng ở trạng thái healthy; xác minh stack cô lập trước test có ghi dữ liệu.
- Người chạy biết lệnh và đích dữ liệu; không có cấu hình trỏ tới production.

**Suspension criteria**

- Không đăng nhập được, backend hoặc dịch vụ dữ liệu không ổn định, hoặc staging không thể phân biệt với môi trường dùng chung.
- Fixture/data không đủ để xác định expected result.
- Test gây side effect ngoài dự kiến hoặc có nguy cơ ghi/xóa dữ liệu không thuộc staging.

Chỉ tiếp tục khi nguyên nhân được xử lý, dữ liệu/môi trường được xác minh lại và các case bị ảnh hưởng được chạy lại.

**Exit criteria cho một đợt nghiệm thu**

- 100% ca P0 trong scope đã chạy; ít nhất 95% tổng số ca trong scope đã có kết quả.
- Tỷ lệ pass tối thiểu 90% trên số ca đã chạy; mọi fail/blocked có lý do và liên kết defect hoặc quyết định chấp nhận.
- Không còn defect Critical/High chưa được sửa và retest đạt, hoặc chưa có phê duyệt ngoại lệ bằng văn bản.
- Tối đa 2 defect Medium được chấp nhận có workaround và owner; defect Low được ghi nhận.
- Đã chạy regression cho lỗi được sửa, dọn dữ liệu test và hoàn tất báo cáo test/defect.

`NOT RUN` không tính là đã thực thi; `BLOCKED` phải có lý do và không được tính là pass.

## 6. Quy trình thực hiện và quản lý lỗi

1. Chốt phạm vi, version, user story và mức ưu tiên.
2. Chuẩn bị/review test case, tài khoản, fixture và expected result.
3. Khởi tạo môi trường; chạy health check và xác nhận đang ở staging cô lập.
4. Chạy unit/integration → API/E2E → golden/regression theo dependency của luồng.
5. Ghi Actual Result, status, evidence và defect ID ngay sau mỗi lần chạy.
6. Với `FAIL`: tester xác nhận có thể tái hiện, đối chiếu expected, mở defect; developer sửa; tester chạy retest; khi đạt thì chạy regression liên quan.
7. Tổng hợp báo cáo theo module/luồng, severity, tỷ lệ chạy/pass/fail/blocked và rủi ro còn lại.

Vòng đời defect: `New → Triaged/Assigned → In Progress → Fixed → Retest → Closed`; nếu retest vẫn lỗi thì chuyển lại `In Progress`. Mỗi defect có mô tả, môi trường/commit, precondition, bước tái hiện, expected, actual, severity, evidence và test case liên quan.

| Severity | Ý nghĩa |
|---|---|
| Critical | Lộ dữ liệu/chiếm quyền, mất hoặc hỏng dữ liệu diện rộng, hệ thống không thể dùng. |
| High | Luồng nghiệp vụ cốt lõi hỏng hoặc phân quyền sai; không có workaround an toàn. |
| Medium | Chức năng phụ/nhánh nghiệp vụ sai nhưng có workaround; ảnh hưởng có giới hạn. |
| Low | Lỗi trình bày hoặc bất tiện nhỏ, không làm sai dữ liệu/quyền. |

## 7. Trách nhiệm và rủi ro

| Vai trò | Trách nhiệm |
|---|---|
| Test Lead / người phụ trách chất lượng | Chốt scope, review cases, điều phối môi trường, theo dõi coverage/defects, phát hành test summary. |
| Tester / người xác nhận nghiệp vụ | Chuẩn bị dữ liệu, thực thi cases, ghi actual/evidence, tạo defect và retest. |
| Developer | Hỗ trợ chẩn đoán, sửa lỗi, cung cấp unit/integration test và thông tin migration/config liên quan. |
| Product Owner / đại diện nghiệp vụ | Xác nhận expected result, business rule, ưu tiên và các ngoại lệ được chấp nhận. |

| Rủi ro | Tác động | Giảm thiểu |
|---|---|---|
| Test ghi dữ liệu vào môi trường thông thường | Mất/hỏng dữ liệu | Chỉ cho phép E2E ghi vào staging cô lập; kiểm tra URL/port trước chạy. |
| Neo4j/Qdrant/PostgreSQL lệch nhau | Search/citation sai hoặc dữ liệu mất nhất quán | Có fixture ID và bước đối chiếu ba lớp; thử lỗi một dependency. |
| Expected AI không có ground truth | Kết quả pass/fail chủ quan | Dùng golden fixtures được review và lưu citation mong đợi; cô lập biến động LLM thật. |
| Quyền trong UI khác quyền backend | Rò rỉ dữ liệu | Kiểm tra cả hiển thị UI lẫn request trực tiếp; lấy backend làm hàng rào quyết định. |
| Test vô tình làm thay đổi fixture/local state | Kết quả không lặp lại | Dùng dữ liệu tạm, cleanup/teardown và lưu ý side effect trước khi chạy. Trong lần chạy baseline hiện có, hai file watcher JSON bị thay đổi; cần kiểm soát/ cô lập side effect này ở lần chạy sau. |

## 8. Lệnh chạy và baseline hiện có

```powershell
python -m pytest -v
```

```powershell
$out = Join-Path $env:TEMP 'graphmind-robot-results'
robot --console verbose --consolewidth 140 --outputdir $out tests\robot
Invoke-Item (Join-Path $out 'log.html')
```

Lệnh Robot chỉ được chạy sau khi dựng và health-check stack cô lập theo [Robot README](../../tests/robot/README.md).

`pytest.ini` hiện chỉ thu thập `backend/app/tests/unit` và `backend/app/tests/integration`, đồng thời ignore một số test; các test staging/legacy và golden suite ngoài `testpaths` không nằm trong kết quả mặc định. Baseline mặc định đã ghi nhận trước đó là **111 passed, 1 skipped**, kèm một cảnh báo dependency; lần chạy đó làm thay đổi hai file JSON trạng thái watcher và các thay đổi này được giữ nguyên.

Trong cycle staging ngày **09-11-2026**, chạy riêng được **109 unit passed**, **3 integration passed**, **23 Robot passed**, frontend production build **passed**, và smoke **36 endpoint read-only** không còn lỗi server/transport sau khi sửa tham số query cho lần gọi Knowledge Explorer. TC-COP-005 **failed** và được ghi thành GM-DEF-001; golden GraphRAG **blocked** vì graph staging rỗng. Kết quả chi tiết và các giới hạn phạm vi nằm trong [Test Cases & Test Report](./TEST_CASES.md) và [workbook](./TEST_CASES_AND_REPORT.xlsx). Đây chưa phải nghiệm thu toàn hệ thống.

Follow-up M6 ngày **11-11-2026**: integration M6 **18 passed**, toàn bộ integration **21 passed**; Docker Desktop đã được khởi động và Robot M6 chạy thật trên stack cô lập với **5 scenario passed, 0 failed**. Các kết quả này chưa xác nhận hoàn tất Phần 1: workbook ghi 5/16 testcase PASS, 10 BLOCKED do chỉ được kiểm chứng một phần, 1 NOT RUN. Xem [Test Cases](./TEST_CASES.md) và báo cáo Robot tại `%TEMP%\graphmind-m6-results\log.html`.

Follow-up M2 ngày 11-11: Robot SOP **3 passed, 0 failed** trên stack cô lập; lỗi publish HTTP 500 do audit schema đã được sửa qua audit service dùng chung. Property save đã được triển khai qua `PUT /api/graph/entity/{id}/properties`, bắt buộc JWT và role phù hợp, giới hạn field, ghi actor/time metadata và trả lỗi rõ cho quyền/entity/Neo4j; việc verify cũng không còn success-shaped fallback. Backend integration **29 passed**, trong đó 8 test Knowledge Editor chạy với Neo4j fake; frontend production build passed. Staging E2E xác nhận property write/read, giữ nguyên source/provenance, Standard JWT bị chặn (403), anonymous bị chặn (401), fixture được dọn. TC-KNOW-001 vẫn **PARTIAL**: relationship review/edit và Copilot propagation chưa được xác nhận; hàng chờ hiện dùng dữ liệu mẫu, chưa có relationship ID/candidate contract. Xem [Test Cases](./TEST_CASES.md) và sheet `Part 2 - M2` trong workbook.

## 9. Báo cáo mỗi đợt test

Ghi tối thiểu: tên/cycle, thời điểm, commit, OS/runtime, môi trường và dataset, người chạy, lệnh, số planned/executed/passed/failed/blocked/not-run, tỷ lệ pass, kết quả theo luồng/module, defect còn mở, evidence, cleanup và quyết định nghiệm thu.
