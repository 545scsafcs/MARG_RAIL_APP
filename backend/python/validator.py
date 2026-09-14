from models import to_minutes
from baseline import overlaps

def validate(blocks, tasks, trains, crews):
    errors, warnings = [], []
    task_map = {t["task_id"]: t for t in tasks}
    for block in blocks:
        if block["end_minute"] - block["start_minute"] > 240:
            errors.append({"type": "MAX_BLOCK_DURATION", "block": block["block_id"], "message": "Block exceeds four-hour prototype limit"})
        for train in trains:
            if train.get("section_id") == block.get("section_id") and overlaps(block["start_minute"], block["end_minute"], to_minutes(train.get("arrival")), to_minutes(train.get("departure"))):
                errors.append({"type": "TRAIN_CONFLICT", "block": block["block_id"], "train": train.get("train_number"), "message": f"Train occupies {block.get('section_id')} during the proposed block"})
        for task_id in block.get("task_ids", []):
            if task_id in task_map:
                task = task_map[task_id]
                if block["end_minute"] > task.get("due_minute", 1440):
                    errors.append({"type": "DEADLINE", "block": block["block_id"], "task": task_id, "message": "Task finishes after its due window"})
    return {"valid": not errors, "status": "VALID" if not errors else "INVALID", "errors": errors, "warnings": warnings, "suggestions": ["Move the block to the next train-free window"] if errors else []}
