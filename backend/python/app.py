from flask import Flask, request, jsonify
import os
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
    try:
        payload = request.get_json() or {}
        result = solve(payload)
        return jsonify(result)
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 400

@app.route('/priority', methods=['POST'])
def calculate_priority():
    try:
        payload = request.get_json() or {}
        tasks = payload.get("tasks", [])
        prioritized = prioritize(tasks)
        return jsonify({"success": True, "tasks": prioritized})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 400

@app.route('/validate', methods=['POST'])
def validate_blocks():
    try:
        payload = request.get_json() or {}
        blocks = payload.get("blocks", [])
        tasks = payload.get("tasks", [])
        trains = payload.get("trains", [])
        crews = payload.get("crews", [])
        validation_result = validate(blocks, tasks, trains, crews)
        return jsonify(validation_result)
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 400

@app.route('/asset-analysis', methods=['POST'])
def analyze_asset_data():
    try:
        payload = request.get_json() or {}
        assets = payload.get("assets", [])
        result = analyze_assets(assets)
        return jsonify(result)
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 400

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5001))
    app.run(host='0.0.0.0', port=port, debug=False)


