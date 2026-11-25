# Unresolved Issues & Technical Observations Report

During the analysis of `docs/05-srs/C1SE18-SRS-Document-Ver1.2.docx` and cross-checking against `docs/05-srs/update_srs.md`, no blocking issues prevented the generation or insertion of the 22 diagrams. However, in accordance with **Section 6 (Technical Accuracy Requirements)**, the following minor specification notes present in the source SRS document are recorded for engineering alignment:

## 1. Minor Internal Text Discrepancy on Relational Table Count (8 vs. 10 Tables)
- **Observation**:
  - Section 6.6.1 ("PostgreSQL Relational Schema") explicitly defines **10 relational tables**: `departments`, `users`, `rbac_permissions_matrix`, `user_active_sessions`, `password_reset_tokens`, `documents`, `document_approvals`, `shift_reports`, `shift_daily_summaries`, and `audit_logs`.
  - Earlier narrative text in Section 2.2 / Section 4.6 still mentions "8 core tables" in one sentence left over from SRS Ver 1.1 (before `user_active_sessions` and `password_reset_tokens` were added in Ver 1.2).
- **Resolution Applied in Diagrams**:
  - `Figure 6.6 (PostgreSQL Relational ERD)` models all **10 core tables** specified in Section 6.6.1 so that `FR58`, `FR59`, and `FR60` are completely represented without omission.
  - Per Section 4 & Phase 5 rules ("Do not translate or rewrite the surrounding report"), the narrative text in the Word document was preserved verbatim.

## 2. Qdrant Vector Embedding Dimension Parameter (`768-d`)
- **Observation**:
  - Section 4.6.3 and Section 6.6 specify `768-dimensional` dense vectors (`Cosine` distance) in Qdrant (`graphmind_chunks` collection).
  - If the deployment team switches the local embedding model (e.g., from a 768-d multilingual model to `bge-m3` 1024-d or `all-MiniLM-L6-v2` 384-d), the Qdrant collection creation parameter `size` will need to match the selected model.
- **Resolution Applied in Diagrams**:
  - All architecture, sequence, and state diagrams strictly use the `768-d Cosine` specification documented in the SRS.

## 3. Dual English + Vietnamese Figure Captions on Replaced v1.1 Figures
- **Observation**:
  - Three figures (`Figure 2.1`, `Figure 6.1`, `Figure 6.5`) had both an existing English caption (`Figure X.Y — ...`) and a v1.2 Vietnamese placeholder (`[DIAGRAM PLACEHOLDER: Hình X.Y — ...]`).
- **Resolution Applied in Document**:
  - The outdated v1.1 images were replaced in-place with the newly generated v1.2 diagrams, the English `Figure X.Y` captions were preserved, and the `[DIAGRAM PLACEHOLDER: ...]` wrappers were converted into clean centered italic `Hình X.Y — ...` captions so that both the English and Vietnamese captions are preserved without duplicating any diagram image.
