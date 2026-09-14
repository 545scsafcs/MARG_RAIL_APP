def score_task(task):
    severity = min(100, int(task.get("severity", 1)) * 20)
    safety = min(100, int(task.get("safety_risk", task.get("severity", 1) * 20)))
    urgency = min(100, int(task.get("urgency", 50)))
    overdue = min(100, int(task.get("overdue_days", 0)) * 10)
    criticality = min(100, int(task.get("asset_criticality", 60)))
    score = round(0.30 * severity + 0.25 * safety + 0.20 * urgency + 0.15 * overdue + 0.10 * criticality)
    level = "CRITICAL" if score >= 80 else "HIGH" if score >= 60 else "MEDIUM" if score >= 40 else "LOW"
    reasons = []
    if severity >= 80: reasons.append("High severity safety risk")
    if safety >= 80: reasons.append("Safety-critical asset")
    if task.get("overdue_days", 0) > 0: reasons.append(f"{task['overdue_days']} days overdue")
    if criticality >= 80: reasons.append("Critical infrastructure asset")
    if not reasons: reasons.append("Routine maintenance with monitored risk")
    return {"priority_score": score, "priority": level, "priority_reason": reasons}

def prioritize(tasks):
    return [{**task, **score_task(task)} for task in tasks]
