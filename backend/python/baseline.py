from models import to_minutes

def overlaps(s1, e1, s2, e2):
    return max(s1, s2) < min(e1, e2)

def build_baseline(tasks, trains):
    blocks = []
    for idx, task in enumerate(tasks, 1):
        start = task.get("earliest_start_minute", 360)
        duration = int(task.get("duration_minutes", 60))
        end = start + duration
        blocks.append({
            "block_id": f"BASE-{idx:03d}",
            "section_id": task["section_id"],
            "start_minute": start,
            "end_minute": end,
            "task_ids": [task["task_id"]],
            "departments": [task["department"]],
            "block_type": "MAINTENANCE"
        })
    return blocks

def baseline_metrics(blocks, tasks):
    total_duration = sum(b["end_minute"] - b["start_minute"] for b in blocks)
    return {
        "block_hours": round(total_duration / 60, 1),
        "blocks": len(blocks),
        "joint_blocks": 0
    }
