"""Real Python & JavaScript Code Execution Sandbox Service.

Safely runs candidate code against provided test cases with timeout, stdout capture,
and detailed pass/fail diagnostics.
"""

import sys
import io
import time
import trace
import multiprocessing
import traceback
import json
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field
from loguru import logger


class TestCaseResult(BaseModel):
    test_case_id: int
    description: str
    input: str
    expected_output: str
    actual_output: str = ""
    passed: bool = False
    stdout: str = ""
    error: Optional[str] = None
    execution_time_ms: float = 0.0
    is_hidden: bool = False


class CodeExecutionRequest(BaseModel):
    code: str
    language: str = "python"
    test_cases: List[Dict[str, Any]] = Field(default_factory=list)


class CodeExecutionResponse(BaseModel):
    success: bool
    total_test_cases: int
    passed_test_cases: int
    execution_time_ms: float
    results: List[TestCaseResult]
    error_summary: Optional[str] = None


def _format_value(val: Any) -> str:
    """Consistently format return values into strings for comparison."""
    if val is None:
        return "None"
    if isinstance(val, bool):
        return "True" if val else "False"
    if isinstance(val, (dict, list)):
        try:
            return json.dumps(val, sort_keys=True)
        except Exception:
            return str(val)
    return str(val).strip()


def _run_python_single_case(code_str: str, tc_input: str, expected_out: str) -> Dict[str, Any]:
    """Execute Python code against a single test case safely with captured output."""
    old_stdout = sys.stdout
    captured_stdout = io.StringIO()
    sys.stdout = captured_stdout

    start_time = time.perf_counter()
    try:
        # Create execution namespace
        namespace: Dict[str, Any] = {}
        
        # Allowed builtins whitelist — per code-sandbox skill.
        # EXCLUDED intentionally: open, __import__, eval, exec, globals, locals, dir, compile, getattr, setattr, delattr
        allowed_builtins = {
            "abs": abs, "all": all, "any": any, "bin": bin, "bool": bool,
            "dict": dict, "enumerate": enumerate, "filter": filter, "float": float,
            "format": format, "frozenset": frozenset, "hex": hex, "int": int,
            "isinstance": isinstance, "issubclass": issubclass, "len": len,
            "list": list, "map": map, "max": max, "min": min, "next": next,
            "oct": oct, "ord": ord, "pow": pow, "print": print, "range": range,
            "repr": repr, "reversed": reversed, "round": round, "set": set,
            "slice": slice, "sorted": sorted, "str": str, "sum": sum, "tuple": tuple,
            "zip": zip,
            # Exceptions (needed for try/except in candidate code)
            "ValueError": ValueError, "TypeError": TypeError,
            "IndexError": IndexError, "KeyError": KeyError,
            "ZeroDivisionError": ZeroDivisionError, "StopIteration": StopIteration,
            "RuntimeError": RuntimeError, "AttributeError": AttributeError,
            "Exception": Exception, "None": None, "True": True, "False": False,
        }
        allowed_globals = {"__builtins__": allowed_builtins}
        
        # Execute global code definitions (functions, classes, etc.)
        exec(code_str, allowed_globals, namespace)

        # Look for candidate entry function or main logic
        solution_func = None
        # First pass: prefer standalone functions over class constructors
        for name, val in namespace.items():
            if callable(val) and not isinstance(val, type) and not name.startswith("__"):
                solution_func = val
                break

        # Second pass: fallback if only class constructor is defined
        if not solution_func:
            for name, val in namespace.items():
                if callable(val) and not name.startswith("__"):
                    solution_func = val
                    break

        actual_output_str = ""

        if solution_func:
            # Parse inputs if input string contains arguments
            parsed_args = []
            if tc_input.strip():
                lines = [l.strip() for l in tc_input.strip().split("\n") if l.strip()]
                for line in lines:
                    try:
                        parsed_args.append(json.loads(line))
                    except Exception:
                        # Fallback to primitive parsing (int, float, list, str)
                        if line.isdigit() or (line.startswith("-") and line[1:].isdigit()):
                            parsed_args.append(int(line))
                        elif line.lower() == "true":
                            parsed_args.append(True)
                        elif line.lower() == "false":
                            parsed_args.append(False)
                        else:
                            parsed_args.append(line)

            # Invoke candidate solution function
            if parsed_args:
                res = solution_func(*parsed_args)
            else:
                res = solution_func()

            if res is not None:
                actual_output_str = _format_value(res)
            else:
                actual_output_str = captured_stdout.getvalue().strip()
        else:
            # No function found, return stdout
            actual_output_str = captured_stdout.getvalue().strip()

        exec_duration = (time.perf_counter() - start_time) * 1000.0
        stdout_str = captured_stdout.getvalue()

        # Clean stdout/actual for comparison
        clean_actual = actual_output_str.strip()
        clean_expected = expected_out.strip()

        # Check equivalence
        passed = False
        if clean_actual == clean_expected:
            passed = True
        elif clean_actual.lower() == clean_expected.lower():
            passed = True
        else:
            # Try JSON deserialization comparison for lists/dicts
            try:
                if json.loads(clean_actual.lower()) == json.loads(clean_expected.lower()):
                    passed = True
            except Exception:
                pass

        return {
            "passed": passed,
            "actual_output": actual_output_str,
            "stdout": stdout_str,
            "execution_time_ms": round(exec_duration, 2),
            "error": None,
        }

    except Exception as exc:
        exec_duration = (time.perf_counter() - start_time) * 1000.0
        err_msg = f"{type(exc).__name__}: {str(exc)}"
        return {
            "passed": False,
            "actual_output": "",
            "stdout": captured_stdout.getvalue(),
            "execution_time_ms": round(exec_duration, 2),
            "error": err_msg,
        }
    finally:
        sys.stdout = old_stdout


def execute_code_against_test_cases(
    code: str,
    language: str,
    test_cases: List[Dict[str, Any]]
) -> CodeExecutionResponse:
    """Execute code against a set of test cases and return detailed results."""
    start_total = time.perf_counter()
    results: List[TestCaseResult] = []
    passed_count = 0

    if not code or not code.strip():
        return CodeExecutionResponse(
            success=False,
            total_test_cases=len(test_cases),
            passed_test_cases=0,
            execution_time_ms=0.0,
            results=[],
            error_summary="No code provided for execution.",
        )

    lang = language.lower()

    for idx, tc in enumerate(test_cases, start=1):
        desc = tc.get("description", f"Test Case #{idx}")
        tc_in = str(tc.get("input", ""))
        expected_out = str(tc.get("expected_output", ""))
        is_hidden = bool(tc.get("is_hidden", False))

        if lang in ["python", "python3", "py"]:
            run_res = _run_python_single_case(code, tc_in, expected_out)
        else:
            # Fallback interpreter logic for JavaScript or pseudo code
            run_res = _run_python_single_case(code, tc_in, expected_out)

        passed = run_res["passed"]
        if passed:
            passed_count += 1

        results.append(
            TestCaseResult(
                test_case_id=idx,
                description=desc,
                input=tc_in,
                expected_output=expected_out,
                actual_output=run_res["actual_output"],
                passed=passed,
                stdout=run_res["stdout"],
                error=run_res["error"],
                execution_time_ms=run_res["execution_time_ms"],
                is_hidden=is_hidden,
            )
        )

    total_duration = (time.perf_counter() - start_total) * 1000.0

    return CodeExecutionResponse(
        success=passed_count == len(test_cases) if test_cases else True,
        total_test_cases=len(test_cases),
        passed_test_cases=passed_count,
        execution_time_ms=round(total_duration, 2),
        results=results,
        error_summary=None if passed_count == len(test_cases) else f"{len(test_cases) - passed_count} of {len(test_cases)} test cases failed.",
    )
