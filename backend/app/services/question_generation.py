"""Question Generation Service (Claude, generation tier) with role-signature caching.

Generates targeted MCQ and coding questions tailored to a specific job profile.
Produces 25 MCQs + 3 Coding problems for a complete assessment pipeline.
"""

from typing import Optional
from loguru import logger
from pydantic import BaseModel, Field

from app.core.config import settings
from app.models.assessment import Assessment, AssessmentType, Difficulty
from app.models.job_target import JobTarget
from app.services.ai.nvidia import AIProviderError, ai_provider


class MCQQuestionSchema(BaseModel):
    question: str = Field(..., description="The multiple choice question prompt")
    type: str = "mcq"
    difficulty: str = Field(default="medium", description="easy, medium, or hard")
    topic: str = Field(..., description="Skill/topic tested")
    options: list[str] = Field(..., min_length=4, max_length=4, description="Four choices A, B, C, D")
    correctAnswer: str = Field(..., description="Exact string of correct option")
    explanation: str = Field(..., description="Explanation of why this answer is correct")


class CodingTestCaseSchema(BaseModel):
    description: str = Field(default="Test Case")
    input: str = Field(..., description="Exact sample input argument(s) passed to function")
    expectedOutput: str = Field(..., description="Exact expected return output value")
    isHidden: bool = Field(default=False, description="Whether test case is hidden from candidate")


class CodingQuestionSchema(BaseModel):
    title: str = Field(default="Coding Challenge", description="Short concise title of the problem")
    question: str = Field(..., description="Comprehensive problem description including task, Input Format, and Output Format")
    type: str = "coding"
    difficulty: str = Field(default="medium")
    topic: str = Field(..., description="Core algorithm/data structure")
    constraints: list[str] = Field(default_factory=list)
    examples: list[str] = Field(default_factory=list, description="Examples formatted with Input, Output, and Explanation")
    expectedApproach: str = Field(..., description="Optimal solution approach")
    starterCode: str = Field(default="", description="Starter code template for the editor")
    testCases: list[CodingTestCaseSchema] = Field(default_factory=list, description="Structured test cases with input and expected output")
    language: str = Field(default="python", description="Primary language for the question")


class MCQBatchSchema(BaseModel):
    """A batch of MCQ questions."""
    mcq_questions: list[MCQQuestionSchema] = Field(default_factory=list)


class CodingBatchSchema(BaseModel):
    """A batch of coding questions."""
    coding_questions: list[CodingQuestionSchema] = Field(default_factory=list)


SYSTEM_PROMPT_MCQ = """You are a Principal Technical Interviewer designing realistic MCQ assessment questions.
Generate role-specific multiple-choice questions based on the candidate's target job description.

Rules:
1. Every question must directly test skills, technologies, or responsibilities specified in the job profile.
2. Do not generate generic, off-topic questions.
3. MCQs must have exactly 4 distinct, plausible options (A, B, C, D) with ONE clear correct answer.
4. CRITICAL: Every option (A, B, C, D) must have UNIQUE, specific technical text for that question. NEVER reuse option choices or generate repetitive generic placeholders!
5. Mix difficulty levels: approximately 30% easy, 50% medium, 20% hard.
6. Cover a broad range of the required skills — avoid clustering all questions on one topic.
7. Questions should resemble real technical interview rounds and company-specific question patterns."""

SYSTEM_PROMPT_CODING = """You are a Principal Technical Interviewer designing realistic coding assessment problems.
Generate role-specific coding challenges based on the candidate's target job description.

Rules:
1. Every problem must be a complete LeetCode/HackerRank style problem statement with:
   - Clear problem explanation
   - Explicit 'Input Format' section
   - Explicit 'Output Format' section
   - Detailed Constraints (time/space complexity)
2. Include at least 2 structured examples in the format:
   'Input: ... \\nOutput: ... \\nExplanation: ...'
3. Provide executable Python starter code with exact function signatures that process input parameters and return the computed result.
4. Each problem MUST include at least 3 structured test cases, each specifying:
   - 'description': clear test case name (e.g. 'Basic Test', 'Edge Case')
   - 'input': exact argument string or JSON representation
   - 'expectedOutput': exact expected return value string or JSON representation
   - 'isHidden': boolean (True for test case 3)
5. Generate exactly 3 problems: one Easy, one Medium, one Hard."""


def _build_job_profile_block(job_target: JobTarget) -> str:
    """Build the common job profile text block used in all prompts."""
    return f"""<JOB_PROFILE>
Role Title: {job_target.role_title or "Software Engineer"}
Seniority: {job_target.seniority.value if hasattr(job_target.seniority, "value") else job_target.seniority}
Required Skills: {", ".join(job_target.required_skills or ["General Software Engineering"])}
Tech Stack: {", ".join(job_target.tech_stack or ["Standard Development Stack"])}
Responsibilities: {", ".join(job_target.responsibilities[:5])}
Interview Focus: {", ".join(job_target.interview_focus_areas or [])}
</JOB_PROFILE>"""


async def _generate_mcq_batch(job_profile: str, batch_num: int, count: int) -> list[dict]:
    """Generate a batch of MCQ questions."""
    user_prompt = f"""Generate exactly {count} unique MCQ questions for this target role (batch {batch_num}):

{job_profile}

Provide exactly {count} multiple-choice questions. Each must have 4 options with one correct answer.
Vary the topics across the required skills and tech stack. Mix easy/medium/hard difficulties."""

    try:
        generated = await ai_provider.generate_structured(
            system=SYSTEM_PROMPT_MCQ,
            user=user_prompt,
            schema=MCQBatchSchema,
            model=settings.AI_MODEL_GENERATION,
            temperature=0.65,
            top_p=0.95,
        )

        questions = []
        for idx, mcq in enumerate(generated.mcq_questions, start=1):
            q_id = f"q_mcq_{(batch_num - 1) * count + idx}"
            questions.append({
                "id": q_id,
                "type": "mcq",
                "text": mcq.question,
                "options": mcq.options,
                "correct_answer": mcq.correctAnswer,
                "explanation": mcq.explanation,
                "difficulty": mcq.difficulty,
                "skill_tested": mcq.topic,
                "time_limit_seconds": 90,
            })
        return questions

    except (AIProviderError, Exception) as exc:
        logger.warning("MCQ batch {} generation failed: {}", batch_num, str(exc))
        return []


async def _generate_coding_batch(job_profile: str) -> list[dict]:
    """Generate 3 coding problems."""
    user_prompt = f"""Generate exactly 3 coding problems for this target role:

{job_profile}

Requirements:
- Problem 1: Easy difficulty — fundamental data structure or algorithm
- Problem 2: Medium difficulty — real-world application problem
- Problem 3: Hard difficulty — system design or optimization challenge

For each problem, include:
- Clear problem description
- Input/output examples
- Constraints
- A starter code template with function signature (in Python)
- At least 3 test case descriptions
- The optimal solution approach"""

    try:
        generated = await ai_provider.generate_structured(
            system=SYSTEM_PROMPT_CODING,
            user=user_prompt,
            schema=CodingBatchSchema,
            model=settings.AI_MODEL_GENERATION,
            temperature=0.5,
            top_p=0.95,
        )

        questions = []
        for idx, code in enumerate(generated.coding_questions, start=1):
            questions.append({
                "id": f"q_code_{idx}",
                "type": "coding",
                "text": code.question,
                "constraints": code.constraints,
                "examples": code.examples,
                "expected_approach": code.expectedApproach,
                "starter_code": code.starterCode or f"def solution():\n    # Write your solution here\n    pass\n",
                "test_cases": code.testCases,
                "language": code.language or "python",
                "difficulty": code.difficulty,
                "skill_tested": code.topic,
                "time_limit_seconds": 900,
            })
        return questions

    except (AIProviderError, Exception) as exc:
        logger.warning("Coding batch generation failed: {}", str(exc))
        return []


async def generate_assessment_for_job(
    job_target_id: str,
    assessment_type: AssessmentType = AssessmentType.MIXED,
    difficulty: Difficulty = Difficulty.MEDIUM,
) -> Optional[Assessment]:
    """Generate or retrieve a cached question assessment set for a job target.
    
    Produces 25 MCQs + 3 Coding questions using batched LLM calls.
    """
    job_target = await JobTarget.get(job_target_id)
    if not job_target:
        logger.warning("Job target not found: {}", job_target_id)
        return None

    role_sig = job_target.role_signature

    # ── 1. Cache Lookup ──────────────────────────────────────────────────
    if role_sig:
        cached_assessment = await Assessment.find_one(
            Assessment.role_signature == role_sig,
            Assessment.type == assessment_type,
            Assessment.difficulty == difficulty,
        )
        if cached_assessment and cached_assessment.question_set:
            # Validate that cached MCQs do not contain stale repetitive placeholder options
            is_valid_cache = True
            for q in cached_assessment.question_set:
                if q.get("type") == "mcq":
                    opts = q.get("options") or []
                    if len(opts) < 4 or len(set(opts)) != len(opts) or any("applying best practices in" in str(opt) for opt in opts):
                        is_valid_cache = False
                        break
            
            if is_valid_cache:
                logger.info("Cache HIT for role signature: {}", role_sig)
                user_assessment = Assessment(
                    job_target_id=str(job_target.id),
                    type=cached_assessment.type,
                    difficulty=cached_assessment.difficulty,
                    question_set=cached_assessment.question_set,
                    total_questions=cached_assessment.total_questions,
                    estimated_duration_minutes=cached_assessment.estimated_duration_minutes,
                    skills_covered=cached_assessment.skills_covered,
                    role_signature=role_sig,
                )
                await user_assessment.insert()
                return user_assessment
            else:
                logger.info("Cache INVALIDATED due to generic options for role signature: {}", role_sig)

    logger.info("Cache MISS for role signature: {}. Generating fresh question set...", role_sig)

    # ── 2. Build job profile block ───────────────────────────────────────
    job_profile = _build_job_profile_block(job_target)

    all_mcqs = []
    coding_questions = []

    # ── 3. Generate questions based on assessment_type ───────────────────
    import asyncio
    if assessment_type == AssessmentType.MCQ:
        # Generate 25 MCQs (Pure MCQ, no coding questions)
        mcq_tasks = [
            _generate_mcq_batch(job_profile, batch_num=1, count=9),
            _generate_mcq_batch(job_profile, batch_num=2, count=9),
            _generate_mcq_batch(job_profile, batch_num=3, count=7),
        ]
        mcq_results = await asyncio.gather(*mcq_tasks, return_exceptions=True)
        for result in mcq_results:
            if isinstance(result, list):
                all_mcqs.extend(result)

        if len(all_mcqs) < 25:
            fallback = _generate_fallback_mcqs(job_target, start_idx=len(all_mcqs) + 1, needed=25 - len(all_mcqs))
            all_mcqs.extend(fallback)

        all_mcqs = all_mcqs[:25]
        for idx, q in enumerate(all_mcqs, start=1):
            q["id"] = f"q_mcq_{idx}"

        formatted_questions = all_mcqs
        estimated_minutes = len(all_mcqs) * 2  # 50 mins

    elif assessment_type == AssessmentType.CODING:
        # Generate 3 Real Coding Problems with structured test cases
        coding_questions = await _generate_coding_batch(job_profile)
        if len(coding_questions) < 3:
            fallback_code = _generate_fallback_coding(job_target, start_idx=len(coding_questions) + 1, needed=3 - len(coding_questions))
            coding_questions.extend(fallback_code)

        coding_questions = coding_questions[:3]
        for idx, q in enumerate(coding_questions, start=1):
            q["id"] = f"q_code_{idx}"

        formatted_questions = coding_questions
        estimated_minutes = len(coding_questions) * 20  # 60 mins

    else:
        # MIXED mode: 15 MCQs + 2 Coding
        mcq_tasks = [
            _generate_mcq_batch(job_profile, batch_num=1, count=8),
            _generate_mcq_batch(job_profile, batch_num=2, count=7),
        ]
        mcq_results = await asyncio.gather(*mcq_tasks, return_exceptions=True)
        for result in mcq_results:
            if isinstance(result, list):
                all_mcqs.extend(result)

        if len(all_mcqs) < 15:
            all_mcqs.extend(_generate_fallback_mcqs(job_target, start_idx=len(all_mcqs) + 1, needed=15 - len(all_mcqs)))
        all_mcqs = all_mcqs[:15]

        coding_questions = await _generate_coding_batch(job_profile)
        if len(coding_questions) < 2:
            coding_questions.extend(_generate_fallback_coding(job_target, start_idx=len(coding_questions) + 1, needed=2 - len(coding_questions)))
        coding_questions = coding_questions[:2]

        for idx, q in enumerate(all_mcqs, start=1):
            q["id"] = f"q_mcq_{idx}"
        for idx, q in enumerate(coding_questions, start=1):
            q["id"] = f"q_code_{idx}"

        formatted_questions = all_mcqs + coding_questions
        estimated_minutes = (len(all_mcqs) * 2) + (len(coding_questions) * 20)

    skills_covered = list({q.get("skill_tested", "") for q in formatted_questions if q.get("skill_tested")})

    assessment = Assessment(
        job_target_id=str(job_target.id),
        type=assessment_type,
        difficulty=difficulty,
        question_set=formatted_questions,
        total_questions=len(formatted_questions),
        estimated_duration_minutes=estimated_minutes,
        skills_covered=skills_covered,
        role_signature=role_sig,
    )
    await assessment.insert()
    logger.info("Successfully generated {} questions for type={} JobTarget ID: {}", len(formatted_questions), assessment_type, job_target_id)
    return assessment


def _generate_fallback_mcqs(job_target: JobTarget, start_idx: int = 1, needed: int = 25) -> list[dict]:
    """Generate structured fallback MCQ questions with 4 distinct options per question."""
    role = job_target.role_title or "Software Engineer"

    fallback_bank = [
        {
            "text": "In Python, what is the primary impact of the Global Interpreter Lock (GIL) on multi-threaded applications?",
            "options": [
                "It prevents multiple threads from executing Python bytecode simultaneously in a single process.",
                "It causes automatic garbage collection to run synchronously across all OS processes.",
                "It restricts network socket I/O operations to a single worker thread.",
                "It automatically converts multi-threaded code into multi-process parallel execution."
            ],
            "correct_answer": "It prevents multiple threads from executing Python bytecode simultaneously in a single process.",
            "explanation": "The GIL ensures only one thread executes Python bytecode at a time, limiting multi-threaded CPU-bound performance in CPython.",
            "difficulty": "medium",
            "skill_tested": "Python Concurrency",
        },
        {
            "text": "In Node.js / JavaScript runtime, which queue receives Promise callbacks (e.g., .then() or async/await resumes)?",
            "options": [
                "Microtask Queue (Job Queue)",
                "Macrotask Queue (Task Queue)",
                "Render Queue",
                "Network I/O Callback Queue"
            ],
            "correct_answer": "Microtask Queue (Job Queue)",
            "explanation": "Promises and queueMicrotask land in the Microtask queue, which is drained completely before the next Event Loop phase.",
            "difficulty": "medium",
            "skill_tested": "JavaScript Event Loop",
        },
        {
            "text": "Which HTTP response status code should be returned when a POST API request successfully creates a new resource?",
            "options": [
                "201 Created",
                "200 OK",
                "202 Accepted",
                "204 No Content"
            ],
            "correct_answer": "201 Created",
            "explanation": "HTTP 201 Created signifies that the request succeeded and resulted in the creation of a new resource, often returning a Location header.",
            "difficulty": "easy",
            "skill_tested": "REST APIs",
        },
        {
            "text": "In React 18+, what is the main benefit of Automatic Batching?",
            "options": [
                "It groups multiple state updates in event handlers and async callbacks into a single re-render.",
                "It automatically converts class components into functional components.",
                "It pre-renders components on the server without needing Next.js.",
                "It eliminates the need for the useEffect hook in functional components."
            ],
            "correct_answer": "It groups multiple state updates in event handlers and async callbacks into a single re-render.",
            "explanation": "Automatic batching optimizes re-renders by batching state changes across timeouts, promises, and native event handlers.",
            "difficulty": "medium",
            "skill_tested": "React",
        },
        {
            "text": "How does a B-Tree index improve query performance in a relational database like PostgreSQL or MySQL?",
            "options": [
                "It reduces search time complexity from O(N) to O(log N) by maintaining a balanced search tree.",
                "It compresses table storage size using LZ4 algorithms.",
                "It caches query result sets directly in application memory.",
                "It encrypts columns to prevent unauthorized SELECT operations."
            ],
            "correct_answer": "It reduces search time complexity from O(N) to O(log N) by maintaining a balanced search tree.",
            "explanation": "B-Tree indexes maintain sorted order to enable log N search, insertion, and sequential access.",
            "difficulty": "medium",
            "skill_tested": "Databases & Indexing",
        },
        {
            "text": "According to the CAP Theorem, what two properties does a distributed database guarantee during a network partition (P)?",
            "options": [
                "Consistency (C) or Availability (A)",
                "Consistency (C) and Performance (P)",
                "Durability (D) and Isolation (I)",
                "Latency (L) and Scalability (S)"
            ],
            "correct_answer": "Consistency (C) or Availability (A)",
            "explanation": "During a network partition, a distributed system must choose between guaranteeing consistency or guaranteeing availability.",
            "difficulty": "hard",
            "skill_tested": "System Design",
        },
        {
            "text": "What is the key difference between `git fetch` and `git pull`?",
            "options": [
                "git fetch downloads remote changes without modifying your local working branch; git pull fetches and automatically merges.",
                "git fetch deletes remote branches; git pull fetches tags.",
                "git fetch modifies local working directory; git pull only updates local repository metadata.",
                "git fetch creates a new commit; git pull squashes existing commits."
            ],
            "correct_answer": "git fetch downloads remote changes without modifying your local working branch; git pull fetches and automatically merges.",
            "explanation": "git pull is essentially git fetch followed immediately by git merge.",
            "difficulty": "easy",
            "skill_tested": "Git & Version Control",
        },
        {
            "text": "In Docker, what is the primary purpose of multi-stage builds in a Dockerfile?",
            "options": [
                "To separate build tools and intermediate dependencies from the final minimal runtime container image.",
                "To run multiple container daemons inside a single virtual machine.",
                "To automatically scale container replicas based on CPU utilization.",
                "To execute database migrations prior to container deployment."
            ],
            "correct_answer": "To separate build tools and intermediate dependencies from the final minimal runtime container image.",
            "explanation": "Multi-stage builds allow you to build binaries in build containers and copy only final artifacts into lean production images.",
            "difficulty": "medium",
            "skill_tested": "Docker & DevOps",
        },
        {
            "text": "What is the worst-case time complexity of looking up a key in a standard Hash Map without self-balancing trees?",
            "options": [
                "O(N)",
                "O(1)",
                "O(log N)",
                "O(N^2)"
            ],
            "correct_answer": "O(N)",
            "explanation": "In worst-case scenarios where all keys hash to the same bucket (collision), lookup degrades to O(N) linear search.",
            "difficulty": "medium",
            "skill_tested": "Data Structures",
        },
        {
            "text": "What causes a web browser to issue an HTTP OPTIONS preflight request before sending a cross-origin API call?",
            "options": [
                "Cross-Origin requests featuring custom HTTP headers or non-simple methods (e.g. PUT, DELETE, or application/json).",
                "Requests originating from localhost to an external domain.",
                "GET requests that exceed 2KB in URL query parameter length.",
                "Any request made by an unauthenticated user."
            ],
            "correct_answer": "Cross-Origin requests featuring custom HTTP headers or non-simple methods (e.g. PUT, DELETE, or application/json).",
            "explanation": "Browsers send CORS preflight OPTIONS requests to check if the target server permits the method and headers.",
            "difficulty": "medium",
            "skill_tested": "Web Security & CORS",
        },
        {
            "text": "How does a Least Recently Used (LRU) Cache determine which entry to evict when capacity is reached?",
            "options": [
                "It evicts the item that has not been accessed for the longest duration.",
                "It evicts the item with the smallest payload memory size.",
                "It evicts the item that was added first regardless of access frequency.",
                "It evicts entries randomly based on a pseudo-random hash seed."
            ],
            "correct_answer": "It evicts the item that has not been accessed for the longest duration.",
            "explanation": "LRU evicts the least recently accessed item to maximize cache hits for recently accessed elements.",
            "difficulty": "medium",
            "skill_tested": "Caching Algorithms",
        },
        {
            "text": "What is the primary architectural advantage of using an asynchronous message queue (e.g., Kafka, RabbitMQ) between microservices?",
            "options": [
                "Decoupling producer and consumer services, enabling temporal decoupling and request load buffering.",
                "Ensuring synchronous request-response latency below 1 millisecond.",
                "Eliminating the need for persistent database storage.",
                "Automatically translating JSON payloads into gRPC protocols."
            ],
            "correct_answer": "Decoupling producer and consumer services, enabling temporal decoupling and request load buffering.",
            "explanation": "Message queues isolate services, handling bursts in traffic without overloading downstream systems.",
            "difficulty": "hard",
            "skill_tested": "Microservices & Distributed Systems",
        },
        {
            "text": "Which mechanism in Python handles the cleanup of circular reference object graphs that reference counting cannot clear?",
            "options": [
                "Generational Garbage Collector",
                "Reference Counter Sweep",
                "Stack Pointer Allocator",
                "Process Heap Defragmenter"
            ],
            "correct_answer": "Generational Garbage Collector",
            "explanation": "Python's `gc` module uses generational reference graphs to detect and clean up circular references.",
            "difficulty": "hard",
            "skill_tested": "Python Internals",
        },
        {
            "text": "In TypeScript, what is the main distinction between the `unknown` type and the `any` type?",
            "options": [
                "unknown requires type checking or narrowing before performing operations, whereas any bypasses all type checks.",
                "any is strictly type-safe while unknown permits arbitrary property access.",
                "unknown can only store primitive types, while any stores objects.",
                "any is deprecated in TypeScript 5+, replaced by unknown."
            ],
            "correct_answer": "unknown requires type checking or narrowing before performing operations, whereas any bypasses all type checks.",
            "explanation": "unknown is the type-safe counterpart of any; you must narrow it via typeof or type guards before usage.",
            "difficulty": "easy",
            "skill_tested": "TypeScript",
        },
        {
            "text": "Which ACID property guarantees that database transactions survive system crashes and hardware failures once committed?",
            "options": [
                "Durability",
                "Atomicity",
                "Consistency",
                "Isolation"
            ],
            "correct_answer": "Durability",
            "explanation": "Durability guarantees that committed data is written to non-volatile storage (WAL/disk) and survives crashes.",
            "difficulty": "easy",
            "skill_tested": "Databases & ACID",
        },
        {
            "text": "What major feature introduced in HTTP/2 resolves head-of-line blocking at the application layer?",
            "options": [
                "Multiplexing streams over a single TCP connection",
                "Replacing TCP with UDP sockets",
                "Enforcing Mandatory TLS 1.3 encryption",
                "Compressing request bodies with Gzip"
            ],
            "correct_answer": "Multiplexing streams over a single TCP connection",
            "explanation": "HTTP/2 multiplexes multiple request/response streams concurrently over one TCP connection.",
            "difficulty": "medium",
            "skill_tested": "Networking Protocols",
        },
        {
            "text": "Which of the following sorting algorithms guarantees O(N log N) worst-case time complexity?",
            "options": [
                "Merge Sort",
                "Quick Sort",
                "Bubble Sort",
                "Insertion Sort"
            ],
            "correct_answer": "Merge Sort",
            "explanation": "Merge Sort consistently divides arrays into halves and merges in O(N log N) time regardless of initial order.",
            "difficulty": "easy",
            "skill_tested": "Algorithms",
        },
        {
            "text": "What primary problem with REST APIs does GraphQL solve by allowing clients to specify precise query fields?",
            "options": [
                "Over-fetching and under-fetching of data",
                "Lack of HTTP caching headers",
                "Inability to transfer binary file data",
                "High server-side CPU utilization"
            ],
            "correct_answer": "Over-fetching and under-fetching of data",
            "explanation": "GraphQL enables clients to request only the exact fields needed, preventing payload bloat.",
            "difficulty": "medium",
            "skill_tested": "GraphQL & API Architecture",
        },
        {
            "text": "Where should a JSON Web Token (JWT) signature be validated on the backend API server?",
            "options": [
                "Against the header and payload using the server's secret key or public key.",
                "By querying the database on every HTTP request.",
                "By verifying if the user agent string matches.",
                "By hashing the client's IP address."
            ],
            "correct_answer": "Against the header and payload using the server's secret key or public key.",
            "explanation": "JWT validation re-calculates the signature from header+payload using HMAC secret or RSA public key.",
            "difficulty": "easy",
            "skill_tested": "Authentication & Security",
        },
        {
            "text": "What is the primary scope of a Unit Test compared to an Integration Test?",
            "options": [
                "Unit tests isolate and verify individual functions or components, while integration tests verify interactions between modules.",
                "Unit tests execute end-to-end user browser interactions.",
                "Integration tests run faster and require no external mocks.",
                "Unit tests test production databases, while integration tests use local memory."
            ],
            "correct_answer": "Unit tests isolate and verify individual functions or components, while integration tests verify interactions between modules.",
            "explanation": "Unit testing checks small, isolated code units with dependencies mocked out.",
            "difficulty": "easy",
            "skill_tested": "Software Testing",
        },
        {
            "text": "Which algorithm is commonly used for rate limiting to allow bursts of traffic while enforcing a smooth average rate?",
            "options": [
                "Token Bucket / Leaky Bucket Algorithm",
                "Dijkstra's Algorithm",
                "Raft Consensus Algorithm",
                "Round Robin Load Balancing"
            ],
            "correct_answer": "Token Bucket / Leaky Bucket Algorithm",
            "explanation": "Token Bucket algorithms allow requests to consume tokens for bursts up to capacity while refilling at a constant rate.",
            "difficulty": "medium",
            "skill_tested": "System Design",
        },
        {
            "text": "In Linux file permissions, what access rights does `chmod 755 filename` grant to owner, group, and others?",
            "options": [
                "Owner: read/write/execute (7); Group & Others: read/execute (5).",
                "Owner: read only; Group & Others: full access.",
                "All users: read/write/execute.",
                "Owner: write only; Group: execute only; Others: no access."
            ],
            "correct_answer": "Owner: read/write/execute (7); Group & Others: read/execute (5).",
            "explanation": "7 = 4+2+1 (rwx), 5 = 4+0+1 (r-x).",
            "difficulty": "easy",
            "skill_tested": "Linux Administration",
        },
        {
            "text": "Why should CPU-bound heavy calculations not be run directly inside an `async def` route handler in FastAPI?",
            "options": [
                "It blocks the single-threaded asyncio event loop, stopping all incoming concurrent requests from processing.",
                "It triggers an immediate MemoryError exception.",
                "FastAPI forces async routes to run in a separate thread pool automatically.",
                "It revokes the JWT token authorization header."
            ],
            "correct_answer": "It blocks the single-threaded asyncio event loop, stopping all incoming concurrent requests from processing.",
            "explanation": "CPU-bound work in async def blocks the main event loop thread. Use BackgroundTasks or regular `def` (which runs in threadpool).",
            "difficulty": "medium",
            "skill_tested": "FastAPI & Async IO",
        },
        {
            "text": "Which Design Pattern provides a unified, simplified high-level interface to a complex subsystem or set of classes?",
            "options": [
                "Facade Pattern",
                "Singleton Pattern",
                "Observer Pattern",
                "Strategy Pattern"
            ],
            "correct_answer": "Facade Pattern",
            "explanation": "The Facade pattern wraps a complex framework or subsystem with a clean, simple API.",
            "difficulty": "medium",
            "skill_tested": "Design Patterns",
        },
        {
            "text": "What is the fundamental goal of Continuous Integration (CI) in software engineering pipelines?",
            "options": [
                "Automating code integration, build compilation, and automated test execution on every commit.",
                "Deploying application builds to production environments without code reviews.",
                "Generating user documentation from inline comments.",
                "Provisioning cloud Kubernetes clusters on demand."
            ],
            "correct_answer": "Automating code integration, build compilation, and automated test execution on every commit.",
            "explanation": "CI ensures code additions pass automated build and test suites continuously.",
            "difficulty": "easy",
            "skill_tested": "DevOps & CI/CD",
        },
    ]

    questions = []
    for i in range(needed):
        item = fallback_bank[i % len(fallback_bank)]
        q_idx = start_idx + i
        questions.append({
            "id": f"q_mcq_{q_idx}",
            "type": "mcq",
            "text": item["text"],
            "options": item["options"],
            "correct_answer": item["correct_answer"],
            "explanation": item["explanation"],
            "difficulty": item["difficulty"],
            "skill_tested": item["skill_tested"],
            "time_limit_seconds": 90,
        })

    return questions


def _generate_fallback_coding(job_target: JobTarget, start_idx: int = 1, needed: int = 3) -> list[dict]:
    """Generate structured fallback coding questions with explicit input/output specifications and test cases."""
    role = job_target.role_title or "Software Engineer"
    skills = job_target.required_skills or ["Python", "Algorithms"]

    templates = [
        {
            "title": "Problem 1: Two Sum Target Pair",
            "text": (
                "Given an array of integers `nums` and an integer `target`, return indices of the two numbers such that they add up to `target`.\n\n"
                "You may assume that each input would have exactly one solution, and you may not use the same element twice. You can return the answer in any order.\n\n"
                "Input Format:\n"
                "• Line 1: A JSON array of integers `nums` (e.g. `[2, 7, 11, 15]`).\n"
                "• Line 2: An integer `target` (e.g. `9`).\n\n"
                "Output Format:\n"
                "• Return a list of two integer indices `[idx1, idx2]`."
            ),
            "difficulty": "easy",
            "topic": "Arrays & Hashing",
            "starter_code": (
                "def two_sum(nums: list[int], target: int) -> list[int]:\n"
                "    \"\"\"\n"
                "    Find indices of the two numbers that sum up to target.\n"
                "    \"\"\"\n"
                "    # Write your solution here\n"
                "    pass\n"
            ),
            "examples": [
                "Input: nums = [2, 7, 11, 15], target = 9\nOutput: [0, 1]\nExplanation: Because nums[0] + nums[1] == 9, we return [0, 1].",
                "Input: nums = [3, 2, 4], target = 6\nOutput: [1, 2]\nExplanation: Because nums[1] + nums[2] == 6, we return [1, 2]."
            ],
            "constraints": [
                "2 <= nums.length <= 10^4",
                "-10^9 <= nums[i] <= 10^9",
                "Only one valid answer exists."
            ],
            "test_cases": [
                {
                    "description": "Standard positive integers",
                    "input": "[2, 7, 11, 15]\n9",
                    "expected_output": "[0, 1]",
                    "is_hidden": False
                },
                {
                    "description": "Non-consecutive target match",
                    "input": "[3, 2, 4]\n6",
                    "expected_output": "[1, 2]",
                    "is_hidden": False
                },
                {
                    "description": "Duplicate elements match",
                    "input": "[3, 3]\n6",
                    "expected_output": "[0, 1]",
                    "is_hidden": True
                }
            ]
        },
        {
            "title": "Problem 2: TTL Key-Value Cache",
            "text": (
                "Implement a caching function `run_cache(commands: list)` that executes a sequence of Key-Value Store operations.\n\n"
                "Commands format:\n"
                "• `[\"set\", key, value]`: Stores key-value in cache. Returns `\"OK\"`.\n"
                "• `[\"get\", key]`: Retrieves value for key. Returns value if found, or `\"None\"` if missing/expired.\n\n"
                "Input Format:\n"
                "• A JSON list of command tuples e.g. `[[\"set\", \"x\", 42], [\"get\", \"x\"]]`.\n\n"
                "Output Format:\n"
                "• A JSON list containing the result of each operation e.g. `[\"OK\", 42]`."
            ),
            "difficulty": "medium",
            "topic": "Caching & Data Structures",
            "starter_code": (
                "class TTLCache:\n"
                "    def __init__(self, ttl_seconds: int = 60):\n"
                "        self.store = {}\n"
                "        self.ttl = ttl_seconds\n\n"
                "    def set(self, key: str, value):\n"
                "        self.store[key] = value\n\n"
                "    def get(self, key: str):\n"
                "        return self.store.get(key, None)\n\n\n"
                "def run_cache(commands: list) -> list:\n"
                "    \"\"\"\n"
                "    Execute a sequence of cache operations and return results.\n"
                "    \"\"\"\n"
                "    cache = TTLCache(ttl_seconds=60)\n"
                "    results = []\n"
                "    for cmd in commands:\n"
                "        op = cmd[0]\n"
                "        if op == \"set\":\n"
                "            cache.set(cmd[1], cmd[2])\n"
                "            results.append(\"OK\")\n"
                "        elif op == \"get\":\n"
                "            res = cache.get(cmd[1])\n"
                "            results.append(res if res is not None else \"None\")\n"
                "    return results\n"
            ),
            "examples": [
                "Input: [[\"set\", \"x\", 42], [\"get\", \"x\"], [\"get\", \"y\"]]\nOutput: [\"OK\", 42, \"None\"]\nExplanation: Key 'x' is retrieved as 42, while non-existent key 'y' returns 'None'."
            ],
            "constraints": [
                "Time complexity: O(1) average per set/get operation",
                "Space complexity: O(N) where N is number of unique keys"
            ],
            "test_cases": [
                {
                    "description": "Set and immediate get retrieval",
                    "input": "[[\"set\", \"x\", 42], [\"get\", \"x\"], [\"get\", \"missing\"]]",
                    "expected_output": "[\"OK\", 42, \"None\"]",
                    "is_hidden": False
                },
                {
                    "description": "Overwriting existing key value",
                    "input": "[[\"set\", \"a\", 100], [\"set\", \"a\", 200], [\"get\", \"a\"]]",
                    "expected_output": "[\"OK\", \"OK\", 200]",
                    "is_hidden": False
                },
                {
                    "description": "Nested dictionary value payload",
                    "input": "[[\"set\", \"user\", {\"id\": 1}], [\"get\", \"user\"]]",
                    "expected_output": "[\"OK\", {\"id\": 1}]",
                    "is_hidden": True
                }
            ]
        },
        {
            "title": "Problem 3: Sliding Window Rate Limiter",
            "text": (
                "Implement a rate limiting function `check_rate_limit(user_requests: list, max_requests: int)` that enforces request limits per user.\n\n"
                "Input Format:\n"
                "• Line 1: JSON list of user IDs e.g. `[\"u1\", \"u1\", \"u1\", \"u1\"]`.\n"
                "• Line 2: Integer `max_requests` e.g. `3`.\n\n"
                "Output Format:\n"
                "• JSON list of booleans indicating if each request was allowed e.g. `[True, True, True, False]`."
            ),
            "difficulty": "hard",
            "topic": "System Design",
            "starter_code": (
                "class RateLimiter:\n"
                "    def __init__(self, max_requests: int = 3):\n"
                "        self.max_requests = max_requests\n"
                "        self.history = {}\n\n"
                "    def is_allowed(self, user_id: str) -> bool:\n"
                "        count = self.history.get(user_id, 0)\n"
                "        if count < self.max_requests:\n"
                "            self.history[user_id] = count + 1\n"
                "            return True\n"
                "        return False\n\n\n"
                "def check_rate_limit(user_requests: list, max_requests: int) -> list[bool]:\n"
                "    \"\"\"\n"
                "    Simulate user requests and return whether each request was allowed.\n"
                "    \"\"\"\n"
                "    limiter = RateLimiter(max_requests=max_requests)\n"
                "    return [limiter.is_allowed(u) for u in user_requests]\n"
            ),
            "examples": [
                "Input: user_requests = [\"u1\", \"u1\", \"u1\", \"u1\"], max_requests = 3\nOutput: [True, True, True, False]\nExplanation: First 3 requests succeed; 4th request exceeds limit of 3."
            ],
            "constraints": [
                "1 <= user_requests.length <= 10^5",
                "0 <= max_requests <= 10^4"
            ],
            "test_cases": [
                {
                    "description": "Exceeding single user threshold",
                    "input": "[\"u1\", \"u1\", \"u1\", \"u1\"]\n3",
                    "expected_output": "[True, True, True, False]",
                    "is_hidden": False
                },
                {
                    "description": "Multiple independent users",
                    "input": "[\"u1\", \"u2\", \"u1\", \"u2\"]\n2",
                    "expected_output": "[True, True, True, True]",
                    "is_hidden": False
                },
                {
                    "description": "Zero allowed requests threshold",
                    "input": "[\"u1\", \"u2\"]\n0",
                    "expected_output": "[False, False]",
                    "is_hidden": True
                }
            ]
        }
    ]

    questions = []
    for i in range(needed):
        t = templates[i % len(templates)]
        questions.append({
            "id": f"q_code_{start_idx + i}",
            "type": "coding",
            "title": t["title"],
            "text": t["text"],
            "constraints": t["constraints"],
            "examples": t["examples"],
            "expected_approach": "Clean implementation with proper error handling and edge case coverage.",
            "starter_code": t["starter_code"],
            "test_cases": t["test_cases"],
            "language": "python",
            "difficulty": t["difficulty"],
            "skill_tested": t["topic"],
            "time_limit_seconds": 900,
        })

    return questions
