import { initDatabase, dbGet, dbAll, dbRun } from '../database/db.js';
import { calculateBlockTrainImpacts } from '../services/trainImpactService.js';
import { processGroqChat } from '../services/groqService.js';

async function testAll() {
  console.log('--- 1. Initializing DB ---');
  await initDatabase();

  console.log('--- 2. Checking Seed Users ---');
  const users = await dbAll(`SELECT username, role, name FROM users`);
  console.log('Users in DB:', users);

  console.log('--- 3. Testing Contractor Task Submission ---');
  const task = await dbGet(`SELECT * FROM maintenance_tasks LIMIT 1`);
  console.log('Initial task:', task.task_id, task.status, task.work_progress);

  await dbRun(
    `UPDATE maintenance_tasks 
     SET status = 'SUBMITTED_FOR_APPROVAL', work_progress = 100, execution_summary = 'Replaced track fastener at KM 18.5', contractor_id = 'maint'
     WHERE task_id = ?`,
    [task.task_id]
  );
  const updatedTask = await dbGet(`SELECT * FROM maintenance_tasks WHERE task_id = ?`, [task.task_id]);
  console.log('Updated task for approval:', updatedTask.task_id, updatedTask.status, updatedTask.execution_summary);

  console.log('--- 4. Testing Control Officer Approval ---');
  await dbRun(`UPDATE maintenance_tasks SET status = 'COMPLETED', remarks = 'Approved by Control Officer' WHERE task_id = ?`, [task.task_id]);
  await dbRun(`INSERT INTO audit_logs (username, role, action, entity_type, entity_id, timestamp, details) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ['officer', 'CONTROL_OFFICER', 'APPROVAL_APPROVED', 'TASK', task.task_id, new Date().toISOString(), 'Approved task completion']
  );
  const auditLogs = await dbAll(`SELECT * FROM audit_logs ORDER BY id DESC LIMIT 3`);
  console.log('Latest audit logs:', auditLogs);

  console.log('--- 5. Testing Deterministic Train Impact Engine ---');
  const mockBlock = { block_id: 'MARG-TEST-001', section_id: 'SEC-A01', start_minute: 360, end_minute: 510, start_time: '06:00', end_time: '08:30' };
  const trains = await dbAll(`SELECT * FROM trains LIMIT 10`);
  const impacts = await calculateBlockTrainImpacts(mockBlock, trains);
  console.log(`Calculated ${impacts.length} train impacts for SEC-A01 block:`);
  impacts.forEach(imp => console.log(`  - Train ${imp.train_number} (${imp.train_name}): ${imp.action} | Delay: ${imp.expected_delay_mins}m | Reason: ${imp.reason}`));

  console.log('\n✅ ALL BACKEND ENGINE TESTS COMPLETED SUCCESSFULLY!');
  process.exit(0);
}

testAll().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
