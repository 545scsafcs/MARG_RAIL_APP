def normalize_train_fields(row):
    """
    Data normalization mapping helper for inconsistent column names across data.gov.in / CSV / JSON inputs.
    """
    field_mappings = {
        "train_number": ["Train No", "train_no", "train_number", "Train Number", "TRAIN_NO", "TR_NO"],
        "train_name": ["Train Name", "train_name", "TrainName", "TRAIN_NAME"],
        "train_type": ["Train Type", "train_type", "Type", "TRAIN_TYPE"],
        "source_station": ["Source", "source_station", "From Station", "SRC", "SourceStation"],
        "destination_station": ["Destination", "destination_station", "To Station", "DST", "DestStation"],
        "departure_time": ["Departure", "departure_time", "Dept Time", "DEP_TIME"],
        "arrival_time": ["Arrival", "arrival_time", "Arr Time", "ARR_TIME"],
        "run_days": ["Run Days", "run_days", "Days", "RUN_DAYS"]
    }

    normalized = {}
    for target_key, candidate_keys in field_mappings.items():
        val = None
        for key in candidate_keys:
            if key in row and row[key] is not None:
                val = str(row[key]).strip()
                break
        normalized[target_key] = val or ""

    return normalized

def process_dataset(records):
    normalized_records = []
    seen_train_numbers = set()
    
    for record in records:
        norm = normalize_train_fields(record)
        train_num = norm.get("train_number")
        if train_num and train_num not in seen_train_numbers:
            seen_train_numbers.add(train_num)
            normalized_records.append(norm)
            
    return {
        "total_input": len(records),
        "total_imported": len(normalized_records),
        "deduplicated": len(records) - len(normalized_records),
        "records": normalized_records
    }
