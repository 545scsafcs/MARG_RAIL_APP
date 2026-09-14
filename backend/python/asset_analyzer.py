def analyze_assets(assets):
    """
    Asset Availability Engine logic in Python:
    Calculates asset health score, availability score, risk score, and maintenance urgency.
    """
    total = len(assets)
    if total == 0:
        return {
            "total_assets": 0,
            "critical_assets": 0,
            "average_health": 0.0,
            "overall_availability": 100.0,
            "assets": []
        }

    critical_count = 0
    health_sum = 0
    analyzed_assets = []

    for asset in assets:
        health = float(asset.get("health_score", 100))
        criticality = asset.get("criticality", "MEDIUM")
        status = asset.get("status", "OPERATIONAL")
        open_defects = int(asset.get("open_defects", 0))

        # Risk score calculation (0-100)
        crit_weight = 30 if criticality == "CRITICAL" else 20 if criticality == "HIGH" else 10
        defect_weight = min(40, open_defects * 15)
        health_penalty = max(0, (100 - health) * 0.5)
        risk_score = round(min(100, crit_weight + defect_weight + health_penalty))

        # Urgency classification
        if risk_score >= 75 or health < 60:
            urgency = "IMMEDIATE"
            critical_count += 1
        elif risk_score >= 50 or health < 80:
            urgency = "HIGH"
        elif risk_score >= 25:
            urgency = "MODERATE"
        else:
            urgency = "LOW"

        availability_score = round(max(0, health - (risk_score * 0.3)), 1)
        health_sum += health

        analyzed_assets.append({
            **asset,
            "health_score": health,
            "availability_score": availability_score,
            "risk_score": risk_score,
            "maintenance_urgency": urgency
        })

    avg_health = round(health_sum / total, 1)
    overall_avail = round(sum(a["availability_score"] for a in analyzed_assets) / total, 1)

    return {
        "total_assets": total,
        "critical_assets": critical_count,
        "average_health": avg_health,
        "overall_availability": overall_avail,
        "assets": analyzed_assets
    }
