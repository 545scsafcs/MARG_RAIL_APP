def to_minutes(time_str):
    if not time_str or ':' not in str(time_str):
        return 0
    try:
        parts = str(time_str).split(':')
        return int(parts[0]) * 60 + int(parts[1])
    except Exception:
        return 0

def format_minutes(minutes):
    hrs = (minutes // 60) % 24
    mins = minutes % 60
    return f"{hrs:02d}:{mins:02d}"
