--
-- PostgreSQL database dump
--

\restrict LLESBsSmDaEeu80oCqBiAw2Un2Exxwyx0PtqyzUkzECuwkMGAJhV3GGndhug3H3

-- Dumped from database version 18.6
-- Dumped by pg_dump version 18.6

-- Started on 2026-10-10 10:13:22

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- TOC entry 6 (class 2615 OID 2200)
-- Name: public; Type: SCHEMA; Schema: -; Owner: postgres
--

-- *not* creating schema, since initdb creates it


ALTER SCHEMA public OWNER TO postgres;

--
-- TOC entry 5281 (class 0 OID 0)
-- Dependencies: 6
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: postgres
--

COMMENT ON SCHEMA public IS '';


--
-- TOC entry 2 (class 3079 OID 18101)
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;


--
-- TOC entry 5283 (class 0 OID 0)
-- Dependencies: 2
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


--
-- TOC entry 907 (class 1247 OID 18140)
-- Name: agent_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.agent_status AS ENUM (
    'online',
    'offline'
);


ALTER TYPE public.agent_status OWNER TO postgres;

--
-- TOC entry 910 (class 1247 OID 18146)
-- Name: baseline_name; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.baseline_name AS ENUM (
    'vector_rag',
    'pure_graphrag',
    'hybrid_graphrag'
);


ALTER TYPE public.baseline_name OWNER TO postgres;

--
-- TOC entry 913 (class 1247 OID 18154)
-- Name: doc_source; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.doc_source AS ENUM (
    'adventureworks',
    'cuad',
    'other'
);


ALTER TYPE public.doc_source OWNER TO postgres;

--
-- TOC entry 916 (class 1247 OID 18162)
-- Name: hop_level; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.hop_level AS ENUM (
    'single-hop',
    '2-hop',
    'cross-source'
);


ALTER TYPE public.hop_level OWNER TO postgres;

--
-- TOC entry 919 (class 1247 OID 18170)
-- Name: otp_purpose; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.otp_purpose AS ENUM (
    'register',
    'forgot_password',
    'login_2fa'
);


ALTER TYPE public.otp_purpose OWNER TO postgres;

--
-- TOC entry 922 (class 1247 OID 18178)
-- Name: sync_mode; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.sync_mode AS ENUM (
    'realtime',
    'periodic'
);


ALTER TYPE public.sync_mode OWNER TO postgres;

--
-- TOC entry 925 (class 1247 OID 18184)
-- Name: sync_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.sync_status AS ENUM (
    'success',
    'partial',
    'failed'
);


ALTER TYPE public.sync_status OWNER TO postgres;

--
-- TOC entry 928 (class 1247 OID 18192)
-- Name: system_role; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.system_role AS ENUM (
    'admin',
    'executive',
    'department_manager',
    'standard_user'
);


ALTER TYPE public.system_role OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- TOC entry 220 (class 1259 OID 18201)
-- Name: aegis_agents; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.aegis_agents (
    agent_id uuid DEFAULT gen_random_uuid() NOT NULL,
    workstation_name character varying(150) NOT NULL,
    registered_by uuid,
    status public.agent_status DEFAULT 'offline'::public.agent_status NOT NULL,
    watched_folders text[] DEFAULT '{}'::text[] NOT NULL,
    sync_mode public.sync_mode DEFAULT 'periodic'::public.sync_mode NOT NULL,
    last_seen_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.aegis_agents OWNER TO postgres;

--
-- TOC entry 221 (class 1259 OID 18217)
-- Name: alembic_version; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.alembic_version (
    version_num character varying(32) NOT NULL
);


ALTER TABLE public.alembic_version OWNER TO postgres;

--
-- TOC entry 222 (class 1259 OID 18221)
-- Name: alerts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.alerts (
    alert_id uuid DEFAULT gen_random_uuid() NOT NULL,
    alert_type character varying(30) NOT NULL,
    related_entity_id character varying(100) NOT NULL,
    department_id uuid,
    message text NOT NULL,
    severity character varying(10) DEFAULT 'medium'::character varying NOT NULL,
    is_resolved boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT alerts_alert_type_check CHECK (((alert_type)::text = ANY (ARRAY[('contract_expiring'::character varying)::text, ('customer_order_decline'::character varying)::text])))
);


ALTER TABLE public.alerts OWNER TO postgres;

--
-- TOC entry 223 (class 1259 OID 18238)
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.audit_logs (
    audit_id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    action character varying(100) NOT NULL,
    module_name character varying(50),
    target_type character varying(50),
    target_id character varying(100),
    details jsonb,
    ip_address inet,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.audit_logs OWNER TO postgres;

--
-- TOC entry 224 (class 1259 OID 18248)
-- Name: auth_sessions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.auth_sessions (
    session_id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    refresh_token_hash text NOT NULL,
    issued_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    revoked_at timestamp with time zone,
    ip_address inet,
    user_agent text
);


ALTER TABLE public.auth_sessions OWNER TO postgres;

--
-- TOC entry 225 (class 1259 OID 18260)
-- Name: baseline_runs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.baseline_runs (
    run_id uuid DEFAULT gen_random_uuid() NOT NULL,
    baseline public.baseline_name NOT NULL,
    question_id uuid NOT NULL,
    generated_answer text,
    is_correct boolean,
    citation_precision numeric(5,2),
    hallucinated boolean,
    response_time_ms integer,
    evaluated_by uuid,
    evaluated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.baseline_runs OWNER TO postgres;

--
-- TOC entry 226 (class 1259 OID 18271)
-- Name: benchmark_questions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.benchmark_questions (
    question_id uuid DEFAULT gen_random_uuid() NOT NULL,
    question_text text NOT NULL,
    complexity_level public.hop_level NOT NULL,
    reference_answer text,
    reference_sources jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.benchmark_questions OWNER TO postgres;

--
-- TOC entry 227 (class 1259 OID 18282)
-- Name: chat_messages; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.chat_messages (
    message_id uuid DEFAULT gen_random_uuid() NOT NULL,
    session_id uuid NOT NULL,
    role character varying(20) NOT NULL,
    content text NOT NULL,
    query_type public.hop_level,
    response_time_ms integer,
    citations jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT chat_messages_role_check CHECK (((role)::text = ANY (ARRAY[('user'::character varying)::text, ('assistant'::character varying)::text])))
);


ALTER TABLE public.chat_messages OWNER TO postgres;

--
-- TOC entry 228 (class 1259 OID 18295)
-- Name: chat_sessions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.chat_sessions (
    session_id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    title character varying(255),
    is_pinned boolean DEFAULT false NOT NULL,
    is_shared boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.chat_sessions OWNER TO postgres;

--
-- TOC entry 229 (class 1259 OID 18309)
-- Name: data_scopes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.data_scopes (
    scope_id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    entity_type character varying(50) NOT NULL,
    access_level character varying(20) DEFAULT 'read'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.data_scopes OWNER TO postgres;

--
-- TOC entry 230 (class 1259 OID 18320)
-- Name: departments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.departments (
    department_id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(100) NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.departments OWNER TO postgres;

--
-- TOC entry 231 (class 1259 OID 18330)
-- Name: documents; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.documents (
    document_id uuid DEFAULT gen_random_uuid() NOT NULL,
    source public.doc_source NOT NULL,
    file_name character varying(255) NOT NULL,
    file_path text NOT NULL,
    department_id uuid,
    contract_id character varying(50),
    ingested_via uuid,
    ingested_at timestamp with time zone DEFAULT now() NOT NULL,
    neo4j_node_id text,
    qdrant_point_ids text[]
);


ALTER TABLE public.documents OWNER TO postgres;

--
-- TOC entry 232 (class 1259 OID 18342)
-- Name: fine_tuning_runs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.fine_tuning_runs (
    run_id uuid DEFAULT gen_random_uuid() NOT NULL,
    base_model character varying(100) DEFAULT 'Qwen2.5-7B-Instruct'::character varying NOT NULL,
    lora_rank integer,
    learning_rate numeric(8,6),
    batch_size integer,
    epochs integer,
    gpu_hours_used numeric(6,2),
    checkpoint_uri text,
    status character varying(20) DEFAULT 'running'::character varying NOT NULL,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    finished_at timestamp with time zone
);


ALTER TABLE public.fine_tuning_runs OWNER TO postgres;

--
-- TOC entry 233 (class 1259 OID 18355)
-- Name: oauth_connections; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.oauth_connections (
    connection_id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    provider character varying(30) DEFAULT 'google'::character varying NOT NULL,
    scope text,
    access_token_encrypted text NOT NULL,
    refresh_token_encrypted text,
    expires_at timestamp with time zone,
    connected_at timestamp with time zone DEFAULT now() NOT NULL,
    revoked_at timestamp with time zone
);


ALTER TABLE public.oauth_connections OWNER TO postgres;

--
-- TOC entry 234 (class 1259 OID 18368)
-- Name: otp_codes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.otp_codes (
    otp_id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    purpose public.otp_purpose NOT NULL,
    code_hash text NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    used_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.otp_codes OWNER TO postgres;

--
-- TOC entry 235 (class 1259 OID 18381)
-- Name: rbac_permissions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.rbac_permissions (
    permission_id uuid DEFAULT gen_random_uuid() NOT NULL,
    role public.system_role NOT NULL,
    module_name character varying(50) NOT NULL,
    action character varying(50) NOT NULL,
    allowed boolean DEFAULT true NOT NULL
);


ALTER TABLE public.rbac_permissions OWNER TO postgres;

--
-- TOC entry 236 (class 1259 OID 18391)
-- Name: sync_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.sync_logs (
    sync_log_id uuid DEFAULT gen_random_uuid() NOT NULL,
    agent_id uuid NOT NULL,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    finished_at timestamp with time zone,
    files_ingested integer DEFAULT 0 NOT NULL,
    records_extracted integer DEFAULT 0 NOT NULL,
    status public.sync_status DEFAULT 'success'::public.sync_status NOT NULL,
    error_message text
);


ALTER TABLE public.sync_logs OWNER TO postgres;

--
-- TOC entry 237 (class 1259 OID 18407)
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    user_id uuid DEFAULT gen_random_uuid() CONSTRAINT users_id_not_null NOT NULL,
    email character varying(150) NOT NULL,
    username character varying(100) NOT NULL,
    password_hash text CONSTRAINT users_hashed_password_not_null NOT NULL,
    full_name character varying(150),
    is_active boolean NOT NULL,
    is_superuser boolean NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    role public.system_role NOT NULL,
    department_id uuid,
    last_login_at timestamp with time zone
);


ALTER TABLE public.users OWNER TO postgres;

--
-- TOC entry 5258 (class 0 OID 18201)
-- Dependencies: 220
-- Data for Name: aegis_agents; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.aegis_agents (agent_id, workstation_name, registered_by, status, watched_folders, sync_mode, last_seen_at, created_at) FROM stdin;
\.


--
-- TOC entry 5259 (class 0 OID 18217)
-- Dependencies: 221
-- Data for Name: alembic_version; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.alembic_version (version_num) FROM stdin;
a93ce8369026
\.


--
-- TOC entry 5260 (class 0 OID 18221)
-- Dependencies: 222
-- Data for Name: alerts; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.alerts (alert_id, alert_type, related_entity_id, department_id, message, severity, is_resolved, created_at) FROM stdin;
\.


--
-- TOC entry 5261 (class 0 OID 18238)
-- Dependencies: 223
-- Data for Name: audit_logs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.audit_logs (audit_id, user_id, action, module_name, target_type, target_id, details, ip_address, created_at) FROM stdin;
\.


--
-- TOC entry 5262 (class 0 OID 18248)
-- Dependencies: 224
-- Data for Name: auth_sessions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.auth_sessions (session_id, user_id, refresh_token_hash, issued_at, expires_at, revoked_at, ip_address, user_agent) FROM stdin;
\.


--
-- TOC entry 5263 (class 0 OID 18260)
-- Dependencies: 225
-- Data for Name: baseline_runs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.baseline_runs (run_id, baseline, question_id, generated_answer, is_correct, citation_precision, hallucinated, response_time_ms, evaluated_by, evaluated_at) FROM stdin;
\.


--
-- TOC entry 5264 (class 0 OID 18271)
-- Dependencies: 226
-- Data for Name: benchmark_questions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.benchmark_questions (question_id, question_text, complexity_level, reference_answer, reference_sources, created_at) FROM stdin;
\.


--
-- TOC entry 5265 (class 0 OID 18282)
-- Dependencies: 227
-- Data for Name: chat_messages; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.chat_messages (message_id, session_id, role, content, query_type, response_time_ms, citations, created_at) FROM stdin;
\.


--
-- TOC entry 5266 (class 0 OID 18295)
-- Dependencies: 228
-- Data for Name: chat_sessions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.chat_sessions (session_id, user_id, title, is_pinned, is_shared, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 5267 (class 0 OID 18309)
-- Dependencies: 229
-- Data for Name: data_scopes; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.data_scopes (scope_id, user_id, entity_type, access_level, created_at) FROM stdin;
\.


--
-- TOC entry 5268 (class 0 OID 18320)
-- Dependencies: 230
-- Data for Name: departments; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.departments (department_id, name, description, created_at) FROM stdin;
2e047fa3-7d2b-4225-94c9-b0958e27e36b	Ban Giám Đốc	Ban Lãnh Đạo C-Suite & Điều Hành	2026-09-27 13:32:54.984951+07
261d512b-1cb6-40ae-966f-50f752622fd8	Quản Lý Phòng Ban	Khối Quản lý Cấp trung & Trưởng bộ phận	2026-09-27 13:32:54.984951+07
1c51042f-0345-4467-90ca-ef5845822712	Công Nghệ Thông Tin	Phòng CNTT, Hạ tầng & Quản trị Tri thức (SecOps & LLMOps)	2026-09-27 13:32:54.984951+07
b251c7be-48d6-40df-87bc-d6a6f61c6960	Vận Hành & Nghiệp Vụ	Chuyên viên Tác nghiệp & Vận hành Doanh nghiệp	2026-09-27 13:32:54.984951+07
6d04d700-56e6-4d50-88b2-6594013fc8cd	Sales	Phòng Kinh Doanh & Phát Triển Thị Trường	2026-09-27 13:32:54.984951+07
aa7d6633-dc3f-44b3-a5ad-cb2e08f891cd	Accounting	Phòng Kế Toán & Tài Chính	2026-09-27 13:32:54.984951+07
d62a11b2-b7c2-4280-aa41-408eaa4cf8ba	HR	Phòng Nhân Sự	2026-09-27 13:32:54.984951+07
dd99cb37-49d1-4543-99c6-f4787dd19a08	Legal	Phòng Pháp Chế & Hợp Đồng	2026-09-27 13:32:54.984951+07
\.


--
-- TOC entry 5269 (class 0 OID 18330)
-- Dependencies: 231
-- Data for Name: documents; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.documents (document_id, source, file_name, file_path, department_id, contract_id, ingested_via, ingested_at, neo4j_node_id, qdrant_point_ids) FROM stdin;
\.


--
-- TOC entry 5270 (class 0 OID 18342)
-- Dependencies: 232
-- Data for Name: fine_tuning_runs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.fine_tuning_runs (run_id, base_model, lora_rank, learning_rate, batch_size, epochs, gpu_hours_used, checkpoint_uri, status, started_at, finished_at) FROM stdin;
\.


--
-- TOC entry 5271 (class 0 OID 18355)
-- Dependencies: 233
-- Data for Name: oauth_connections; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.oauth_connections (connection_id, user_id, provider, scope, access_token_encrypted, refresh_token_encrypted, expires_at, connected_at, revoked_at) FROM stdin;
\.


--
-- TOC entry 5272 (class 0 OID 18368)
-- Dependencies: 234
-- Data for Name: otp_codes; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.otp_codes (otp_id, user_id, purpose, code_hash, expires_at, used_at, created_at) FROM stdin;
\.


--
-- TOC entry 5273 (class 0 OID 18381)
-- Dependencies: 235
-- Data for Name: rbac_permissions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.rbac_permissions (permission_id, role, module_name, action, allowed) FROM stdin;
ee998fdd-3f02-40da-9d08-df48f76fd31a	admin	Module 6	full_access	t
f834905f-04c8-4cd4-85cf-5b76dffa3cb9	admin	Module 1	full_access	t
6f1ad987-39eb-4cfc-86f4-9588ba392991	admin	Module 2	full_access	t
a25711a9-fbc4-4894-9206-f5278b36e0de	executive	Module 3	view	t
ce79dcb1-66bc-4af0-8478-395a61525f12	executive	Module 4	view	t
dd0c9d86-e43e-4b30-a6c1-bdbd2250aa1f	executive	Module 5	view	t
4c4f367d-167f-4666-b807-2bbbe082259e	department_manager	Module 2	edit	t
aa8dd93f-e069-497c-ad35-16cd09f125cc	department_manager	Module 3	view	t
2c05e10a-aabb-4d26-b42d-e9d0036f9965	standard_user	Module 3	view	t
c1701a63-7ce8-4c53-9490-6db478f312b5	standard_user	Module 5	view	t
\.


--
-- TOC entry 5274 (class 0 OID 18391)
-- Dependencies: 236
-- Data for Name: sync_logs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.sync_logs (sync_log_id, agent_id, started_at, finished_at, files_ingested, records_extracted, status, error_message) FROM stdin;
\.


--
-- TOC entry 5275 (class 0 OID 18407)
-- Dependencies: 237
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (user_id, email, username, password_hash, full_name, is_active, is_superuser, created_at, updated_at, role, department_id, last_login_at) FROM stdin;
79879e14-2524-41b0-bdbb-d144210c89b5	executive@graphmind.ai	exec	$2b$12$e7aW8Qxjh3yR46TiMMqSg.wX5FX34JObmqCPKHB0h1SHslB8nxHmW	Executive (Lãnh đạo)	t	t	2026-09-27 12:31:05.803581+07	2026-09-27 12:31:05.803581+07	executive	2e047fa3-7d2b-4225-94c9-b0958e27e36b	\N
81f40efc-f51d-456c-86fe-591b64932f14	admin@graphmind.ai	admin	$2b$12$yf3y.tMJqZ8HOE83SfumIu3//zAo6rvQMrSh8v.H4R.BGgFVpDuqe	Administrator	t	t	2026-09-27 12:31:05.803581+07	2026-09-27 12:31:05.803581+07	admin	1c51042f-0345-4467-90ca-ef5845822712	\N
4918ea86-549a-46d7-8d53-0a40092b8568	manager@graphmind.ai	manager	$2b$12$c4/QAgQ.viiOg8jdfU4/Z.f8XYV/MbJEHLole8K4KuixWEzjnq7C.	Manager (Quản lý)	t	f	2026-09-27 12:31:05.803581+07	2026-09-27 12:31:05.803581+07	department_manager	261d512b-1cb6-40ae-966f-50f752622fd8	\N
1779f027-4909-4584-a66f-804713da2acb	ops@graphmind.ai	ops	$2b$12$AaJh3fBj1yQVjkSKvgkBT.GHl3nGc2qWA.870SqqJXIDuFvSZ2DxK	Operations (Nhân viên nghiệp vụ)	t	f	2026-09-27 12:31:05.803581+07	2026-09-27 12:31:05.803581+07	standard_user	b251c7be-48d6-40df-87bc-d6a6f61c6960	\N
\.


--
-- TOC entry 5038 (class 2606 OID 18425)
-- Name: aegis_agents aegis_agents_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.aegis_agents
    ADD CONSTRAINT aegis_agents_pkey PRIMARY KEY (agent_id);


--
-- TOC entry 5040 (class 2606 OID 18427)
-- Name: alembic_version alembic_version_pkc; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.alembic_version
    ADD CONSTRAINT alembic_version_pkc PRIMARY KEY (version_num);


--
-- TOC entry 5042 (class 2606 OID 18429)
-- Name: alerts alerts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.alerts
    ADD CONSTRAINT alerts_pkey PRIMARY KEY (alert_id);


--
-- TOC entry 5045 (class 2606 OID 18431)
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (audit_id);


--
-- TOC entry 5049 (class 2606 OID 18433)
-- Name: auth_sessions auth_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.auth_sessions
    ADD CONSTRAINT auth_sessions_pkey PRIMARY KEY (session_id);


--
-- TOC entry 5052 (class 2606 OID 18435)
-- Name: baseline_runs baseline_runs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.baseline_runs
    ADD CONSTRAINT baseline_runs_pkey PRIMARY KEY (run_id);


--
-- TOC entry 5055 (class 2606 OID 18437)
-- Name: benchmark_questions benchmark_questions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.benchmark_questions
    ADD CONSTRAINT benchmark_questions_pkey PRIMARY KEY (question_id);


--
-- TOC entry 5057 (class 2606 OID 18439)
-- Name: chat_messages chat_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.chat_messages
    ADD CONSTRAINT chat_messages_pkey PRIMARY KEY (message_id);


--
-- TOC entry 5060 (class 2606 OID 18441)
-- Name: chat_sessions chat_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.chat_sessions
    ADD CONSTRAINT chat_sessions_pkey PRIMARY KEY (session_id);


--
-- TOC entry 5063 (class 2606 OID 18443)
-- Name: data_scopes data_scopes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.data_scopes
    ADD CONSTRAINT data_scopes_pkey PRIMARY KEY (scope_id);


--
-- TOC entry 5065 (class 2606 OID 18445)
-- Name: data_scopes data_scopes_user_id_entity_type_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.data_scopes
    ADD CONSTRAINT data_scopes_user_id_entity_type_key UNIQUE (user_id, entity_type);


--
-- TOC entry 5067 (class 2606 OID 18447)
-- Name: departments departments_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.departments
    ADD CONSTRAINT departments_name_key UNIQUE (name);


--
-- TOC entry 5069 (class 2606 OID 18449)
-- Name: departments departments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.departments
    ADD CONSTRAINT departments_pkey PRIMARY KEY (department_id);


--
-- TOC entry 5071 (class 2606 OID 18451)
-- Name: documents documents_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_pkey PRIMARY KEY (document_id);


--
-- TOC entry 5075 (class 2606 OID 18453)
-- Name: fine_tuning_runs fine_tuning_runs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.fine_tuning_runs
    ADD CONSTRAINT fine_tuning_runs_pkey PRIMARY KEY (run_id);


--
-- TOC entry 5077 (class 2606 OID 18455)
-- Name: oauth_connections oauth_connections_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.oauth_connections
    ADD CONSTRAINT oauth_connections_pkey PRIMARY KEY (connection_id);


--
-- TOC entry 5080 (class 2606 OID 18457)
-- Name: otp_codes otp_codes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.otp_codes
    ADD CONSTRAINT otp_codes_pkey PRIMARY KEY (otp_id);


--
-- TOC entry 5082 (class 2606 OID 18459)
-- Name: rbac_permissions rbac_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rbac_permissions
    ADD CONSTRAINT rbac_permissions_pkey PRIMARY KEY (permission_id);


--
-- TOC entry 5084 (class 2606 OID 18461)
-- Name: rbac_permissions rbac_permissions_role_module_name_action_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rbac_permissions
    ADD CONSTRAINT rbac_permissions_role_module_name_action_key UNIQUE (role, module_name, action);


--
-- TOC entry 5087 (class 2606 OID 18463)
-- Name: sync_logs sync_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sync_logs
    ADD CONSTRAINT sync_logs_pkey PRIMARY KEY (sync_log_id);


--
-- TOC entry 5093 (class 2606 OID 18465)
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (user_id);


--
-- TOC entry 5095 (class 2606 OID 18467)
-- Name: users users_username_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key UNIQUE (username);


--
-- TOC entry 5043 (class 1259 OID 18468)
-- Name: idx_alerts_department_resolved; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_alerts_department_resolved ON public.alerts USING btree (department_id, is_resolved);


--
-- TOC entry 5046 (class 1259 OID 18469)
-- Name: idx_audit_logs_module; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_audit_logs_module ON public.audit_logs USING btree (module_name);


--
-- TOC entry 5047 (class 1259 OID 18470)
-- Name: idx_audit_logs_user_time; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_audit_logs_user_time ON public.audit_logs USING btree (user_id, created_at DESC);


--
-- TOC entry 5050 (class 1259 OID 18471)
-- Name: idx_auth_sessions_user; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_auth_sessions_user ON public.auth_sessions USING btree (user_id);


--
-- TOC entry 5053 (class 1259 OID 18472)
-- Name: idx_baseline_runs_question; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_baseline_runs_question ON public.baseline_runs USING btree (question_id, baseline);


--
-- TOC entry 5058 (class 1259 OID 18473)
-- Name: idx_chat_messages_session; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_chat_messages_session ON public.chat_messages USING btree (session_id, created_at);


--
-- TOC entry 5061 (class 1259 OID 18474)
-- Name: idx_chat_sessions_user; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_chat_sessions_user ON public.chat_sessions USING btree (user_id);


--
-- TOC entry 5072 (class 1259 OID 18475)
-- Name: idx_documents_department; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_documents_department ON public.documents USING btree (department_id);


--
-- TOC entry 5073 (class 1259 OID 18476)
-- Name: idx_documents_source; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_documents_source ON public.documents USING btree (source);


--
-- TOC entry 5078 (class 1259 OID 18477)
-- Name: idx_otp_user_purpose; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_otp_user_purpose ON public.otp_codes USING btree (user_id, purpose);


--
-- TOC entry 5085 (class 1259 OID 18478)
-- Name: idx_sync_logs_agent_time; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sync_logs_agent_time ON public.sync_logs USING btree (agent_id, started_at DESC);


--
-- TOC entry 5088 (class 1259 OID 18479)
-- Name: idx_users_department; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_department ON public.users USING btree (department_id);


--
-- TOC entry 5089 (class 1259 OID 18480)
-- Name: idx_users_role; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_role ON public.users USING btree (role);


--
-- TOC entry 5090 (class 1259 OID 18481)
-- Name: ix_users_email; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX ix_users_email ON public.users USING btree (email);


--
-- TOC entry 5091 (class 1259 OID 18482)
-- Name: ix_users_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_users_id ON public.users USING btree (user_id);


--
-- TOC entry 5096 (class 2606 OID 18483)
-- Name: aegis_agents aegis_agents_registered_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.aegis_agents
    ADD CONSTRAINT aegis_agents_registered_by_fkey FOREIGN KEY (registered_by) REFERENCES public.users(user_id) ON DELETE SET NULL;


--
-- TOC entry 5097 (class 2606 OID 18488)
-- Name: alerts alerts_department_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.alerts
    ADD CONSTRAINT alerts_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments(department_id) ON DELETE SET NULL;


--
-- TOC entry 5098 (class 2606 OID 18493)
-- Name: audit_logs audit_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE SET NULL;


--
-- TOC entry 5099 (class 2606 OID 18498)
-- Name: auth_sessions auth_sessions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.auth_sessions
    ADD CONSTRAINT auth_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE CASCADE;


--
-- TOC entry 5100 (class 2606 OID 18503)
-- Name: baseline_runs baseline_runs_evaluated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.baseline_runs
    ADD CONSTRAINT baseline_runs_evaluated_by_fkey FOREIGN KEY (evaluated_by) REFERENCES public.users(user_id) ON DELETE SET NULL;


--
-- TOC entry 5101 (class 2606 OID 18508)
-- Name: baseline_runs baseline_runs_question_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.baseline_runs
    ADD CONSTRAINT baseline_runs_question_id_fkey FOREIGN KEY (question_id) REFERENCES public.benchmark_questions(question_id) ON DELETE CASCADE;


--
-- TOC entry 5102 (class 2606 OID 18513)
-- Name: chat_messages chat_messages_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.chat_messages
    ADD CONSTRAINT chat_messages_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.chat_sessions(session_id) ON DELETE CASCADE;


--
-- TOC entry 5103 (class 2606 OID 18518)
-- Name: chat_sessions chat_sessions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.chat_sessions
    ADD CONSTRAINT chat_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE CASCADE;


--
-- TOC entry 5104 (class 2606 OID 18523)
-- Name: data_scopes data_scopes_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.data_scopes
    ADD CONSTRAINT data_scopes_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE CASCADE;


--
-- TOC entry 5105 (class 2606 OID 18528)
-- Name: documents documents_department_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments(department_id) ON DELETE SET NULL;


--
-- TOC entry 5106 (class 2606 OID 18533)
-- Name: documents documents_ingested_via_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_ingested_via_fkey FOREIGN KEY (ingested_via) REFERENCES public.aegis_agents(agent_id) ON DELETE SET NULL;


--
-- TOC entry 5107 (class 2606 OID 18538)
-- Name: oauth_connections oauth_connections_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.oauth_connections
    ADD CONSTRAINT oauth_connections_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE CASCADE;


--
-- TOC entry 5108 (class 2606 OID 18543)
-- Name: otp_codes otp_codes_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.otp_codes
    ADD CONSTRAINT otp_codes_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE CASCADE;


--
-- TOC entry 5109 (class 2606 OID 18548)
-- Name: sync_logs sync_logs_agent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sync_logs
    ADD CONSTRAINT sync_logs_agent_id_fkey FOREIGN KEY (agent_id) REFERENCES public.aegis_agents(agent_id) ON DELETE CASCADE;


--
-- TOC entry 5110 (class 2606 OID 18553)
-- Name: users users_department_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments(department_id) ON DELETE SET NULL;


--
-- TOC entry 5282 (class 0 OID 0)
-- Dependencies: 6
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: postgres
--

REVOKE USAGE ON SCHEMA public FROM PUBLIC;
GRANT ALL ON SCHEMA public TO PUBLIC;


-- Completed on 2026-10-10 10:13:22

--
-- PostgreSQL database dump complete
--

\unrestrict LLESBsSmDaEeu80oCqBiAw2Un2Exxwyx0PtqyzUkzECuwkMGAJhV3GGndhug3H3

