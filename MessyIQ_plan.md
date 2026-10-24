# DB-Sleuth: Self-Correcting Data Analyst Agent for Messy Databases
> **Event:** HYPNEXIS '26 Hackathon (Track 01: AI & Machine Learning | PS ID: AI-02)  
> **Team Name:**DIETCODE 
> **Constraint Checklist:** Strictly Open-Weight Models $\le$ 8B parameters (e.g., Qwen2.5-Coder-7B-Instruct / Llama-3.1-8B-Instruct). High-accuracy evaluation on execution results (BIRD Benchmark style).

---

## 1. Executive Overview & Copilot Prompt Directive
This repository contains an autonomous, self-correcting multi-agent data analyst system designed to operate over messy, real-world SQL databases with cryptic column names, unstated business logic, and dirty data values (`N/A`, mixed date formats, NULLs).

**Instructions for Copilot / AI Assistant:**
When implementing files in this project:
1. Follow the clean architecture defined below (Backend: FastAPI + LangGraph + `sqlglot` + SQLite/ChromaDB; Frontend: Streamlit or React).
2. Ensure ALL LLM calls use an open-weight model with $\le$ 8B parameters (e.g., via Ollama, vLLM, or Groq API pointing to `qwen2.5-coder-7b-instruct` or `llama-3.1-8b-instruct`).
3. Never issue direct raw SQL to the database without AST validation via `sqlglot`.
4. Ensure the system gracefully handles unknown/unanswerable questions by outputting a structured refusal rather than a hallucinated query.

---

## 2. Directory & File Structure

```
db-sleuth/
├── README.md
├── requirements.txt
├── .env.example
├── app/
│   ├── __init__.py
│   ├── main.py                   # FastAPI entry point
│   ├── config.py                 # LLM and DB configuration settings
│   ├── database/
│   │   ├── __init__.py
│   │   ├── connector.py          # SQLite connection manager & sandbox runner
│   │   └── profiler.py           # DB Profiler: Schema extraction & dirty value indexer
│   ├── agents/
│   │   ├── __init__.py
│   │   ├── state.py              # LangGraph Agent state definition
│   │   ├── planner.py            # Question decomposition & schema linking
│   │   ├── coder.py              # Dialect-specific SQL generator
│   │   ├── critic.py             # AST Validator & execution result verifier
│   │   └── pipeline.py           # LangGraph orchestration graph
│   └── utils/
│       ├── __init__.py
│       ├── ast_guard.py          # sqlglot parser & read-only AST checker
│       └── fuzzy_matcher.py      # ChromaDB / RapidFuzz value alignment
└── frontend/
    └── app.py                    # Streamlit interactive UI & execution visualizer
```

---

## 3. Step-by-Step Implementation Guide

### Step 1: Dependencies & Configuration (`requirements.txt` & `app/config.py`)

#### `requirements.txt`
```text
fastapi>=0.110.0
uvicorn>=0.28.0
langgraph>=0.0.26
langchain-core>=0.1.30
langchain-community>=0.0.28
sqlglot>=23.0.0
chromadb>=0.4.24
rapidfuzz>=3.6.0
sqlalchemy>=2.0.0
streamlit>=1.32.0
plotly>=5.19.0
python-dotenv>=1.0.1
pydantic>=2.6.0
```

#### `app/config.py`
*Set up model parameters ensuring $\le$ 8B constraint.*
```python
import os
from pydantic import BaseModel

class Settings(BaseModel):
    MODEL_NAME: str = os.getenv("MODEL_NAME", "qwen2.5-coder-7b-instruct")
    OLLAMA_BASE_URL: str = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
    GROQ_API_KEY: str = os.getenv("GROQ_API_KEY", "")
    MAX_MODEL_PARAMS: str = "8B"
    MAX_REFLECTION_STEPS: int = 3
    DEFAULT_DB_PATH: str = os.getenv("DEFAULT_DB_PATH", "data/sample_bird.sqlite")

settings = Settings()
```

---

### Step 2: Database Profiler & AST Guard (`app/database/profiler.py` & `app/utils/ast_guard.py`)

#### `app/utils/ast_guard.py`
*Enforces read-only AST checks to prevent harmful or invalid queries.*
```python
import sqlglot
from sqlglot import exp

class ASTValidator:
    @staticmethod
    def is_read_only_select(sql_query: str) -> tuple[bool, str]:
        try:
            parsed = sqlglot.parse_one(sql_query, read="sqlite")
            if not isinstance(parsed, exp.Select):
                return False, "Query must be a SELECT statement."
            
            # Check for illegal expressions
            forbidden_types = (exp.Insert, exp.Update, exp.Delete, exp.Drop, exp.Create, exp.Alter)
            if any(parsed.find_all(forbidden_types)):
                return False, "Dangerous operations (INSERT, UPDATE, DELETE, DROP) are strictly forbidden."
            
            return True, "Valid SELECT query"
        except Exception as e:
            return False, f"SQL Syntax/Parsing Error: {str(e)}"
```

#### `app/database/profiler.py`
*Profiles tables, column names, sample values, and indexes distinct text values for fuzzy matching.*
```python
import sqlite3
from app.utils.fuzzy_matcher import FuzzyValueIndexer

class DatabaseProfiler:
    def __init__(self, db_path: str):
        self.db_path = db_path
        self.indexer = FuzzyValueIndexer()

    def get_schema_summary(self) -> str:
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
        tables = [row[0] for row in cursor.fetchall()]
        
        schema_text = []
        for table in tables:
            cursor.execute(f"PRAGMA table_info('{table}');")
            columns = cursor.fetchall()
            col_desc = [f"{col[1]} ({col[2]})" for col in columns]
            
            # Extract sample distinct non-null values for fuzzy context
            sample_data = []
            for col in columns:
                col_name = col[1]
                cursor.execute(f"SELECT DISTINCT \"{col_name}\" FROM \"{table}\" WHERE \"{col_name}\" IS NOT NULL LIMIT 3;")
                samples = [str(r[0]) for r in cursor.fetchall()]
                sample_data.append(f"{col_name}: e.g., {samples}")
                
            schema_text.append(
                f"Table: {table}\n  Columns: {', '.join(col_desc)}\n  Sample Values:\n    " + "\n    ".join(sample_data)
            )
        
        conn.close()
        return "\n\n".join(schema_text)
```

---

### Step 3: Multi-Agent Reflection Engine (`app/agents/`)

#### `app/agents/state.py`
```python
from typing import TypedDict, List, Dict, Any, Optional

class AgentState(TypedDict):
    user_query: str
    schema_context: str
    plan: Optional[str]
    sql_query: Optional[str]
    execution_result: Optional[List[Dict[str, Any]]]
    error_log: Optional[str]
    reflection_count: int
    is_answerable: bool
    final_answer: str
```

#### `app/agents/planner.py`
*Decomposes question and determines if data is sufficient.*
```python
from langchain_core.prompts import ChatPromptTemplate

PLANNER_PROMPT = ChatPromptTemplate.from_template("""
You are an expert Data Analyst Planner operating strictly with a 7B parameter open-weight model.
Analyze the user's question against the database schema.

Database Schema & Sample Data:
{schema_context}

User Question: {user_query}

Task:
1. Identify required tables and columns.
2. Note any potential dirty data issues (e.g., format mismatches, missing columns, N/A values).
3. If the question CANNOT be answered from the schema, explicitly state "UNANSWERABLE: <reason>".
4. Otherwise, outline step-by-step logic to construct the SQL query.

Plan:
""")
```

#### `app/agents/coder.py`
```python
from langchain_core.prompts import ChatPromptTemplate

CODER_PROMPT = ChatPromptTemplate.from_template("""
You are a SQL Expert writing SQLite queries.

Schema:
{schema_context}

Plan:
{plan}

Previous Errors (if any):
{error_log}

Generate strictly valid SQLite SELECT query wrapped in ```sql ... ``` block. Do not include markdown commentary outside the block.
""")
```

#### `app/agents/critic.py`
*Validates results, row counts, and verifies business rules.*
```python
from app.utils.ast_guard import ASTValidator

class CriticAgent:
    @staticmethod
    def validate_and_execute(sql: str, db_path: str, conn) -> tuple[bool, Any, str]:
        # 1. AST Check
        is_valid, ast_msg = ASTValidator.is_read_only_select(sql)
        if not is_valid:
            return False, None, f"AST Guard Failure: {ast_msg}"
        
        # 2. Execution Check
        try:
            cursor = conn.cursor()
            cursor.execute(sql)
            rows = cursor.fetchall()
            columns = [desc[0] for desc in cursor.description] if cursor.description else []
            result = [dict(zip(columns, row)) for row in rows]
            
            # 3. Value & Row Check
            if len(result) == 0:
                return False, result, "Execution returned 0 rows. Check filter conditions and fuzzy value spelling."
                
            return True, result, "Success"
        except Exception as e:
            return False, None, f"SQLite Execution Exception: {str(e)}"
```

#### `app/agents/pipeline.py` (LangGraph Flow)
```python
from langgraph.graph import StateGraph, END
from app.agents.state import AgentState

def build_agent_pipeline():
    workflow = StateGraph(AgentState)
    
    # Define Nodes
    workflow.add_node("plan_step", plan_node)
    workflow.add_node("code_step", code_node)
    workflow.add_node("execute_verify_step", execute_node)
    workflow.add_node("refuse_step", refuse_node)
    workflow.add_node("summarize_step", summarize_node)
    
    # Set Entry Point
    workflow.set_entry_point("plan_step")
    
    # Conditional Edges
    workflow.add_conditional_edges(
        "plan_step",
        should_proceed_from_plan,
        {"code": "code_step", "refuse": "refuse_step"}
    )
    
    workflow.add_conditional_edges(
        "execute_verify_step",
        should_reflect_or_finish,
        {"retry": "code_step", "finish": "summarize_step", "refuse": "refuse_step"}
    )
    
    workflow.add_edge("code_step", "execute_verify_step")
    workflow.add_edge("refuse_step", END)
    workflow.add_edge("summarize_step", END)
    
    return workflow.compile()
```

---

### Step 4: Streamlit Frontend & Visualizer (`frontend/app.py`)

*Implements split-screen dashboard showing Chat + Execution Steps.*

```python
import streamlit as st
import pandas as pd
import plotly.express as px

st.set_page_config(page_title="DB-Sleuth | AI Data Analyst", layout="wide")

st.title("🔍 DB-Sleuth: Data-Analyst Agent on Messy Databases")
st.caption("Team ByteCode | HYPNEXIS '26 | Powered by Open-Weight <=8B Models")

# Split Screen Layout
col1, col2 = st.columns([1, 1])

with col1:
    st.subheader("💬 Chat Interface")
    user_query = st.text_input("Ask a question about your database:", "Which schools had falling enrolment last year?")
    run_btn = st.button("Analyze Database", type="primary")

with col2:
    st.subheader("⚙️ Agent Reasoning Trace & Results")
    
if run_btn:
    with col2:
        with st.status("Agent Executing...", expanded=True) as status:
            st.write("📂 **Step 1: Profiling Database & Mapping Schema...**")
            # Call backend API / LangGraph workflow
            st.write("🧩 **Step 2: Generating AST-Validated SQL Query...**")
            st.code("SELECT school_name, enrolment_2022 - enrolment_2023 AS drop FROM schools WHERE drop > 0 ORDER BY drop DESC;", language="sql")
            st.write("🛡️ **Step 3: AST Verification & Read-Only Execution Sandbox...**")
            st.write("✅ **Step 4: Answer Verified against Row Count & Value Bounds.**")
            status.update(label="Analysis Complete!", state="complete")
        
        st.success("Execution Successful!")
        # Interactive Plotly Chart
        df = pd.DataFrame({
            "School": ["Springfield High", "Linwood Elementary", "Oak Ridge"],
            "Enrolment Drop": [45, 32, 18]
        })
        fig = px.bar(df, x="School", y="Enrolment Drop", title="Schools with Falling Enrolment")
        st.plotly_chart(fig, use_container_width=True)
```

---

## 4. Verification & Demo Execution Protocol

1. **Local Model Launch:**
   ```bash
   ollama run qwen2.5-coder:7b
   ```
2. **Start Backend API:**
   ```bash
   uvicorn app.main:app --reload --port 8000
   ```
3. **Launch Streamlit Dashboard:**
   ```bash
   streamlit run frontend/app.py
   ```
4. **Validation Checkpoints:**
   * **Valid Question Test:** "Which schools had falling enrolment last year?" $\rightarrow$ Returns table/chart + English summary.
   * **Dirty Value Test:** Search for `"California"` when DB contains `"CA"` $\rightarrow$ Fuzzy matcher resolves and queries correctly.
   * **Refusal Test:** "What is the average salary of teachers?" (when salary column is missing) $\rightarrow$ Output: *"Cannot answer: Salary data is not present in the database."*
   * **Security Test:** Inject `DROP TABLE schools;` $\rightarrow$ Blocked immediately by `sqlglot` AST Validator.