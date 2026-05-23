import json

from .command_utils import (
    add_execution_error,
    combine_output,
    dedupe_preserve_order,
    resolve_executable,
    run_command,
    temporary_file,
    write_lines,
)


NUCLEI_CANDIDATES = (
    r"C:\Users\samyu\Downloads\nuclei_3.8.0_windows_amd64\nuclei.exe",
    r"C:\Users\samyu\go\bin\nuclei.exe",
    r"C:\tools\nuclei\nuclei.exe",
)


def run_nuclei(targets):
    normalized_targets = normalize_targets(targets)

    if not normalized_targets:
        return {
            "raw_output": "",
            "parsed_output": {
                "total_vulnerabilities": 0,
                "vulnerabilities": [],
                "error": "No scan targets were provided to nuclei",
            },
        }

    executable = resolve_executable(
        "nuclei",
        env_var="NUCLEI_PATH",
        candidates=NUCLEI_CANDIDATES,
    )

    if not executable:
        return {
            "raw_output": "",
            "parsed_output": {
                "total_vulnerabilities": 0,
                "vulnerabilities": [],
                "error": "nuclei executable was not found on this system",
            },
        }

    command = [
        executable,
        "-j",
        "-severity",
        "info,low,medium,high,critical",
        "-timeout",
        "10",
        "-retries",
        "1",
    ]

    if len(normalized_targets) == 1:
        command.extend(["-u", normalized_targets[0]])
        execution = run_command(command, timeout=600)
    else:
        with temporary_file(suffix=".txt") as input_file:
            write_lines(input_file, normalized_targets)
            execution = run_command(
                command + ["-l", str(input_file)],
                timeout=600,
            )

    raw_output = combine_output(execution["stdout"], execution["stderr"])
    vulnerabilities = parse_nuclei(execution["stdout"])
    parsed_output = {
        "total_vulnerabilities": len(vulnerabilities),
        "vulnerabilities": vulnerabilities,
        "targets_scanned": normalized_targets,
    }

    return {
        "raw_output": raw_output,
        "parsed_output": add_execution_error(parsed_output, execution),
    }


def normalize_targets(targets):
    if isinstance(targets, str):
        values = [targets.strip()]
    else:
        values = [item.strip() for item in targets or [] if item]

    return dedupe_preserve_order(values)


def parse_nuclei(output):
    vulnerabilities = []

    for line in output.splitlines():
        payload = line.strip()

        if not payload:
            continue

        try:
            data = json.loads(payload)
        except json.JSONDecodeError:
            continue

        vulnerabilities.append(
            {
                "template_id": data.get("template-id"),
                "name": data.get("info", {}).get("name"),
                "severity": data.get("info", {}).get("severity"),
                "type": data.get("type"),
                "protocol": data.get("protocol"),
                "target": data.get("matched-at") or data.get("url"),
                "host": data.get("host"),
                "timestamp": data.get("timestamp"),
            }
        )

    return vulnerabilities
