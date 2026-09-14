async function testMonthlyPlan() {
  console.log('Testing GET /api/monthly-plan?year=2026&month=9 ...');
  try {
    const res = await fetch('http://127.0.0.1:5000/api/monthly-plan?year=2026&month=9');
    const data = await res.json();
    console.log('Response Status:', res.status);
    console.log('Success:', data.success);
    console.log('Year/Month:', data.year, data.month, data.month_name);
    console.log('Total Days:', data.total_days);
    console.log('Start Weekday Offset:', data.start_weekday);
    console.log('Summary:', data.summary);
    
    // Inspect Day 2 (MARG-BLK-001) and Day 10
    console.log('\nDay 2 details:');
    console.log(JSON.stringify(data.days[2], null, 2));

    console.log('\nDay 10 details:');
    console.log(JSON.stringify(data.days[10], null, 2));
  } catch (err) {
    console.error('Error testing monthly plan API:', err.message);
  }
}

testMonthlyPlan();
