from flask import Flask, request, jsonify
from optimizer import solve
from priority import prioritize
from validator import validate
from asset_analyzer import analyze_assets

app = Flask(__name__)

@app.route('/health', methods=['GET'])
def health():
    return jsonify({"status": "ok", "service": "MARG Python Optimization Service"})

@app.route('/optimize', methods=['POST'])
def run_optimization():
    payload = request.get_json() or {}
    result = solve(payload)
    return jsonify(result)

@app.route('/priority', methods=['POST'])
def calculate_priority():
    payload = request.get_json() or {}
    tasks = payload.get("tasks", [])
    prioritized = prioritize(tasks)
    return jsonify({"success": True, "tasks": prioritized})

@app.route('/validate', methods=['POST'])
def validate_blocks():
    payload = request.get_json() or {}
    blocks = payload.get("blocks", [])
    tasks = payload.get("tasks", [])
    trains = payload.get("trains", [])
    crews = payload.get("crews", [])
    validation_result = validate(blocks, tasks, trains, crews)
    return jsonify(validation_result)

@app.route('/asset-analysis', methods=['POST'])
def analyze_asset_data():
    payload = request.get_json() or {}
    assets = payload.get("assets", [])
    result = analyze_assets(assets)
    return jsonify(result)

if __name__ == '__main__':
    import os
    port = int(os.environ.get('PORT', 5001))
    app.run(host='0.0.0.0', port=port, debug=False)

